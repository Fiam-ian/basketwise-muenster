import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectWoltListings} from '../src/wolt-listings.mjs';
const options = () => ({sourceUrl: 'https://wolt.com/de/deu/munster/venue/de-mus-zent', fetchedAt: '2026-10-07T12:00:00Z'});
const item = changes => ({id: 'listing-1', name: 'Example milk', price: 199, original_price: 249, unit_info: '1 l', deposit: null, is_wolt_plus_only: false, ...changes});
const state = items => ({queries: [
  {queryKey: ['venue', 'static', 'de-mus-zent', 'de'], state: {data: {venue: {slug: 'de-mus-zent', name: 'Flink Berliner Platz', city: 'Münster', country: 'DEU', currency: 'EUR'}}}},
  {queryKey: ['venue-assortment', 'venue-content', 'de-mus-zent', 'no-user', 'de', null, null], state: {data: {pages: [{sections: [{items}, {title: 'No listing section'}]}]}}}
]});
const html = value => `<html><script class="query-state" type="application/json">${JSON.stringify(value)}</script></html>`;
const inspect = items => inspectWoltListings(html(state(items)), options());

test('listing projection keeps cents and delivery channel while every comparison gate stays closed', () => {
  const result = inspect([item()]);
  assert.equal(result.listings[0].priceCents, 199); assert.equal(result.priceCurrency, 'EUR');
  assert.equal(result.channel, 'delivery_listing');
  for (const key of ['inventoryComplete', 'addressServiceabilityVerified', 'checkoutFeesKnown', 'rankingEnabled', 'activeValidityReviewed']) assert.equal(result[key], false);
});
test('source pack text and deposit display do not establish canonical pack or deposit evidence', () => {
  const result = inspect([item({deposit: {amount: 25, label: 'EINWEG'}})]);
  const listing = result.listings[0];
  assert.equal(listing.unitLabel, '1 l'); assert.equal(listing.metadataReviewed, false);
  assert.deepEqual(listing.pack, {quantity: null, unit: null, basis: null});
  assert.equal(listing.depositCents, null); assert.equal(listing.depositReviewed, false);
  assert.deepEqual(listing.sourceDepositDisplay, {amountCents: 25, label: 'EINWEG'});
});
test('allowlist excludes barcode stock descriptions telemetry session and geolocation', () => {
  const input = state([item({barcode_gtin: 'SECRET_BARCODE', purchasable_balance: 'SECRET_STOCK', description: 'SECRET_DESCRIPTION', telemetry: 'SECRET_TELEMETRY'})]);
  input.session = 'SECRET_SESSION'; input.geolocation = 'SECRET_LOCATION';
  assert.equal(JSON.stringify(inspectWoltListings(html(input), options())).includes('SECRET'), false);
});
test('same listing identity deduplicates only coherent projected evidence', () => {
  assert.equal(inspect([item(), item()]).listings.length, 1);
  assert.equal(inspect([item(), item()]).duplicateCount, 1);
  assert.throws(() => inspect([item(), item({price: 299})]), TypeError);
});
test('wrong venue currency malformed script and invalid source context fail closed', () => {
  for (const changes of [{slug: 'another'}, {city: 'Berlin'}, {country: 'FIN'}, {currency: 'USD'}]) {
    const input = state([item()]); Object.assign(input.queries[0].state.data.venue, changes);
    assert.throws(() => inspectWoltListings(html(input), options()), TypeError);
  }
  assert.throws(() => inspectWoltListings(html(state([])), {...options(), sourceUrl: 'https://example.org'}), TypeError);
  assert.throws(() => inspectWoltListings(html(state([])), {...options(), fetchedAt: '2026-02-30T12:00:00Z'}), TypeError);
  assert.throws(() => inspectWoltListings('<script type="application/json" class="query-state">broken</script>', options()), TypeError);
});
test('query item and HTML bounds reject excessive captures and caller data stays unchanged', () => {
  assert.throws(() => inspect(Array.from({length: 501}, (_, i) => item({id: 'i-' + i}))), TypeError);
  const input = state([]); input.queries.push(...Array.from({length: 99}, () => ({})));
  assert.throws(() => inspectWoltListings(html(input), options()), TypeError);
  assert.throws(() => inspectWoltListings('x'.repeat(2 * 1024 * 1024 + 1), options()), TypeError);
  const original = state([item()]), before = JSON.stringify(original);
  inspectWoltListings(html(original), options()); assert.equal(JSON.stringify(original), before);
});
