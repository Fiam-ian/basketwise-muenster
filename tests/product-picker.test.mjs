import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductPicker, searchPickerProducts, addPickedProduct, changePickedQuantity, pickedBasketCoverage } from '../src/product-picker.mjs';

const candidate = { id: 'milk', category: 'milk', productName: 'Herzstücke frische Milch', page: 5,
  packQuantity: 1000, unit: 'ml', priceCents: 100, depositCents: null, fatBasisPoints: 350,
  conditions: 'While stocks last', comparisonEligible: false, remainingReview: ['milk_source', 'deposit'] };
const report = { offerViewVersion: 1, storeId: 'edeka-074601', mode: 'advertised_candidates',
  rankingEnabled: false, inventoryComplete: false, captureManifestSha256: 'a'.repeat(64), leafletSha256: 'b'.repeat(64),
  validFrom: '2026-10-05', validTo: '2026-10-10', retrievedAt: '2026-10-07T21:47:19.174Z',
  reviewMethod: 'Synthetic test fixture', candidates: [candidate] };

test('shared publications merge only identical projected listings while preserving branch evidence', () => {
  const reports = [report, { ...report, storeId: 'edeka-074835', candidates: [{ ...candidate, id: 'branch-specific-id', remainingReview: ['another_review_note'] }] }];
  const [milk] = buildProductPicker(reports);
  assert.equal(milk.listings.length, 2);
  assert.equal(milk.listings[1].candidate.id, 'branch-specific-id');
  assert.deepEqual(milk.listings[1].candidate.remainingReview, ['another_review_note']);
  assert.equal(milk.inventoryVerified, false);
  assert.equal(milk.comparisonEligible, false);
  assert.equal(buildProductPicker([report, { ...reports[1], candidates: [{ ...candidate, priceCents: 101 }] }]).length, 2);
  assert.equal(buildProductPicker([report, { ...reports[1], leafletSha256: 'c'.repeat(64) }]).length, 2);
  assert.throws(() => buildProductPicker([report, report]));
  assert.throws(() => buildProductPicker([{ ...report, rankingEnabled: true }]));
});
test('product search finds actual names, accents and German/English categories without fabricating products', () => {
  const products = buildProductPicker([report]);
  for (const query of ['MILK', 'milch', 'herzstucke', 'frische herzstücke']) assert.equal(searchPickerProducts(products, query).length, 1);
  assert.equal(searchPickerProducts(products, 'Barilla').length, 0);
  assert.equal(searchPickerProducts(products, '', 'pasta').length, 0);
  assert.throws(() => searchPickerProducts(products, 'x'.repeat(101)));
});
test('exact captured selections merge, step down to removal, preserve input and bound quantities', () => {
  const [product] = buildProductPicker([report]);
  const first = addPickedProduct([], product), second = addPickedProduct(first, product);
  assert.equal(first[0].count, 1);
  assert.equal(second[0].count, 2);
  assert.deepEqual(changePickedQuantity(second, product.id, 0), []);
  assert.equal(changePickedQuantity(second, product.id, 99)[0].count, 99);
  for (const count of [-1, 100, 1.1]) assert.throws(() => changePickedQuantity(second, product.id, count));
  assert.throws(() => addPickedProduct([{ product, count: 99 }], product));
  assert.throws(() => changePickedQuantity(second, 'missing', 1));
});
test('requested listing coverage distinguishes dates and branches and never enables checkout', () => {
  const other = { ...report, storeId: 'edeka-074835', candidates: [{ ...candidate, id: 'other', productName: 'Another milk' }] };
  const reports = [report, other], [product] = buildProductPicker(reports);
  const list = addPickedProduct([], product);
  const active = pickedBasketCoverage(reports, list, '2026-10-05');
  assert.deepEqual(active.map(branch => branch.capturedLines), [1, 0]);
  assert.deepEqual(active.map(branch => branch.inPeriodLines), [1, 0]);
  assert.ok(active.every(branch => branch.eligibleLines === 0 && branch.complete === false && branch.checkoutCents === null));
  assert.equal(pickedBasketCoverage(reports, list, '2026-10-11')[0].inPeriodLines, 0);
  assert.equal(pickedBasketCoverage([], list, '2026-10-05').length, 0);
  assert.throws(() => pickedBasketCoverage(reports, list, '2026-02-30'));
});
