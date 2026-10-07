const DAY_MS = 86400000;

function calendarTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const milliseconds = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 10) !== value) return null;
  return milliseconds;
}

const missing = value => value === null || value === undefined || value === '';

/** Count historical provider observations. No date count establishes a current offer. */
export function summarizeCoverage(observations, { shoppingDate, recentDays = 14 } = {}) {
  if (!Array.isArray(observations)) throw new TypeError('observations must be an array.');
  const shoppingTime = calendarTime(shoppingDate);
  if (shoppingTime === null) throw new TypeError('shoppingDate must be a real ISO calendar date.');
  if (!Number.isInteger(recentDays) || recentDays < 1 || recentDays > 366) throw new TypeError('recentDays must be an integer between 1 and 366.');
  const recentSince = new Date(shoppingTime - (recentDays - 1) * DAY_MS).toISOString().slice(0, 10);
  const locations = new Set();
  const products = new Set();
  const recordIds = new Set();
  const dates = [];
  let duplicateRecordIds = 0;
  const freshness = { recent: 0, older: 0, future: 0, missing: 0, invalid: 0 };
  const nullRequiredFields = { providerRecordId: 0, locationId: 0, productCode: 0, observedDate: 0, price: 0, currency: 0, proofId: 0, packQuantity: 0, packUnit: 0 };
  for (const observation of observations) {
    const raw = observation?.raw && typeof observation.raw === 'object' ? observation.raw : {};
    const recordId = observation?.providerRecordId ?? raw.id;
    const locationId = raw.location_id ?? raw.location?.id;
    const productCode = raw.product_code ?? raw.product?.code;
    const observedDate = raw.date ?? observation?.observedOn;
    const values = {
      providerRecordId: recordId, locationId, productCode, observedDate,
      price: raw.price, currency: raw.currency, proofId: raw.proof_id ?? raw.proof?.id,
      packQuantity: raw.product?.product_quantity,
      packUnit: raw.product?.product_quantity_unit,
    };
    for (const [field, value] of Object.entries(values)) if (missing(value)) nullRequiredFields[field]++;
    if (!missing(recordId)) {
      if (recordIds.has(String(recordId))) duplicateRecordIds++;
      recordIds.add(String(recordId));
    }
    if (Number.isInteger(locationId) && locationId > 0) locations.add(locationId);
    if (typeof productCode === 'string' && productCode.trim()) products.add(productCode.trim());
    if (missing(observedDate)) { freshness.missing++; continue; }
    const observedTime = calendarTime(observedDate);
    if (observedTime === null) { freshness.invalid++; continue; }
    dates.push(observedDate);
    const ageDays = (shoppingTime - observedTime) / DAY_MS;
    if (ageDays < 0) freshness.future++;
    else if (ageDays < recentDays) freshness.recent++;
    else freshness.older++;
  }
  dates.sort();
  return {
    shoppingDate, calendarBasis: 'UTC calendar dates', recentDays, recentSince,
    observationCount: observations.length,
    distinctProviderRecordCount: recordIds.size,
    duplicateRecordIds,
    distinctLocationCount: locations.size,
    distinctProductCodeCount: products.size,
    earliestObservedDate: dates[0] ?? null,
    latestObservedDate: dates.at(-1) ?? null,
    freshness, nullRequiredFields,
    meaning: 'Historical observation counts only; neither current-price validity, verified branch applicability, stock nor complete shopping-list coverage is established.',
  };
}
