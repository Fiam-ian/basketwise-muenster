import { EDEKA_PILOT_SOURCE } from './retailer-source.mjs';

export const OFFER_VIEW_MAX_BYTES = 2 * 1024 * 1024;
const fail = () => { throw new Error('Unsupported local offer report.'); };
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const text = (value, max = 500) => typeof value === 'string' && value.trim() && value.length <= max;
export function isOfferDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Allowlisted projection; imported reviews remain assertions, never optimizer offers. */
export function parseOfferView(input) {
  if (typeof input !== 'string' || new TextEncoder().encode(input).length > OFFER_VIEW_MAX_BYTES) fail();
  let report;
  try { report = JSON.parse(input); } catch { fail(); }
  if (!report || report.offerViewVersion !== 1 || report.storeId !== EDEKA_PILOT_SOURCE.storeId ||
      report.mode !== 'advertised_candidates' || report.rankingEnabled !== false || report.inventoryComplete !== false ||
      !hash(report.captureManifestSha256) || !hash(report.leafletSha256) ||
      !isOfferDate(report.validFrom) || !isOfferDate(report.validTo) || report.validFrom > report.validTo ||
      typeof report.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(report.retrievedAt) ||
      !Number.isFinite(Date.parse(report.retrievedAt)) || !text(report.reviewMethod) ||
      !Array.isArray(report.candidates) || report.candidates.length > 100) fail();
  const ids = new Set();
  const candidates = report.candidates.map(value => {
    if (!value || !text(value.id, 120) || ids.has(value.id) || !text(value.category, 60) ||
        !text(value.productName, 200) || !Number.isSafeInteger(value.page) || value.page < 1 || value.page > 100 ||
        !Number.isSafeInteger(value.priceCents) || value.priceCents < 0 || value.priceCents > 1000000 ||
        !Number.isFinite(value.packQuantity) || value.packQuantity <= 0 || value.packQuantity > 1000000 ||
        !['g', 'ml', 'count'].includes(value.unit) ||
        !(value.depositCents === null || Number.isSafeInteger(value.depositCents) && value.depositCents >= 0 && value.depositCents <= 1000000) ||
        !text(value.conditions) || value.comparisonEligible !== false || !Array.isArray(value.remainingReview) ||
        value.remainingReview.length > 20 || !value.remainingReview.every(item => text(item, 100)) ||
        !(value.fatBasisPoints == null || Number.isSafeInteger(value.fatBasisPoints) && value.fatBasisPoints >= 0 && value.fatBasisPoints <= 10000)) fail();
    ids.add(value.id);
    return { id: value.id, category: value.category, productName: value.productName, page: value.page,
      priceCents: value.priceCents, packQuantity: value.packQuantity, unit: value.unit,
      depositCents: value.depositCents, conditions: value.conditions,
      fatBasisPoints: value.fatBasisPoints ?? null,
      remainingReview: [...value.remainingReview], comparisonEligible: false };
  });
  return { offerViewVersion: 1, storeId: EDEKA_PILOT_SOURCE.storeId,
    storeName: 'EDEKA Rotthowe Aegidiimarkt', address: 'Aegidiimarkt 7, 48143 Münster',
    sourceUrl: EDEKA_PILOT_SOURCE.branchUrl, leafletUrl: EDEKA_PILOT_SOURCE.pdfUrl,
    validFrom: report.validFrom, validTo: report.validTo, retrievedAt: report.retrievedAt,
    captureManifestSha256: report.captureManifestSha256, leafletSha256: report.leafletSha256,
    reviewMethod: report.reviewMethod, candidates, rankingEnabled: false, inventoryComplete: false };
}

export function offerDateStatus(report, shoppingDate) {
  if (!isOfferDate(shoppingDate)) throw new Error('Choose a valid shopping date.');
  if (shoppingDate < report.validFrom) return 'Not yet advertised for this date';
  if (shoppingDate > report.validTo) return 'Advertised period has ended';
  return 'Within the recorded leaflet period';
}
