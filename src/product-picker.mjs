import { parseAppReport, isNativeReport, APP_REPORT_LIMIT, nativeSourceLabel } from './native-app-data.mjs';
import { parseOfferView, inspectOfferCoverage, isOfferDate } from './offer-view.mjs';
const normalize = value => value.normalize('NFKC').toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fail = () => { throw new Error('Unsupported product selection.'); };

/** Captured listing identity is deliberately distinct from a verified canonical SKU. */
export function buildProductPicker(reports) {
  if (!Array.isArray(reports) || reports.length > APP_REPORT_LIMIT) fail();
  const parsed = reports.map(report => {
    if (isNativeReport(report)) return parseAppReport(JSON.stringify(report));
    if (report?.mode != null && report.mode !== 'advertised_candidates') fail();
    return parseOfferView(JSON.stringify({ ...report, mode: 'advertised_candidates' }));
  });
  inspectOfferCoverage(parsed.filter(report => !isNativeReport(report)));
  const products = new Map();
  for (const report of parsed) {
    if (isNativeReport(report)) {
      for (const candidate of report.products) {
        const lidl = report.priceChannel === 'lidl_app_guest_offers';
        const id = JSON.stringify([report.mode, report.branchDisplay ?? null, candidate.nativeListingRef ?? candidate.productName,
          candidate.productName, candidate.packDisplay, candidate.priceCents, candidate.brandDisplay ?? '', candidate.flagsDisplay ?? [], candidate.priceFootnoteDisplay ?? '', candidate.unitPriceDisplay ?? '', candidate.priceConflicted,
          ...(lidl ? [candidate.normalPriceCents, candidate.lidlPlusPriceCents, candidate.referencePriceCents, candidate.priceAndPackDisplay, candidate.validityDisplay] : [])]);
        if (!products.has(id)) products.set(id, { id, name: candidate.productName, category: 'unclassified', brandDisplay: candidate.brandDisplay ?? '', packDisplay: candidate.packDisplay, native: true, listings: [], comparisonEligible: false, inventoryVerified: false });
        products.get(id).listings.push({ storeId: lidl ? 'lidl-friedrich-ebert-context' : report.priceChannel === 'pickup' ? 'rewe-pickup-metzer-context' : 'aldi-unmapped', storeName: lidl ? 'Lidl · Münster-Friedrich-Ebert-Straße' : report.priceChannel === 'pickup' ? 'REWE pickup · Metzer Str. 62–64' : 'ALDI Nord · branch unverified', channelLabel: nativeSourceLabel(report, candidate), priceChannel: report.priceChannel, validFrom: null, validTo: null, retrievedAt: candidate.evidence.reduce((latest, source) => !latest || Date.parse(source.retrievedAt) > Date.parse(latest) ? source.retrievedAt : latest, ''), candidate, branchApplicabilityVerified: false });
      }
      continue;
    }
    for (const candidate of report.candidates) {
    // A shared publication merges identical commercial fields; retain separate review records.
    const id = JSON.stringify([report.leafletSha256, candidate.page, candidate.category, candidate.productName, candidate.packQuantity, candidate.unit, candidate.priceCents, candidate.depositCents, candidate.fatBasisPoints, candidate.packAmbiguity, candidate.depositDisplay, candidate.conditions]);
    if (!products.has(id)) products.set(id, { id, name: candidate.productName, category: candidate.category,
      packQuantity: candidate.packQuantity, unit: candidate.unit, fatBasisPoints: candidate.fatBasisPoints,
      packAmbiguity: candidate.packAmbiguity, listings: [], comparisonEligible: false, inventoryVerified: false });
    products.get(id).listings.push({ storeId: report.storeId, storeName: report.storeName, address: report.address,
      sourceUrl: report.sourceUrl, leafletLabel: report.leafletLabel, validFrom: report.validFrom,
      validTo: report.validTo, retrievedAt: report.retrievedAt, candidate });
  }
  }
  if (products.size > 300) fail();
  return [...products.values()];
}
export function searchPickerProducts(products, query = '', category = '') {
  if (!Array.isArray(products) || products.length > 300 || typeof query !== 'string' || query.length > 100 || typeof category !== 'string') fail();
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const aliases = { milk: 'milk milch', pasta: 'pasta nudeln', tomatoes: 'tomatoes tomaten produce gemuse', water: 'water wasser', eggs: 'eggs eier', oats: 'oats haferflocken' };
  return products.filter(product => (!category || product.category === category) && words.every(word => normalize(`${product.name} ${product.brandDisplay ?? ''} ${product.packDisplay ?? ''} ${aliases[product.category] ?? product.category}`).includes(word)));
}
export function addPickedProduct(list, product) {
  if (!Array.isArray(list) || list.length > 50 || !product || typeof product.id !== 'string' || product.comparisonEligible !== false) fail();
  const next = list.map(line => {
    if (!line.product || !Number.isSafeInteger(line.count) || line.count < 1 || line.count > 99) fail();
    return { ...line };
  });
  const existing = next.find(line => line.product.id === product.id);
  if (existing) { if (existing.count === 99) fail(); existing.count++; }
  else { if (next.length === 50) fail(); next.push({ product, count: 1 }); }
  return next;
}
export function changePickedQuantity(list, id, count) {
  if (!Array.isArray(list) || !Number.isSafeInteger(count) || count < 0 || count > 99) fail();
  if (!list.some(line => line.product.id === id)) fail();
  return list.flatMap(line => line.product.id === id ? (count ? [{ ...line, count }] : []) : [{ ...line }]);
}
export function pickedBasketCoverage(reports, list, shoppingDate) {
  if (!isOfferDate(shoppingDate) || !Array.isArray(list) || list.length > 50) fail();
  const available = buildProductPicker(reports);
  const branches = [...new Map(available.flatMap(product => product.listings.map(listing => [listing.storeId, { storeId: listing.storeId, storeName: listing.storeName, native: !!product.native }]))).values()];
  return branches.map(branch => ({ ...branch, requestedLines: list.length,
    capturedLines: list.filter(line => available.some(product => product.id === line.product.id && product.listings.some(listing => listing.storeId === branch.storeId))).length,
    inPeriodLines: list.filter(line => available.some(product => product.id === line.product.id && product.listings.some(listing => listing.storeId === branch.storeId && listing.validFrom != null && listing.validTo != null && listing.validFrom <= shoppingDate && shoppingDate <= listing.validTo))).length,
    eligibleLines: 0, complete: false, checkoutCents: null }));
}
