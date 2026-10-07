import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCoverage } from '../src/coverage.mjs';

const record = (id, date, overrides = {}) => ({ providerRecordId: String(id), observedOn: date, raw: { id, date, location_id: 12, product_code: '123', price: '1.25', currency: 'EUR', proof_id: 5, product: { product_quantity: 500, product_quantity_unit: 'g' }, ...overrides } });

test('counts identities and dates without claiming current prices', () => {
  const summary = summarizeCoverage([
    record(1, '2026-10-07'), record(2, '2026-09-24'),
    record(3, '2026-09-23', { location_id: 13, product_code: '456' }),
    record(4, '2026-10-08'), record(5, null), record(6, '2026-02-30'),
  ], { shoppingDate: '2026-10-07' });
  assert.equal(summary.observationCount, 6);
  assert.equal(summary.distinctLocationCount, 2);
  assert.equal(summary.distinctProductCodeCount, 2);
  assert.equal(summary.recentSince, '2026-09-24');
  assert.deepEqual(summary.freshness, { recent: 2, older: 1, future: 1, missing: 1, invalid: 1 });
  assert.equal(summary.nullRequiredFields.observedDate, 1);
  assert.match(summary.meaning, /neither current-price validity/);
});

test('empty results retain unknown basket coverage and null date bounds', () => {
  const summary = summarizeCoverage([], { shoppingDate: '2026-10-07' });
  assert.equal(summary.observationCount, 0);
  assert.equal(summary.earliestObservedDate, null);
  assert.equal(summary.latestObservedDate, null);
});

test('records lacking identity, amount or proof remain visible in missing counts', () => {
  const summary = summarizeCoverage([{ raw: {} }], { shoppingDate: '2026-10-07' });
  assert.ok(Object.values(summary.nullRequiredFields).every(value => value === 1));
  assert.equal(summary.distinctLocationCount, 0);
  assert.equal(summary.distinctProductCodeCount, 0);
});

test('duplicate identities are reported without silently deleting original records', () => {
  const original = [record(1, '2026-10-07'), record(1, '2026-10-07')];
  const snapshot = JSON.stringify(original);
  const summary = summarizeCoverage(original, { shoppingDate: '2026-10-07' });
  assert.equal(summary.observationCount, 2);
  assert.equal(summary.distinctProviderRecordCount, 1);
  assert.equal(summary.duplicateRecordIds, 1);
  assert.equal(JSON.stringify(original), snapshot);
});

test('requires explicit valid reference dates and bounded freshness window', () => {
  assert.throws(() => summarizeCoverage([], {}), /shoppingDate/);
  assert.throws(() => summarizeCoverage([], { shoppingDate: '2026-02-30' }), /shoppingDate/);
  assert.throws(() => summarizeCoverage([], { shoppingDate: '2026-10-07', recentDays: 0 }), /recentDays/);
});
