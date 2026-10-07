import test from 'node:test';
import assert from 'node:assert/strict';
import { matchProductAlternatives, validateProductCatalog } from '../src/product-catalog.mjs';

const product = (id = 'milk-1', changes = {}) => ({
  id, category: 'milk', brand: 'Example', pack: {quantity: 1000, unit: 'ml', basis: 'net'},
  attributes: {milkSource: 'cow', fatBasisPoints: 150, processing: 'uht', organic: false, lactoseFree: false},
  metadataReviewed: true,
  attributeReview: {milkSource: true, fatBasisPoints: true, processing: true, organic: true, lactoseFree: true},
  source: {provider: 'fixture', sourceUrl: 'https://example.org/product', retrievedAt: '2026-10-07T12:00:00Z', licence: 'Synthetic test fixture'},
  ...changes
});
const catalog = products => ({catalogVersion: 1, products});
const request = changes => ({category: 'milk', quantity: 2000, unit: 'ml', basis: 'net', brand: null, ...changes});
const match = (products, changes) => matchProductAlternatives(catalog(products), request(changes));

test('explicit milk source and fat exclude plant and whole milk', () => {
  const cow = product(), plant = product('plant'), whole = product('whole');
  plant.attributes.milkSource = 'plant'; whole.attributes.fatBasisPoints = 350;
  const result = match([cow, plant, whole], {requiredAttributes: {milkSource: 'cow', fatBasisPoints: 150}});
  assert.deepEqual(result.eligibleProductIds, ['milk-1']);
  assert.deepEqual(result.excluded, [{productId: 'plant', reasons: ['attribute_mismatch:milkSource']}, {productId: 'whole', reasons: ['attribute_mismatch:fatBasisPoints']}]);
});
test('unknown and unreviewed values cannot meet hard requests', () => {
  const unknown = product('unknown'), unreviewed = product('unreviewed');
  unknown.attributes.organic = null; unknown.attributeReview.organic = false;
  unreviewed.attributeReview.organic = false;
  const result = match([unknown, unreviewed], {requiredAttributes: {organic: false}});
  assert.deepEqual(result.eligibleProductIds, []);
  assert.deepEqual(result.excluded.map(entry => entry.reasons), [['attribute_unknown:organic'], ['attribute_unreviewed:organic']]);
});
test('unspecified brand permits alternatives but named brands stay exact', () => {
  const other = product('other', {brand: 'Other'});
  assert.deepEqual(match([product(), other]).eligibleProductIds, ['milk-1', 'other']);
  assert.deepEqual(match([product(), other], {brand: 'Example'}).eligibleProductIds, ['milk-1']);
  assert.deepEqual(match([product('unknown-brand', {brand: null})], {brand: 'Example'}).eligibleProductIds, []);
});
test('category unit basis and reviewed pack metadata are independent gates', () => {
  const products = [product('category', {category: 'yogurt'}), product('unit', {pack: {quantity: 1000, unit: 'g', basis: 'net'}}), product('basis', {pack: {quantity: 1000, unit: 'ml', basis: 'drained'}}), product('review', {metadataReviewed: false})];
  assert.deepEqual(match(products).excluded.map(entry => entry.reasons), [['category_mismatch'], ['unit_mismatch'], ['basis_mismatch'], ['metadata_unreviewed']]);
});
test('pack size differences are metadata alternatives without price or inventory claims', () => {
  const result = match([product('small', {pack: {quantity: 500, unit: 'ml', basis: 'net'}})]);
  assert.deepEqual(result.eligibleProductIds, ['small']);
  assert.equal(result.priceEligible, false); assert.equal(result.inventoryComplete, false);
  assert.equal(result.scope, 'product-equivalence-only');
  assert.equal(Object.hasOwn(result, 'totalCents'), false);
});
test('hard processing and lactose constraints stay strict', () => {
  assert.deepEqual(match([product()], {requiredAttributes: {processing: 'fresh', lactoseFree: true}}).excluded[0].reasons, ['attribute_mismatch:processing', 'attribute_mismatch:lactoseFree']);
});
test('matcher leaves caller metadata and request untouched', () => {
  const input = catalog([product()]), demand = request({requiredAttributes: {milkSource: 'cow'}});
  const before = JSON.stringify([input, demand]);
  matchProductAlternatives(input, demand);
  assert.equal(JSON.stringify([input, demand]), before);
});
test('catalog bounds reject duplicates oversized sets and invalid quantity', () => {
  for (const input of [catalog([product(), product()]), catalog(Array.from({length: 501}, (_, i) => product('p-' + i))), catalog([product('bad', {pack: {quantity: 0, unit: 'ml', basis: 'net'}})])]) assert.throws(() => validateProductCatalog(input), TypeError);
  assert.equal(validateProductCatalog(catalog([])).products.length, 0);
});
test('malformed attributes impossible review assertions and unsupported fields fail closed', () => {
  for (const mutate of [p => p.attributes.fatBasisPoints = 1.5, p => p.attributes.milkSource = 'oat', p => {p.attributes.organic = null;}, p => p.currentPrice = 99, p => p.pack.basis = 'count', p => p.attributeReview.organic = 'yes']) {
    const item = product(); mutate(item); assert.throws(() => validateProductCatalog(catalog([item])), TypeError);
  }
});
test('source provenance requires safe HTTP URL licence and real ISO UTC instant', () => {
  for (const change of [{sourceUrl: 'file:///tmp/product'}, {sourceUrl: 'https://user:secret@example.org'}, {licence: ''}, {retrievedAt: '2026-02-30T12:00:00Z'}, {retrievedAt: '2026-10-07'}]) {
    const item = product(); Object.assign(item.source, change); assert.throws(() => validateProductCatalog(catalog([item])), TypeError);
  }
});
test('invalid hard constraints and incompatible requests fail closed', () => {
  for (const changes of [{requiredAttributes: {unknown: true}}, {requiredAttributes: {organic: null}}, {requiredAttributes: {fatBasisPoints: 10001}}, {quantity: Infinity}, {unit: 'kg'}, {basis: 'count'}, {brand: undefined}, {requiredAttributes: []}, {requiredAttributes: null}]) assert.throws(() => match([product()], changes), TypeError);
});
test('unreviewed import drafts preserve unknown category and pack fields without matching', () => {
  const draft = product('draft', {category: null, metadataReviewed: false, pack: {quantity: null, unit: null, basis: null}});
  assert.deepEqual(match([draft]).eligibleProductIds, []);
  assert.ok(match([draft]).excluded[0].reasons.includes('metadata_unreviewed'));
  draft.pack = {quantity: 1000, unit: 'ml', basis: null};
  validateProductCatalog(catalog([draft]));
  draft.metadataReviewed = true;
  assert.throws(() => validateProductCatalog(catalog([draft])), TypeError);
});
test('optional display names preserve unknowns and never supply reviewed attributes', () => {
  for (const name of [null, 'Cow milk 1.5% UHT']) {
    const item = product('named', {name});
    item.attributes.milkSource = null; item.attributeReview.milkSource = false;
    validateProductCatalog(catalog([item]));
    assert.deepEqual(match([item], {requiredAttributes: {milkSource: 'cow'}}).eligibleProductIds, []);
  }
  validateProductCatalog(catalog([product()]));
  for (const name of ['', ' ', 'x'.repeat(161), 12, undefined]) assert.throws(() => validateProductCatalog(catalog([product('invalid-name', {name})])), TypeError);
});
