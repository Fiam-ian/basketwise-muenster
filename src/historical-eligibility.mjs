import { parseAuditReport } from './audit-view.mjs';

const DAY = 86400000;
const units = new Set(['g', 'ml', 'count']);
const bases = new Set(['net', 'drained', 'count']);
const token = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 120;
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value ? Date.parse(value + 'T00:00:00Z') : null;
const compatible = (unit, basis) => units.has(unit) && bases.has(basis) && (unit === 'count' ? basis === 'count' : basis !== 'count');
const tags = value => Array.isArray(value) && value.length <= 20 && value.every(token) && new Set(value).size === value.length;
function fail(code) { const error = new Error('Invalid historical eligibility input: ' + code); error.code = code; throw error; }
function cents(value) {
  const string = String(value);
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(string)) return null;
  const [whole, fraction = ''] = string.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(result) ? result : null;
}
const locationId = raw => raw.location_id ?? raw.location?.id;
const productCode = raw => raw.product_code ?? raw.product?.code;
const identity = raw => JSON.stringify([locationId(raw), productCode(raw)]);
const identityValid = raw => Number.isSafeInteger(locationId(raw)) && locationId(raw) > 0 && text(productCode(raw)) &&
  (raw.location_id == null || raw.location?.id == null || raw.location_id === raw.location.id) &&
  (raw.product_code == null || raw.product?.code == null || raw.product_code === raw.product.code) &&
  (raw.product_id == null || raw.product?.id == null || raw.product_id === raw.product.id) &&
  (raw.location_osm_id == null || raw.location?.osm_id == null || raw.location_osm_id === raw.location.osm_id) &&
  (raw.location_osm_type == null || raw.location?.osm_type == null || raw.location_osm_type === raw.location.osm_type) &&
  (raw.proof_id == null || raw.proof?.id == null || raw.proof_id === raw.proof.id);
function url(value) { try { return new URL(value).protocol === 'https:'; } catch { return false; } }

