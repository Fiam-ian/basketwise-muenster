import { parseOfferView, OFFER_VIEW_MAX_BYTES, isOfferDate } from './offer-view.mjs';
export const APP_REPORT_LIMIT = 16;
const fail = () => { throw new Error('Unsupported native catalogue report.'); };
const text = (value, max = 500) => { if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f]/.test(value)) fail(); return value; };
const stamp = value => { text(value, 50); if (!isOfferDate(value.slice(0, 10)) || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) fail(); return value; };
const hash = value => { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail(); return value; };
const branchDisplay = 'Abholen | Metzer Str. 62-64, 48151 Münster / Geist';
/** Narrow public display projection: never return arbitrary account/source fields or local filenames. */
export function parseNativeAppReport(input) {
  if (typeof input !== 'string' || new TextEncoder().encode(input).length > OFFER_VIEW_MAX_BYTES) fail();
  let report; try { report = JSON.parse(input); } catch { fail(); }
  const aldi = report?.mode === 'aldi_app_candidates';
  if (report?.schemaVersion !== 1 || (!aldi && report?.mode !== 'android_pickup_candidates') || report.package !== (aldi ? 'de.aldiNord.android' : 'de.rewe.app.mobile') || report.priceChannel !== (aldi ? 'aldi_app_unmapped_branch' : 'pickup')) fail();
  if (report.validFrom !== null || report.validTo !== null || report.stockVerified !== false || report.catalogueComplete !== false || report.branchApplicabilityVerified !== false) fail();
  if (aldi ? report.branch !== null || report.currency !== 'EUR' : report.branchDisplay !== branchDisplay) fail();
  const context = aldi ? null : hash(report.branchContextSha256);
  if (!Array.isArray(report.products) || report.products.length > 100) fail();
  const products = report.products.map(product => {
    if (product.comparisonEligible !== false || product.inventoryVerified !== false || product.depositCents !== null || typeof product.priceConflicted !== 'boolean' || !Number.isSafeInteger(product.priceCents) || product.priceCents < 0 || product.priceCents > 1000000 || !Array.isArray(product.evidence) || !product.evidence.length || product.evidence.length > 30) fail();
    const evidence = product.evidence.map(source => ({ sha256: hash(source.sha256), retrievedAt: stamp(source.retrievedAt) }));
    const result = { productName: text(product.productName), packDisplay: text(aldi ? product.packDisplay : (product.packAndLabelsDisplay ?? product.packDisplay)), priceCents: product.priceCents, priceConflicted: product.priceConflicted, evidence, depositCents: null, comparisonEligible: false, inventoryVerified: false };
    if (aldi) {
      if (!['article', 'promotion'].includes(product.nativeListingKind) || !new RegExp(`^de\\.aldiNord\\.android:id/product_tile_${product.nativeListingKind}_\\d+$`).test(product.nativeListingRef)) fail();
      result.nativeListingRef = product.nativeListingRef; result.nativeListingKind = product.nativeListingKind;
      for (const key of ['brandDisplay', 'unitPriceDisplay', 'priceFootnoteDisplay']) result[key] = product[key] == null || product[key] === '' ? '' : text(product[key]);
      if (!Array.isArray(product.flagsDisplay) || product.flagsDisplay.length > 20) fail();
      result.flagsDisplay = product.flagsDisplay.map(value => text(value));
    }
    return result;
  });
  return { schemaVersion: 1, mode: report.mode, package: report.package, priceChannel: report.priceChannel,
    query: text(report.query, 100), generatedAt: stamp(report.generatedAt), branch: null,
    ...(aldi ? { currency: 'EUR' } : { branchDisplay, branchContextSha256: context }),
    branchApplicabilityVerified: false, validFrom: null, validTo: null, stockVerified: false, catalogueComplete: false, products };
}
export function parseAppReport(input) {
  let mode; try { mode = JSON.parse(input)?.mode; } catch { fail(); }
  if (['aldi_app_candidates', 'android_pickup_candidates'].includes(mode)) return parseNativeAppReport(input);
  // The existing leaflet allowlist projection omits mode; restore only its known schema.
  const report = JSON.parse(input);
  if (mode === undefined && report?.offerViewVersion === 1) return parseOfferView(JSON.stringify({ ...report, mode: 'advertised_candidates' }));
  return parseOfferView(input);
}
export const isNativeReport = report => ['aldi_app_candidates', 'android_pickup_candidates'].includes(report?.mode);
export function nativeSourceLabel(report, product) {
  return report.priceChannel === 'pickup' ? 'REWE pickup' : product?.nativeListingKind === 'promotion' ? 'ALDI app promotion · branch unverified' : 'ALDI app assortment · branch unverified';
}
