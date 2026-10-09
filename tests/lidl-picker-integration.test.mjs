import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductPicker, searchPickerProducts, addPickedProduct, pickedBasketCoverage } from '../src/product-picker.mjs';
import { parseAppReport } from '../src/native-app-data.mjs';
const fixture = () => ({ schemaVersion: 1, mode: 'lidl_app_offer_candidates', package: 'com.lidl.eci.lidlplus', priceChannel: 'lidl_app_guest_offers', currency: 'EUR', generatedAt: '2026-10-09T09:30:00.123456+00:00', branchApplicabilityVerified: false, stockVerified: false, catalogueComplete: false,
  branchContext: { branchDisplay: 'Münster-Friedrich-Ebert-Straße', branchContextSha256: 'a'.repeat(64), branchAfterSha256: 'b'.repeat(64), independentlyVerifiedOnProductScreens: false },
  products: [{ productName: 'Synthetic breakfast item', priceAndPackDisplay: 'Normalpreis 4,00 €\nLidl Plus 3,00 €\n1 kg = 8,00 €', validityDisplay: '09.10. – 10.10.', normalPriceCents: 400, lidlPlusPriceCents: 300, referencePriceCents: 800, priceCents: null, depositCents: null, validFrom: null, validTo: null, comparisonEligible: false, inventoryVerified: false, evidence: [{ file: 'private.xml', sha256: 'c'.repeat(64), retrievedAt: '2026-10-09T09:29:00Z' }] }] });

test('Lidl roles, pack conditions and recorded periods remain distinct selection identities', () => {
 const source=fixture(); const variants=[source,...['normalPriceCents','lidlPlusPriceCents','referencePriceCents','priceAndPackDisplay','validityDisplay'].map(key=>{const x=structuredClone(source); x.products[0][key]=typeof x.products[0][key]==='number'?x.products[0][key]+1:x.products[0][key]+' variant';return x;})];
 assert.equal(buildProductPicker(variants).length,6);
 const [same]=buildProductPicker([source,source]);assert.equal(same.listings.length,2);
 assert.equal(same.listings[0].storeId,'lidl-friedrich-ebert-context');
 assert.equal(same.listings[0].candidate.priceCents,null);
});
test('Yearless Lidl records do not supply dated coverage or checkout totals', () => {
 const source=fixture();const products=buildProductPicker([source]);const basket=addPickedProduct([],products[0]);
 const [coverage]=pickedBasketCoverage([source],basket,'2026-10-09');
 assert.equal(coverage.capturedLines,1);assert.equal(coverage.inPeriodLines,0);assert.equal(coverage.eligibleLines,0);assert.equal(coverage.checkoutCents,null);assert.equal(coverage.complete,false);
 assert.equal(searchPickerProducts(products,'breakfast').length,1);assert.equal(searchPickerProducts(products,'','oats').length,0);
});
test('API/client projection round trip preserves Lidl roles and strips private fields', () => {
 const raw=fixture();raw.account='PRIVATE_SENTINEL';raw.products[0].evidence[0].email='PRIVATE_SENTINEL';
 const server=parseAppReport(JSON.stringify(raw));const client=parseAppReport(JSON.stringify(server));assert.deepEqual(client,server);
 assert.equal(JSON.stringify(client).includes('PRIVATE_SENTINEL'),false);assert.equal(JSON.stringify(client).includes('private.xml'),false);
 const [product]=buildProductPicker([client]);assert.equal(product.listings[0].candidate.normalPriceCents,400);assert.equal(product.listings[0].candidate.lidlPlusPriceCents,300);
});
