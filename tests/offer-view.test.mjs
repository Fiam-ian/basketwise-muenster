import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOfferView, offerDateStatus, inspectOfferCoverage, OFFER_STARTER_REQUEST } from '../src/offer-view.mjs';
import { prepareOfferView } from '../scripts/prepare-offer-view.mjs';
import { EDEKA_PILOT_SOURCE as source } from '../src/retailer-source.mjs';

const candidate = { id: 'milk', category: 'milk', productName: '<img src=x onerror=alert(1)>', page: 5,
  packQuantity: 1000, unit: 'ml', priceCents: 100, depositCents: null, fatBasisPoints: 350,
  conditions: 'While stocks last', comparisonEligible: false, remainingReview: ['milk_source', 'deposit'] };
const report = { offerViewVersion: 1, storeId: source.storeId, mode: 'advertised_candidates',
  rankingEnabled: false, inventoryComplete: false, captureManifestSha256: 'a'.repeat(64), leafletSha256: 'b'.repeat(64),
  validFrom: '2026-10-05', validTo: '2026-10-10', retrievedAt: '2026-10-07T21:47:19.174Z',
  reviewMethod: 'Local visual review', candidates: [candidate] };
test('offer inspection projects only display fields and preserves unknown Pfand and hard milk fat', () => {
  const parsed = parseOfferView(JSON.stringify({ ...report, sourceUrl: 'javascript:alert(1)', privateOwner: 'PRIVATE',
    candidates: [{ ...candidate, proof: 'PRIVATE', comparisonTotal: 0 }] }));
  assert.equal(parsed.sourceUrl, source.branchUrl);
  assert.equal(parsed.candidates[0].depositCents, null);
  assert.equal(parsed.candidates[0].fatBasisPoints, 350);
  assert.equal(parsed.candidates[0].productName, candidate.productName);
  assert.equal(JSON.stringify(parsed).includes('PRIVATE'), false);
  assert.equal(parsed.rankingEnabled, false);
});
test('leaflet dates classify past future and boundary shopping dates without using retrieval time', () => {
  assert.match(offerDateStatus(report, '2026-10-04'), /Not yet/);
  for (const date of ['2026-10-05', '2026-10-10']) assert.match(offerDateStatus(report, date), /Within/);
  assert.match(offerDateStatus(report, '2026-10-11'), /ended/);
  assert.throws(() => offerDateStatus(report, '2026-02-30'));
});
test('unsafe or ambiguous import structures cannot become offers', () => {
  for (const value of [null, {}, { ...report, rankingEnabled: true }, { ...report, storeId: 'edeka-074602' },
    { ...report, storeId: undefined }, { ...report, inventoryComplete: true }, { ...report, validTo: '2026-10-01' }, { ...report, validFrom: '2026-02-30' },
    { ...report, retrievedAt: 'yesterday' }, { ...report, candidates: [candidate, candidate] },
    ...[{ comparisonEligible: true }, { priceCents: 1.1 }, { unit: 'kg' }, { depositCents: -1 }, { packQuantity: 0 }, { fatBasisPoints: '3.5' }].map(change => ({ ...report, candidates: [{ ...candidate, ...change }] }))]) {
    assert.throws(() => parseOfferView(JSON.stringify(value)));
  }
  assert.throws(() => parseOfferView('x'.repeat(2 * 1024 * 1024 + 1)));
});
test('two distinct branch reports retain their identities and candidate counts never become basket coverage', async () => {
  const first = parseOfferView(JSON.stringify(report));
  const second = parseOfferView(JSON.stringify({ ...report, storeId: 'edeka-074835', storeName: 'Injected store' }));
  assert.equal(second.storeName, 'EDEKA Wiewel Aaseemarkt');
  assert.equal(second.sourceUrl, 'https://www.edeka.de/maerkte/074835/');
  const coverage = inspectOfferCoverage([first, second]);
  assert.equal(coverage.length, 6);
  assert.deepEqual(coverage.find(row => row.category === 'milk').branches.map(branch => branch.candidateCount), [1, 1]);
  assert.ok(coverage.every(row => row.branches.every(branch => branch.comparisonEligibleCount === 0)));
  assert.equal(coverage.find(row => row.category === 'eggs').branches[0].candidateCount, 0);
  assert.throws(() => inspectOfferCoverage([first, first]));
  assert.throws(() => inspectOfferCoverage([first, second, first]));
  const request = JSON.parse(await readFile(new URL('../data/pilot-basket.json', import.meta.url), 'utf8'));
  assert.deepEqual(OFFER_STARTER_REQUEST, request.items.map(({ category, quantity, unit }) => ({ category, quantity, unit })));
});
test('main and supplement reports aggregate by branch without conflating publications or pack evidence', () => {
  const first = parseOfferView(JSON.stringify(report));
  const second = parseOfferView(JSON.stringify({ ...report, storeId: 'edeka-074835' }));
  const primary = parseOfferView(JSON.stringify({ ...report, storeId: 'edeka-074835', leafletId: 'primary', candidates: [
    { ...candidate, id: 'water', category: 'water', packAmbiguity: 'Bottle text and multipack picture conflict.', depositDisplay: 'Per-bottle deposit; total unknown.' }
  ] }));
  assert.match(primary.leafletUrl, /Stroetmann_25/);
  assert.equal(primary.candidates[0].depositCents, null);
  assert.match(primary.candidates[0].packAmbiguity, /conflict/);
  const coverage = inspectOfferCoverage([first, second, primary]);
  assert.equal(coverage[0].branches.length, 2);
  assert.equal(coverage.find(row => row.category === 'water').branches[1].candidateCount, 1);
  assert.throws(() => inspectOfferCoverage([second, primary, primary]));
  assert.throws(() => parseOfferView(JSON.stringify({ ...report, leafletId: 'primary' })));
  assert.throws(() => parseOfferView(JSON.stringify({ ...report, leafletId: 'invented' })));
  assert.throws(() => parseOfferView(JSON.stringify({ ...report, candidates: [{ ...candidate, packAmbiguity: {} }] })));
});
test('offline preparation checks every source hash and review binding, preserves outputs and private source data', async () => {
  const root = fileURLToPath(new URL('../local-data/', import.meta.url));
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(resolve(root, 'offer-test-'));
  const output = directory + '.json';
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const entries = [['branch.html', source.branchUrl], ['prospects.html', source.prospectUrl], ['viewer.html', source.viewerUrl], ['leaflet.pdf', source.pdfUrl]];
  try {
    const sources = [];
    for (const [filename, url] of entries) {
      const bytes = Buffer.from('synthetic source ' + filename);
      await writeFile(resolve(directory, filename), bytes);
      sources.push({ filename, url, sha256: digest(bytes), bytes: bytes.length, retrievedAt: report.retrievedAt });
    }
    const manifest = JSON.stringify({ retailerCaptureVersion: 1, storeId: source.storeId, sources,
      pageAdvertisedWindow: { validFrom: report.validFrom, validTo: report.validTo } });
    await writeFile(resolve(directory, 'manifest.json'), manifest);
    const review = { ...report, retailerCandidateReviewVersion: 1, captureManifestSha256: digest(manifest),
      leafletSha256: sources[3].sha256, privateOwner: 'PRIVATE' };
    await writeFile(resolve(directory, 'reviewed-candidates-v1.json'), JSON.stringify(review));
    const result = await prepareOfferView(directory, output);
    assert.equal(result.candidateCount, 1);
    assert.equal(result.sourceHashesChecked, true);
    const saved = await readFile(output, 'utf8');
    assert.equal(saved.includes('PRIVATE'), false);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    assert.equal(parseOfferView(saved).candidates.length, 1);
    await assert.rejects(prepareOfferView(directory, output), /exists/);
    assert.equal(await readFile(output, 'utf8'), saved);
    await writeFile(resolve(directory, 'reviewed-candidates-v1.json'), JSON.stringify({ ...review, leafletId: 'primary' }));
    await assert.rejects(prepareOfferView(directory, output + '.new'), /do not match/);
    await writeFile(resolve(directory, 'reviewed-candidates-v1.json'), JSON.stringify({ ...review, storeId: 'edeka-074835' }));
    await assert.rejects(prepareOfferView(directory, output + '.new'), /do not match/);
    await writeFile(resolve(directory, 'reviewed-candidates-v1.json'), JSON.stringify({ ...review, captureManifestSha256: 'c'.repeat(64) }));
    await assert.rejects(prepareOfferView(directory, output + '.new'), /do not match/);
    await writeFile(resolve(directory, 'reviewed-candidates-v1.json'), JSON.stringify(review));
    await writeFile(resolve(directory, 'branch.html'), 'changed');
    await assert.rejects(prepareOfferView(directory, output + '.new'), /changed/);
    assert.equal(await readFile(resolve(directory, 'manifest.json'), 'utf8'), manifest);
    await assert.rejects(prepareOfferView(directory, '/tmp/offer-outside.json'), /local-data/);
  } finally {
    await rm(directory, { recursive: true, force: true });
    await rm(output, { force: true });
    await rm(output + '.new', { force: true });
  }
});