/** Pure, bounded eligibility diagnostics. Reviewed assertions are local evidence, not authenticated prices. */
export function auditHistoricalEligibility(report, review, registry, { reportSha256 } = {}) {
  const parsed = parseAuditReport(JSON.stringify(report));
  if (!review || review.auditReviewVersion !== 1 || !/^[a-f0-9]{64}$/.test(reportSha256 ?? '') || review.reportSha256 !== reportSha256) fail('REPORT_HASH_MISMATCH');
  const shoppingTime = date(review.shoppingDate);
  if (shoppingTime === null || !Number.isInteger(review.maxAgeDays) || review.maxAgeDays < 0 || review.maxAgeDays > 365 || typeof review.allowMembership !== 'boolean') fail('INVALID_POLICY');
  const basket = review.basket;
  if (!basket || !token(basket.version) || !Array.isArray(basket.items) || basket.items.length < 1 || basket.items.length > 30) fail('INVALID_BASKET');
  const ids = new Set(), merged = new Map();
  for (const item of basket.items) {
    if (!item || !token(item.id) || ids.has(item.id) || !token(item.category) || !positive(item.quantity) || !compatible(item.unit, item.basis) || !(item.brand === null || text(item.brand)) || !tags(item.requiredTags)) fail('INVALID_BASKET_ITEM');
    ids.add(item.id);
    const key = JSON.stringify([item.category, item.unit, item.basis, item.brand, [...item.requiredTags].sort()]);
    if (merged.has(key)) { merged.get(key).quantity += item.quantity; if (!positive(merged.get(key).quantity)) fail('INVALID_QUANTITY'); }
    else merged.set(key, { ...item });
  }
  if (!Array.isArray(review.recordReviews) || review.recordReviews.length > 300) fail('INVALID_RECORD_REVIEWS');
  const reviews = new Map(), recordIds = new Set(report.observations.map(value => value.providerRecordId));
  for (const entry of review.recordReviews) {
    if (!entry || typeof entry.providerRecordId !== 'string' || !recordIds.has(entry.providerRecordId) || reviews.has(entry.providerRecordId) || typeof entry.reviewed !== 'boolean') fail('INVALID_RECORD_REVIEW');
    if (entry.reviewed && (entry.priceBasis !== 'per_pack' || typeof entry.priceIsDiscounted !== 'boolean' || !(entry.discountType === null || ['SALE', 'LOYALTY_PROGRAM'].includes(entry.discountType)) || !token(entry.category) || !(entry.brand === null || text(entry.brand)) || !tags(entry.tags) || !positive(entry.packQuantity) || !compatible(entry.unit, entry.basis) || !(entry.depositCents === null || (Number.isSafeInteger(entry.depositCents) && entry.depositCents >= 0)) || typeof entry.requiresMembership !== 'boolean' || typeof entry.conditionsReviewed !== 'boolean' || typeof entry.sourceEvidenceReviewed !== 'boolean')) fail('INVALID_RECORD_REVIEW');
    reviews.set(entry.providerRecordId, entry);
  }
  if (!registry || !Array.isArray(registry.stores) || !Array.isArray(registry.reviewedProviderLocationMappings) || registry.reviewedProviderLocationMappings.length > 100) fail('INVALID_REGISTRY');
  const mappings = registry.reviewedProviderLocationMappings;
  const mappingIds = new Set();
  for (const mapping of mappings) {
    if (mapping.provider !== 'open-prices' || !Number.isSafeInteger(mapping.providerLocationId) || mapping.providerLocationId <= 0 || mappingIds.has(mapping.providerLocationId) || !token(mapping.storeId) || !registry.stores.some(store => store.id === mapping.storeId) || date(mapping.reviewedOn) === null || mapping.reviewKind !== 'manual-public-address-cross-check' || !url(mapping.officialSourceUrl) || !url(mapping.osm?.sourceUrl) || !['WAY','NODE','RELATION'].includes(mapping.osm?.type) || !Number.isSafeInteger(mapping.osm?.id) || mapping.osm.id <= 0) fail('INVALID_BRANCH_MAPPING');
    mappingIds.add(mapping.providerLocationId);
  }
  const latest = new Map();
  for (const observation of report.observations) {
    const time = date(observation.raw.date);
    if (identityValid(observation.raw) && observation.raw.type === 'PRODUCT' && time !== null && time <= shoppingTime) latest.set(identity(observation.raw), Math.max(time, latest.get(identity(observation.raw)) ?? -Infinity));
  }
  const branchIds = [...new Set(mappings.map(mapping => mapping.storeId))];
  const branches = branchIds.map(storeId => {
    const records = report.observations.filter(observation => mappings.some(mapping => mapping.storeId === storeId && mapping.providerLocationId === locationId(observation.raw)));
    const lines = [...merged.values()].map((item, index) => {
      const exclusions = {}, candidates = [];
      const exclude = reason => { exclusions[reason] = (exclusions[reason] ?? 0) + 1; };
      // Missing reviews are candidates for every line: unknown matching is never absence evidence.
      const applicable = records.filter(observation => !reviews.get(observation.providerRecordId)?.reviewed || reviews.get(observation.providerRecordId).category === item.category);
      for (const observation of applicable) {
        const raw = observation.raw, entry = reviews.get(observation.providerRecordId);
        const mapping = mappings.find(value => value.providerLocationId === locationId(raw));
        const time = date(raw.date);
        let reason;
        if (!identityValid(raw)) reason = 'identity_mismatch';
        else if (raw.type !== 'PRODUCT') reason = 'unsupported_record_type';
        else if (raw.duplicate_of != null) reason = 'provider_duplicate';
        else if (!raw.location || raw.location.osm_type !== mapping.osm.type || raw.location.osm_id !== mapping.osm.id) reason = 'branch_evidence_mismatch';
        else if (time === null) reason = 'invalid_observation_date';
        else if (time > shoppingTime) reason = 'future_observation';
        else if (time < latest.get(identity(raw))) reason = 'superseded_observation';
        else if ((shoppingTime - time) / DAY > review.maxAgeDays) reason = 'stale_observation';
        else if (!entry?.reviewed) reason = 'unreviewed_product';
        else if (!entry.sourceEvidenceReviewed) reason = 'unreviewed_source_evidence';
        else if (!Number.isSafeInteger(raw.proof_id ?? raw.proof?.id) || (raw.proof_id ?? raw.proof?.id) <= 0) reason = 'missing_source_evidence';
        else if (entry.unit !== item.unit) reason = 'unit_mismatch';
        else if (entry.basis !== item.basis) reason = 'basis_mismatch';
        else if (item.brand !== null && item.brand !== entry.brand) reason = 'brand_mismatch';
        else if (!item.requiredTags.every(tag => entry.tags.includes(tag))) reason = 'constraint_mismatch';
        else if (!entry.conditionsReviewed) reason = 'unreviewed_conditions';
        else if (typeof raw.price_is_discounted !== 'boolean' || raw.price_is_discounted !== entry.priceIsDiscounted || (raw.discount_type ?? null) !== entry.discountType || (raw.price_is_discounted ? !['SALE', 'LOYALTY_PROGRAM'].includes(raw.discount_type) : raw.discount_type != null)) reason = 'discount_evidence_mismatch';
        else if (raw.discount_type === 'LOYALTY_PROGRAM' && !entry.requiresMembership) reason = 'membership_evidence_mismatch';
        else if (raw.price_per != null) reason = 'unsupported_price_basis';
        else if (entry.requiresMembership && !review.allowMembership) reason = 'membership_required';
        else if (entry.depositCents === null) reason = 'unknown_deposit';
        else if (raw.currency !== 'EUR' || cents(raw.price) === null) reason = 'invalid_eur_price';
        else if (raw.product?.product_quantity == null || Number(raw.product.product_quantity) !== entry.packQuantity || raw.product.product_quantity_unit !== entry.unit) reason = 'pack_evidence_mismatch';
        if (reason) exclude(reason); else candidates.push(observation);
      }
      let eligibleCount = 0;
      const eligibleDates = new Map();
      for (const observation of candidates) {
        const peers = records.filter(peer => identity(peer.raw) === identity(observation.raw) && peer.raw.date === observation.raw.date);
        const fingerprints = peers.map(peer => {
          const entry = reviews.get(peer.providerRecordId);
          return JSON.stringify([identityValid(peer.raw),Number.isSafeInteger(peer.raw.proof_id ?? peer.raw.proof?.id) && (peer.raw.proof_id ?? peer.raw.proof?.id) > 0,peer.raw.location?.osm_type,peer.raw.location?.osm_id,cents(peer.raw.price),peer.raw.currency,peer.raw.product?.product_quantity,peer.raw.product?.product_quantity_unit,entry?.reviewed,entry?.packQuantity,entry?.unit,entry?.basis,entry?.depositCents,entry?.requiresMembership,entry?.conditionsReviewed,entry?.sourceEvidenceReviewed,entry?.category,entry?.brand,entry?.tags?.slice().sort(),entry?.priceIsDiscounted,entry?.discountType,peer.raw.type,peer.raw.duplicate_of,peer.raw.price_per,peer.raw.price_is_discounted,peer.raw.price_without_discount,peer.raw.discount_type]);
        });
        if (new Set(fingerprints).size > 1) exclude('same_day_conflict');
        else {
          eligibleCount++;
          eligibleDates.set(observation.raw.date, (eligibleDates.get(observation.raw.date) ?? 0) + 1);
        }
      }
      const eligibleDateProfile = [...eligibleDates.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([observedOn, observationCount]) => ({ observedOn, ageDays: (shoppingTime - date(observedOn)) / DAY, observationCount }));
      return {
        lineNumber: index + 1,
        requestedQuantity: item.quantity,
        unit: item.unit,
        basis: item.basis,
        candidateCount: applicable.length,
        eligibleCount,
        covered: eligibleCount > 0,
        eligibleDateProfile,
        mixesEligibleObservationDates: eligibleDateProfile.length > 1,
        exclusions
      };
    });
    const coveredLineCount = lines.filter(line => line.covered).length;
    return {storeId, lines, coveredLineCount, missingLineCount: lines.length - coveredLineCount};
  });
  return {
    eligibilityAuditVersion: 1,
    evidenceKind: 'historical-eligibility-only',
    currentPriceEligible: false,
    rankingEnabled: false,
    mode: 'historical_diagnostic',
    depositPolicy: 'known_reviewed_deposit_required',
    provenance: 'local_report_and_review_unverified',
    meaning: 'Source and review assertions are unverified. Line eligibility does not establish checkout cost, current price validity, stock or route feasibility. Zero eligible evidence does not establish product absence.',
    shoppingDate: review.shoppingDate,
    maxAgeDays: review.maxAgeDays,
    allowMembership: review.allowMembership,
    reportRecordCount: parsed.recordCount,
    unmappedRecordCount: report.observations.filter(observation => !mappingIds.has(locationId(observation.raw))).length,
    truncated: parsed.truncated,
    basketVersion: basket.version,
    requestedLineCount: basket.items.length,
    mergedLineCount: merged.size,
    branches
  };
}
