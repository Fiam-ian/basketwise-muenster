import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { buildLocalCatalog } from '../scripts/build-local-catalog.mjs';

const capturedAt = '2026-10-07T12:00:00.000Z';
function fixture() {
  const observations = [1, 2].map(id => ({
    provider: 'open-prices', providerRecordId: String(id),
    sourceUrl: 'https://prices.openfoodfacts.org/api/v1/prices/' + id,
    capturedAt, observedOn: '2026-09-26', validity: 'unconfirmed', eligibleAsActiveOffer: false,
    attribution: 'Open Prices / Open Food Facts', license: 'ODbL-1.0',
    raw: { id, date: '2026-09-26', location_id: 77, product_code: '12345', price: '1.99',
      currency: 'EUR', proof_id: 42, owner: 'PRIVATE_OWNER_SENTINEL',
      proof: { url: 'PRIVATE_RECEIPT_SENTINEL' },
      product: { product_name: id === 1 ? 'Earlier label' : 'Changed label',
        product_quantity: 500, product_quantity_unit: 'ml', creator: 'PRIVATE_CREATOR_SENTINEL' } }
  }));
  return { auditVersion: 1, generatedAt: '2026-10-07T12:01:00.000Z', referenceDateBasis: 'Europe/Berlin',
    queriedWindow: { sinceInclusive: '2026-09-24', referenceDate: '2026-10-07', upperDateFilterApplied: false },
    limits: { maxPages: 3, pageSize: 100, maximumRetainedRecords: 300 }, summary: {},
    providerTotal: 2, truncated: false,
    query: { lat: 51.96236, lon: 7.62571, radiusKm: 3, observedSince: '2026-09-24' },
    requests: [{ url: 'https://prices.openfoodfacts.org/api/v1/prices?lat=51.96236&lon=7.62571&radius_km=3&currency=EUR&size=100&page=1&date__gte=2026-09-24', capturedAt }],
    docsUrl: 'https://prices.openfoodfacts.org/api/docs', attribution: 'Open Prices / Open Food Facts',
    license: 'ODbL-1.0', observations };
}
async function withFiles(run) {
  const dir = await mkdtemp(join(tmpdir(), 'catalog-test-'));
  const input = join(dir, 'input.json'), output = join(dir, 'catalog.sqlite');
  await writeFile(input, JSON.stringify(fixture()));
  try { await run(input, output); } finally { await rm(dir, { recursive: true, force: true }); }
}

test('real database separates snapshots/prices, excludes private fields, and keeps every gate closed', async () => {
  await withFiles(async (input, output) => {
    const original = await readFile(input);
    assert.deepEqual(await buildLocalCatalog(input, output), { observations: 2, products: 1, locations: 1,
      reviewedProducts: 0, rankingEnabled: false, inventoryComplete: false });
    assert.deepEqual(await readFile(input), original);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    const db = new DatabaseSync(output);
    try {
      const snapshots = db.prepare('SELECT draft_json FROM product_snapshots ORDER BY record_id').all()
        .map(row => JSON.parse(row.draft_json));
      assert.deepEqual(snapshots.map(p => p.name), ['Earlier label', 'Changed label']);
      assert.ok(snapshots.every(p => !p.metadataReviewed && p.pack.basis === null && p.attributes.fatBasisPoints === null));
      assert.equal(db.prepare('SELECT sum(evidence_reviewed) AS n FROM observations').get().n, 0);
      assert.equal(db.prepare('SELECT price_decimal FROM observations LIMIT 1').get().price_decimal, '1.99');
      assert.match(db.prepare('SELECT sha256 FROM reports').get().sha256, /^[a-f0-9]{64}$/);
    } finally { db.close(); }
    const bytes = await readFile(output);
    for (const secret of ['PRIVATE_OWNER_SENTINEL', 'PRIVATE_RECEIPT_SENTINEL', 'PRIVATE_CREATOR_SENTINEL'])
      assert.equal(bytes.includes(Buffer.from(secret)), false);
  });
});

test('existing output and input are preserved on repeated imports', async () => {
  await withFiles(async (input, output) => {
    await buildLocalCatalog(input, output);
    const before = await readFile(output);
    await assert.rejects(buildLocalCatalog(input, output), { code: 'EEXIST' });
    assert.deepEqual(await readFile(output), before);
    await assert.rejects(buildLocalCatalog(input, input), { code: 'EEXIST' });
  });
});

test('invalid report fails before creating a database', async () => {
  await withFiles(async (input, output) => {
    await writeFile(input, '{"auditVersion":99}');
    await assert.rejects(buildLocalCatalog(input, output));
    await assert.rejects(stat(output), { code: 'ENOENT' });
  });
});

test('nested product and location identities retain shared links', async () => {
  await withFiles(async (input, output) => {
    const report = fixture();
    for (const o of report.observations) {
      o.raw.product.code = o.raw.product_code; delete o.raw.product_code;
      o.raw.location = { id: o.raw.location_id }; delete o.raw.location_id;
    }
    await writeFile(input, JSON.stringify(report));
    const result = await buildLocalCatalog(input, output);
    assert.equal(result.products, 1); assert.equal(result.locations, 1);
  });
});

test('conflicting source identities fail before creating output', async () => {
  await withFiles(async (input, output) => {
    const report = fixture(); report.observations[0].raw.product.code = 'different';
    await writeFile(input, JSON.stringify(report));
    await assert.rejects(buildLocalCatalog(input, output), /Conflicting source identity/);
    await assert.rejects(stat(output), { code: 'ENOENT' });
  });
});
