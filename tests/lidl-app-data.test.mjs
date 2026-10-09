import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLidlAppReport } from '../src/lidl-app-data.mjs';
const fixture = () => ({ schemaVersion: 1, mode: 'lidl_app_offer_candidates', package: 'com.lidl.eci.lidlplus', priceChannel: 'lidl_app_guest_offers', currency: 'EUR', generatedAt: '2026-10-09T09:30:00.123456+00:00', branchApplicabilityVerified: false, stockVerified: false, catalogueComplete: false,
  branchContext: { branchDisplay: 'Münster-Friedrich-Ebert-Straße', branchContextSha256: 'a'.repeat(64), branchAfterSha256: 'b'.repeat(64), independentlyVerifiedOnProductScreens: false },
  products: [{ productName: 'Synthetic breakfast item', priceAndPackDisplay: 'Normalpreis 4,00 €\nLidl Plus 3,00 €\n1 kg = 8,00 €', validityDisplay: '09.10. – 10.10.', normalPriceCents: 400, lidlPlusPriceCents: 300, referencePriceCents: 800, priceCents: null, depositCents: null, validFrom: null, validTo: null, comparisonEligible: false, inventoryVerified: false, evidence: [{ file: 'private.xml', sha256: 'c'.repeat(64), retrievedAt: '2026-10-09T09:29:00Z' }] }] });
const parse = value => parseLidlAppReport(JSON.stringify(value));
test('Lidl role amounts remain distinct and canonical price remains unknown', () => {
  const result = parse(fixture());
  assert.deepEqual([result.products[0].normalPriceCents, result.products[0].lidlPlusPriceCents, result.products[0].referencePriceCents, result.products[0].priceCents], [400, 300, 800, null]);
  assert.equal(result.products[0].priceAndPackDisplay.includes('\n'), false);
  assert.equal(result.products[0].comparisonEligible, false);
  assert.deepEqual(parse(result), result);
});
test('Missing normal amount never falls back to loyalty or reference amount', () => {
  const input = fixture(); input.products[0].normalPriceCents = null;
  const result = parse(input).products[0]; assert.equal(result.normalPriceCents, null); assert.equal(result.priceCents, null);
});
test('Yearless source period remains literal and does not establish dated validity', () => {
  const result = parse(fixture()); assert.equal(result.products[0].validityDisplay, '09.10. – 10.10.');
  assert.equal(result.validFrom, null); assert.equal(result.products[0].validTo, null);
});
test('Projection strips private files and arbitrary account fields at every level', () => {
  const input = fixture(); input.account = 'synthetic-private'; input.branchContext.file = 'private-branch.xml'; input.products[0].password = 'synthetic-private'; input.products[0].evidence[0].email = 'synthetic-private';
  const encoded = JSON.stringify(parse(input)); assert.equal(encoded.includes('private'), false); assert.equal(encoded.includes('file'), false);
});
test('Wrong origin, branch or verification claims are rejected', () => {
  for (const mutate of [x => x.package = 'other.package', x => x.mode = 'other', x => x.priceChannel = 'pickup', x => x.currency = 'USD', x => x.branchApplicabilityVerified = true, x => x.stockVerified = true, x => x.catalogueComplete = true, x => x.branchContext.branchDisplay = 'Other branch', x => x.branchContext.independentlyVerifiedOnProductScreens = true, x => x.branchContext.branchAfterSha256 = 'invalid']) {
    const input = fixture(); mutate(input); assert.throws(() => parse(input));
  }
});
test('Canonical prices, deposits, dated periods and eligibility cannot be injected', () => {
  for (const [key, value] of [['priceCents', 300], ['depositCents', 0], ['validFrom', '2026-10-09'], ['validTo', '2026-10-10'], ['comparisonEligible', true], ['inventoryVerified', true]]) {
    const input = fixture(); input.products[0][key] = value; assert.throws(() => parse(input));
  }
});
test('Amount roles require bounded safe integers or explicit null', () => {
  for (const key of ['normalPriceCents', 'lidlPlusPriceCents', 'referencePriceCents']) for (const value of [-1, 0.5, 1000001, '300', undefined]) {
    const input = fixture(); input.products[0][key] = value; assert.throws(() => parse(input));
  }
});
test('Input, names, raw labels, record count and evidence count are bounded', () => {
  assert.throws(() => parseLidlAppReport(' '.repeat(2 * 1024 * 1024 + 1)));
  for (const mutate of [x => x.products = Array(101).fill(x.products[0]), x => x.products[0].productName = 'x'.repeat(501), x => x.products[0].priceAndPackDisplay = 'x'.repeat(2001), x => x.products[0].validityDisplay = '\u0000bad', x => x.products[0].evidence = [], x => x.products[0].evidence = Array(31).fill(x.products[0].evidence[0])]) {
    const input = fixture(); mutate(input); assert.throws(() => parse(input));
  }
});
test('Malformed JSON, timestamps and evidence hashes are rejected', () => {
  assert.throws(() => parseLidlAppReport('{'));
  for (const mutate of [x => x.generatedAt = '2026-02-30T09:30:00Z', x => x.generatedAt = '2026-10-09T25:00:00Z', x => x.products[0].evidence[0].retrievedAt = 'yesterday', x => x.products[0].evidence[0].sha256 = 'bad']) {
    const input = fixture(); mutate(input); assert.throws(() => parse(input));
  }
});
