import test from 'node:test';
import assert from 'node:assert/strict';
import { draftPublication } from '../scripts/extract-leaflet-catalogue.mjs';
import { extractLeafletCatalogue } from '../scripts/extract-leaflet-catalogue.mjs';
import { mkdir, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const word = (text, box) => ({ text, box });
test('spatial draft preserves all pages and text while separating large price anchors from small amounts', () => {
  const report = draftPublication([{ page: 1, width: 600, height: 900, words: [word('Milk', [10, 20, 60, 40]), word('1.29', [60, 90, 110, 145]), word('0.25', [20, 50, 50, 65]), word('1.11', [70, 150, 120, 205])] }, { page: 2, width: 600, height: 900, words: [] }], { sourceSha256: 'a'.repeat(64) });
  assert.equal(report.pageCount, 2); assert.equal(report.pagesWithText, 1); assert.equal(report.priceAnchorCount, 2);
  assert.equal(report.pages[0].words.length, 4); assert.equal(report.pages[0].drafts[0].amountText, '1.29');
  assert.match(report.pages[0].drafts[0].snippet, /Milk/);
  assert.equal(report.rankingEnabled, false); assert.equal(report.inventoryComplete, false); assert.equal(report.extractionComplete, false);
  for (const draft of report.pages[0].drafts) { assert.equal(draft.productName, null); assert.equal(draft.productPriceCents, null); assert.equal(draft.comparisonEligible, false); }
});
test('malformed page and word geometry fail before extraction claims', () => {
  for (const pages of [[], [{ page: 2, width: 600, height: 900, words: [] }], [{ page: 1, width: NaN, height: 900, words: [] }], [{ page: 1, width: 600, height: 900, words: [word('1.29', [100, 20, 10, 50])] }]]) assert.throws(() => draftPublication(pages, {}));
});
test('tampered captured PDF is rejected without overwriting an existing private report', async () => {
  const local = fileURLToPath(new URL('../local-data/', import.meta.url));
  await mkdir(local, { recursive: true });
  const directory = await mkdtemp(local + 'test-leaflet-draft-');
  try {
    await writeFile(directory + '/manifest.json', JSON.stringify({ retailerCaptureVersion: 1, sources: [{ filename: 'leaflet.pdf', sha256: 'a'.repeat(64) }] }));
    await writeFile(directory + '/leaflet.pdf', '%PDF-1.7\nTAMPERED');
    await writeFile(directory + '/draft.json', 'preserve existing');
    await assert.rejects(extractLeafletCatalogue(directory, directory + '/draft.json', { pythonExecutable: '/never-run-this' }), /hash\/content mismatch/);
    assert.equal(await readFile(directory + '/draft.json', 'utf8'), 'preserve existing');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
