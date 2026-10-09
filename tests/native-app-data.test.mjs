import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNativeAppReport, parseAppReport } from '../src/native-app-data.mjs';
import { buildProductPicker, searchPickerProducts, addPickedProduct, pickedBasketCoverage } from '../src/product-picker.mjs';
const product = { nativeListingRef: 'de.aldiNord.android:id/product_tile_promotion_123', nativeListingKind: 'promotion', productName: 'Chocolate snack', brandDisplay: 'Example brand', packDisplay: '10x28-g-Packung', priceCents: 179, unitPriceDisplay: 'kg = 6.39', priceFootnoteDisplay: '*', flagsDisplay: ['Im Angebot ab 12.10'], depositCents: null, comparisonEligible: false, inventoryVerified: false, priceConflicted: false, evidence: [{ file: 'private-path.xml', sha256: 'a'.repeat(64), retrievedAt: '2026-10-08T18:02:54Z', account: 'PRIVATE' }] };
const report = { schemaVersion: 1, mode: 'aldi_app_candidates', package: 'de.aldiNord.android', query: 'Milch', generatedAt: '2026-10-08T18:05:20Z', priceChannel: 'aldi_app_unmapped_branch', branch: null, branchApplicabilityVerified: false, currency: 'EUR', validFrom: null, validTo: null, catalogueComplete: false, stockVerified: false, products: [product], accountEmail: 'PRIVATE' };
const parse = value => parseNativeAppReport(JSON.stringify(value));
test('native projection strips private fields and keeps literal commercial metadata without category inference', () => {
  const parsed = parse(report), serialized = JSON.stringify(parsed);
  assert.equal(serialized.includes('PRIVATE'), false); assert.equal(serialized.includes('private-path'), false);
  const [picked] = buildProductPicker([parsed]);
  assert.equal(picked.category, 'unclassified'); assert.equal(picked.packDisplay, product.packDisplay);
  assert.equal(searchPickerProducts([picked], 'example brand').length, 1);
  assert.equal(searchPickerProducts([picked], '10x28').length, 1);
  assert.equal(searchPickerProducts([picked], 'Milch').length, 0);
  assert.equal(searchPickerProducts([picked], '', 'milk').length, 0);
  const basket = addPickedProduct([], picked);
  const [coverage] = pickedBasketCoverage([parsed], basket, '2026-10-12');
  assert.equal(coverage.capturedLines, 1); assert.equal(coverage.inPeriodLines, 0); assert.equal(coverage.checkoutCents, null);
  assert.equal(pickedBasketCoverage([], basket, '2026-10-12').length, 0); assert.equal(basket.length, 1);
});
test('native projection fails closed on price, evidence, branch, validity and eligibility changes', () => {
  for (const change of [{ branch: 'Münster' }, { branchApplicabilityVerified: true }, { validFrom: '2026-10-12' }, { stockVerified: true }, { package: 'untrusted' }, { catalogueComplete: true }]) assert.throws(() => parse({ ...report, ...change }));
  for (const change of [{ comparisonEligible: true }, { inventoryVerified: true }, { priceCents: 1.5 }, { depositCents: 0 }, { nativeListingRef: 'wrong' }, { evidence: [] }]) assert.throws(() => parse({ ...report, products: [{ ...product, ...change }] }));
});
test('pickup context is narrowly allowlisted and never merges with unmapped ALDI', () => {
  const pickup = { ...report, mode: 'android_pickup_candidates', package: 'de.rewe.app.mobile', priceChannel: 'pickup', branchDisplay: 'Abholen | Metzer Str. 62-64, 48151 Münster / Geist', branchContextSha256: 'b'.repeat(64), products: [{ ...product, packAndLabelsDisplay: product.packDisplay }] };
  assert.throws(() => parse({ ...pickup, branchDisplay: 'Personal delivery address' }));
  const products = buildProductPicker([parse(report), parse(pickup)]);
  assert.equal(products.length, 2); assert.equal(products[1].listings[0].priceChannel, 'pickup');
  assert.equal(buildProductPicker([parse(report), parse(report)]).length, 1);
});
test('bounded multi-query imports preserve distinct evidence and reject aggregate overflow', () => {
  const next = { ...report, query: 'Snacks', products: [{ ...product, evidence: [{ sha256: 'c'.repeat(64), retrievedAt: '2026-10-09T10:00:00Z' }] }] };
  const [merged] = buildProductPicker([report, next]);
  assert.equal(merged.listings.length, 2);
  assert.equal(merged.listings[0].candidate.evidence[0].sha256, 'a'.repeat(64));
  assert.equal(merged.listings[1].candidate.evidence[0].sha256, 'c'.repeat(64));
  assert.equal(buildProductPicker([report, { ...next, products: [{ ...next.products[0], unitPriceDisplay: 'kg = 6.40' }] }]).length, 2);
  const reports = Array.from({ length: 14 }, (_, index) => ({ ...report, query: `Query ${index}`, products: [{ ...product, nativeListingRef: `de.aldiNord.android:id/product_tile_promotion_${index}` }] }));
  assert.equal(buildProductPicker(reports).length, 14);
  assert.throws(() => buildProductPicker(Array.from({ length: 17 }, () => report)));
  const many = Array.from({ length: 4 }, (_, batch) => ({ ...report, products: Array.from({ length: 100 }, (_, index) => ({ ...product, nativeListingRef: `de.aldiNord.android:id/product_tile_promotion_${batch * 100 + index}` })) }));
  assert.throws(() => buildProductPicker(many));
});
test('capture display chooses latest instant across timezone offsets', () => {
  const captured = { ...report, products: [{ ...product, evidence: [
    { sha256: 'a'.repeat(64), retrievedAt: '2026-10-08T10:30:00+02:00' },
    { sha256: 'b'.repeat(64), retrievedAt: '2026-10-08T09:00:00Z' }
  ] }] };
  assert.equal(buildProductPicker([captured])[0].listings[0].retrievedAt, '2026-10-08T09:00:00Z');
});

test('mixed server allowlist projections round-trip through client import and picker', () => {
  const leaflet = { offerViewVersion: 1, mode: 'advertised_candidates', storeId: 'edeka-074601', rankingEnabled: false, inventoryComplete: false, captureManifestSha256: 'a'.repeat(64), leafletSha256: 'b'.repeat(64), validFrom: '2026-10-05', validTo: '2026-10-10', retrievedAt: '2026-10-08T18:02:54Z', reviewMethod: 'Synthetic test fixture', candidates: [{ id: 'milk', category: 'milk', productName: 'Fixture milk', page: 1, packQuantity: 1000, unit: 'ml', priceCents: 100, depositCents: null, conditions: 'Review pending', remainingReview: ['deposit'], comparisonEligible: false }] };
  const serverReports = [leaflet, report].map(value => parseAppReport(JSON.stringify(value)));
  assert.equal(serverReports[0].mode, undefined);
  const clientReports = serverReports.map(value => parseAppReport(JSON.stringify(value)));
  assert.equal(buildProductPicker(clientReports).length, 2);
  assert.throws(() => parseAppReport(JSON.stringify({ ...serverReports[0], mode: 'untrusted' })));
  assert.throws(() => parseAppReport(JSON.stringify({ ...serverReports[0], rankingEnabled: true })));
});
