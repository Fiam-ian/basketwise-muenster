import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShopDiscovery } from '../src/shop-discovery.mjs';
const options = () => ({origin: {lat: 51.96236, lon: 7.62571}, radiusKm: 3, fetchedAt: '2026-10-07T12:00:00Z', sourceUrl: 'https://overpass-api.de/api/interpreter'});
const node = (id = 1, changes = {}) => ({type: 'node', id, lat: 51.96236, lon: 7.62571, tags: {shop: 'supermarket', name: 'Example'}, ...changes});
const discover = elements => normalizeShopDiscovery({elements}, options());

test('nodes ways and relations normalize stable public identities and geometric points', () => {
  const elements = [node(), {type: 'way', id: 1, center: {lat: 51.963, lon: 7.62571}, tags: {shop: 'grocery'}}, {type: 'relation', id: 1, center: {lat: 51.964, lon: 7.62571}, tags: {shop: 'health_food'}}];
  const result = discover(elements);
  assert.deepEqual(result.shops.map(s => s.id), ['node/1', 'way/1', 'relation/1']);
  assert.equal(result.shops[0].distanceMeters, 0);
  assert.ok(result.shops[2].distanceMeters > result.shops[1].distanceMeters);
  assert.ok(result.shops.every(s => s.distanceBasis === 'straight_line_to_osm_point'));
});
test('radius is a disclosed point distance filter flag and never walking eligibility', () => {
  const result = discover([node(), node(2, {lat: 52.06236})]);
  assert.deepEqual(result.shops.map(s => s.withinRadius), [true, false]);
  assert.equal(result.discoveryComplete, false); assert.equal(result.branchIdentityReviewed, false); assert.equal(result.inventoryAvailable, false);
  assert.equal(Object.hasOwn(result.shops[0], 'walkingDistanceMeters'), false);
  assert.equal(result.licence, 'ODbL-1.0');
});
test('invalid identities duplicates unsupported shops and absent coordinates are counted', () => {
  const result = discover([node(), node(), node(-1), node(2, {tags: {shop: 'bakery'}}), node(3, {lat: null}), {type: 'way', id: 4, tags: {shop: 'convenience'}}]);
  assert.equal(result.shops.length, 1);
  assert.deepEqual(result.excludedCounts, {invalidIdentity: 1, duplicateIdentity: 1, unsupportedShop: 1, missingCoordinates: 2});
});
test('projection omits contact and private tags while preserving bounded address labels', () => {
  const result = discover([node(1, {tags: {shop: 'greengrocer', name: 'Example', brand: 'Brand', 'addr:street': 'Street', 'addr:housenumber': '7', 'addr:postcode': '48143', 'addr:city': 'Münster', phone: 'SECRET_PHONE', owner: 'SECRET_OWNER'}})]);
  assert.deepEqual(result.shops[0].address, {street: 'Street', houseNumber: '7', postcode: '48143', city: 'Münster'});
  assert.equal(JSON.stringify(result).includes('SECRET'), false);
});
test('bounds and malformed source timestamps coordinates and radius fail closed', () => {
  for (const change of [{origin: {lat: 91, lon: 0}}, {origin: {lat: 0, lon: NaN}}, {radiusKm: 0}, {radiusKm: 26}, {radiusKm: Infinity}, {fetchedAt: '2026-02-30T12:00:00Z'}, {sourceUrl: 'file:///tmp/data'}, {sourceUrl: 'https://user:password@example.org'}]) assert.throws(() => normalizeShopDiscovery({elements: []}, {...options(), ...change}), TypeError);
  assert.throws(() => discover(Array.from({length: 501}, () => node())), TypeError);
});
test('discovery never mutates source data or options and supports all five scoped shop tags', () => {
  const elements = ['supermarket', 'convenience', 'grocery', 'greengrocer', 'health_food'].map((shop, i) => node(i + 1, {tags: {shop}}));
  const params = options(), input = {elements}, before = JSON.stringify([input, params]);
  assert.equal(normalizeShopDiscovery(input, params).shops.length, 5);
  assert.equal(JSON.stringify([input, params]), before);
});
