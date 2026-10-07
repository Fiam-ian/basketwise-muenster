import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, stat, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { EDEKA_PILOT_SOURCE as source, inspectEdekaBranchPage, inspectEdekaProspectPage } from '../src/retailer-source.mjs';
import { captureRetailerSource, validateCaptureOutput } from '../scripts/capture-retailer-source.mjs';

const branch = '<section id="angebote-der-woche"><p>Gültig vom <strong>05.10.2026</strong> bis zum <strong>10.10.2026</strong>.</p><p>Marktadresse: EDEKA Rotthowe, Aegidiimarkt 7, 48143 Münster</p><a href="/maerkte/074601/prospekte/#prospekt-test">Prospekt</a></section>';
const prospect = `<iframe src="${source.viewerUrl}"></iframe>`;
const newOutput = () => fileURLToPath(new URL('../local-data/test-retailer-' + randomUUID(), import.meta.url));
await mkdir(fileURLToPath(new URL('../local-data/', import.meta.url)), { recursive: true });
function mockFetch(calls, transform = value => value) {
  return async url => {
    calls.push(url);
    const response = url === source.branchUrl ? new Response(branch, { headers: { 'content-type': 'text/html' } })
      : url === source.prospectUrl ? new Response(prospect, { headers: { 'content-type': 'text/html' } })
      : url === source.viewerUrl ? new Response('<html>Viewer</html>', { headers: { 'content-type': 'text/html' } })
      : url === source.pdfUrl ? new Response('%PDF-1.7\nSYNTHETIC_TEST', { headers: { 'content-type': 'application/pdf' } })
      : assert.fail('Unexpected network target');
    return transform(response, url);
  };
}

test('branch dates are captured without granting item validity, stock or price eligibility', () => {
  const result = inspectEdekaBranchPage(branch);
  assert.deepEqual(result.pageAdvertisedWindow, { validFrom: '2026-10-05', validTo: '2026-10-10' });
  assert.equal(result.itemValidityReviewed, false); assert.equal(result.rankingEnabled, false);
  assert.equal(result.inventoryComplete, false);
});

test('branch changes, impossible dates, reversed periods and duplicate sections fail closed', () => {
  for (const html of [branch.replace('Aegidiimarkt 7', 'Hamannplatz 2'),
    branch.replace('05.10.2026', '31.02.2026'), branch.replace('05.10.2026', '11.10.2026'), branch + branch,
    branch.replace('/maerkte/074601/prospekte/', '/maerkte/074602/prospekte/'),
    branch.replace('</section>', '<p>Gültig vom 12.10.2026 bis zum 17.10.2026</p></section>')])
    assert.throws(() => inspectEdekaBranchPage(html));
});

test('prospect viewer must be the explicitly allowlisted linked resource', () => {
  assert.equal(inspectEdekaProspectPage(prospect).leafletValidityReviewed, false);
  assert.throws(() => inspectEdekaProspectPage(prospect.replace('blaetterkatalog.edeka.de', 'example.invalid')));
  assert.throws(() => inspectEdekaProspectPage('x'.repeat(2 * 1024 * 1024 + 1)));
});

test('capture retains exact source hashes in private files and refuses existing output before requests', async () => {
  const output = newOutput(), calls = [];
  try {
    assert.equal((await captureRetailerSource(output, { fetchImpl: mockFetch(calls) })).capturedSources, 4);
    assert.deepEqual(calls, [source.branchUrl, source.prospectUrl, source.viewerUrl, source.pdfUrl]);
    const manifest = JSON.parse(await readFile(output + '/manifest.json', 'utf8'));
    assert.equal(manifest.priceCandidateCount, 0); assert.equal(manifest.captureOnly, true);
    assert.ok(manifest.sources.every(s => /^[a-f0-9]{64}$/.test(s.sha256)));
    assert.equal((await stat(output + '/leaflet.pdf')).mode & 0o777, 0o600);
    const original = await readFile(output + '/manifest.json'); calls.length = 0;
    await assert.rejects(captureRetailerSource(output, { fetchImpl: mockFetch(calls) }));
    assert.equal(calls.length, 0); assert.deepEqual(await readFile(output + '/manifest.json'), original);
  } finally { await rm(output, { recursive: true, force: true }); }
});

test('HTTP denial stops immediately without partial output or retries', async () => {
  const output = newOutput(), calls = [];
  await assert.rejects(captureRetailerSource(output, { fetchImpl: mockFetch(calls,
    () => new Response('Denied', { status: 403 })) }));
  assert.equal(calls.length, 1);
  await assert.rejects(stat(output), { code: 'ENOENT' });
});

test('HTML error bodies and overlarge PDFs cannot become successful captures', async () => {
  for (const replacement of [new Response('<html>error</html>', { headers: { 'content-type': 'text/html' } }),
    new Response('x'.repeat(20 * 1024 * 1024 + 1), { headers: { 'content-type': 'application/pdf' } })]) {
    const output = newOutput(), calls = [];
    await assert.rejects(captureRetailerSource(output, { fetchImpl: mockFetch(calls,
      (response, url) => url === source.pdfUrl ? replacement : response) }));
    await assert.rejects(stat(output), { code: 'ENOENT' });
  }
});

test('output paths stay in direct local-data children', () => {
  assert.throws(() => validateCaptureOutput('/tmp/retailer-source'));
  assert.throws(() => validateCaptureOutput(newOutput() + '/nested'));
});
