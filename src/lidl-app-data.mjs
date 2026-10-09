import { isOfferDate } from './offer-view.mjs';
const MAX_BYTES = 2 * 1024 * 1024;
const BRANCH = 'Münster-Friedrich-Ebert-Straße';
const fail = () => { throw new Error('Unsupported Lidl offer report.'); };
const plain = (value, max = 500) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) fail();
  return value.replace(/\s+/g, ' ').trim();
};
const hash = value => { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail(); return value; };
const stamp = value => {
  if (typeof value !== 'string' || value.length > 50 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !isOfferDate(value.slice(0, 10)) || !Number.isFinite(Date.parse(value))) fail();
  const clock = value.slice(11, 19).split(':').map(Number);
  if (clock[0] > 23 || clock[1] > 59 || clock[2] > 59) fail();
  return value;
};
const amount = value => { if (value !== null && (!Number.isSafeInteger(value) || value < 0 || value > 1000000)) fail(); return value; };
/** Display-only allowlist: commercial price roles never become a basket price. */
export function parseLidlAppReport(input) {
  if (typeof input !== 'string' || new TextEncoder().encode(input).length > MAX_BYTES) fail();
  let report; try { report = JSON.parse(input); } catch { fail(); }
  if (report?.schemaVersion !== 1 || report.mode !== 'lidl_app_offer_candidates' || report.package !== 'com.lidl.eci.lidlplus' || report.priceChannel !== 'lidl_app_guest_offers' || report.currency !== 'EUR' || report.branchApplicabilityVerified !== false || report.stockVerified !== false || report.catalogueComplete !== false) fail();
  if ((report.validFrom !== undefined && report.validFrom !== null) || (report.validTo !== undefined && report.validTo !== null)) fail();
  const branch = report.branchContext;
  if (branch?.branchDisplay !== BRANCH || branch.independentlyVerifiedOnProductScreens !== false) fail();
  const branchContext = { branchDisplay: BRANCH, branchContextSha256: hash(branch.branchContextSha256), branchAfterSha256: hash(branch.branchAfterSha256), independentlyVerifiedOnProductScreens: false };
  if (!Array.isArray(report.products) || report.products.length > 100) fail();
  const products = report.products.map(product => {
    if (product?.priceCents !== null || product.depositCents !== null || product.validFrom !== null || product.validTo !== null || product.comparisonEligible !== false || product.inventoryVerified !== false || !Array.isArray(product.evidence) || !product.evidence.length || product.evidence.length > 30) fail();
    return {
      productName: plain(product.productName), priceAndPackDisplay: plain(product.priceAndPackDisplay, 2000), validityDisplay: plain(product.validityDisplay, 500),
      normalPriceCents: amount(product.normalPriceCents), lidlPlusPriceCents: amount(product.lidlPlusPriceCents), referencePriceCents: amount(product.referencePriceCents),
      priceCents: null, depositCents: null, validFrom: null, validTo: null, comparisonEligible: false, inventoryVerified: false,
      packDisplay: 'Pack details in offer', brandDisplay: '', priceConflicted: false,
      evidence: product.evidence.map(source => ({ sha256: hash(source?.sha256), retrievedAt: stamp(source?.retrievedAt) })),
    };
  });
  return { schemaVersion: 1, mode: report.mode, package: report.package, priceChannel: report.priceChannel, currency: 'EUR', generatedAt: stamp(report.generatedAt), query: 'Captured offers', branch: null, branchContext, ...branchContext,
    branchApplicabilityVerified: false, stockVerified: false, catalogueComplete: false, validFrom: null, validTo: null, products };
}
