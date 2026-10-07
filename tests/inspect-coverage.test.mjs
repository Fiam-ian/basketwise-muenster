import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectCoverageReport } from '../src/inspect-coverage.mjs';

const location = { id: 4, type: 'OSM', osm_id: 123, osm_type: 'NODE', osm_name: 'Example shop', osm_brand: 'Example', osm_address_city: 'Münster', osm_address_postcode: '48143', osm_address_country_code: 'DE', owner: 'SECRET_OWNER', website_url: 'https://private.invalid' };
const observation = (id, proofId, overrides = {}) => ({ provider: 'open-prices', providerRecordId: String(id), observedOn: '2026-09-26', raw: { id, date: '2026-09-26', location_id: 4, location, proof_id: proofId, proof: { id: proofId, owner: 'SECRET_USER', file_path: 'https://private.invalid/proof' }, owner: 'SECRET_OWNER', price: 'SECRET_PRICE', product_code: 'SECRET_PRODUCT', ...overrides } });
const report = observations => ({ auditVersion: 1, referenceDateBasis: 'Europe/Berlin', queriedWindow: { sinceInclusive: '2026-09-24', referenceDate: '2026-10-07' }, observations, providerTotal: observations.length, truncated: false });

test('counts observations by location, evidence and date without exposing purchases or owners', () => {
  const input = report([observation(1, 10), observation(2, 10), observation(3, 11)]);
  const before = JSON.stringify(input);
  const summary = inspectCoverageReport(input);
  assert.equal(summary.observationCount, 3);
  assert.equal(summary.distinctLocationCount, 1);
  assert.equal(summary.distinctProofCount, 2);
  assert.deepEqual(summary.observationDates, [{ date: '2026-09-26', observationCount: 3 }]);
  assert.equal(summary.locations[0].providerMetadataCandidates[0].osmId, 123);
  assert.equal(summary.locations[0].identityVerified, false);
  assert.doesNotMatch(JSON.stringify(summary), /SECRET_|private\.invalid|file_path|website_url|product_code|proof_id/);
  assert.equal(JSON.stringify(input), before);
});

test('flags location and proof conflicts rather than treating identities as verified', () => {
  const summary = inspectCoverageReport(report([observation(1, 10, { location: { ...location, id: 99 }, proof: { id: 99 } })]));
  assert.equal(summary.conflictingLocationIdentityCount, 1);
  assert.equal(summary.conflictingProofIdentityCount, 1);
  assert.equal(summary.distinctProofCount, 0);
  assert.equal(summary.locations[0].missingMetadataCount, 1);
  assert.deepEqual(summary.locations[0].providerMetadataCandidates, []);
});

test('reports missing dates and identities without inventing provider metadata', () => {
  const summary = inspectCoverageReport(report([{ ...observation(1, null, { date: null, location_id: null, location: null, proof: null }), observedOn: null }]));
  assert.equal(summary.missingLocationCount, 1);
  assert.equal(summary.missingProofCount, 1);
  assert.equal(summary.missingDateCount, 1);
  assert.equal(summary.observationCount, 1);
  assert.equal(summary.locations.length, 0);
});

test('rejects unsupported report shape, oversized record count and mismatched provider identity', () => {
  assert.throws(() => inspectCoverageReport(null), /version-1/);
  assert.throws(() => inspectCoverageReport(report(Array.from({ length: 301 }, (_, index) => observation(index + 1, 1)))), /300/);
  assert.throws(() => inspectCoverageReport(report([{ ...observation(1, 1), providerRecordId: '2' }])), /identity/);
  assert.throws(() => inspectCoverageReport({ ...report([]), referenceDateBasis: 'UTC' }), /reference date/);
});

test('excludes URL or email strings from public store-name candidates', () => {
  const summary = inspectCoverageReport(report([observation(1, 1, { location: { ...location, osm_name: 'https://private.invalid/proof', osm_brand: 'user@example.invalid' } })]));
  assert.equal(summary.locations[0].providerMetadataCandidates[0].providerStoreName, null);
  assert.equal(summary.locations[0].providerMetadataCandidates[0].providerBrand, null);
  assert.doesNotMatch(JSON.stringify(summary), /private\.invalid|example\.invalid/);
});
