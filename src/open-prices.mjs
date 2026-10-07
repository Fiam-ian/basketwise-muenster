/** Read-only Open Prices boundary. Returned observations are NOT active offers. */
export const OPEN_PRICES_BASE_URL = 'https://prices.openfoodfacts.org';
export const OPEN_PRICES_DOCS_URL = 'https://openfoodfacts.github.io/documentation/docs/Open-prices/prices/prices_list/';

const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

/**
 * Retrieve bounded geographic EUR observations, retaining each raw provider record.
 * Pagination uses documented page/size parameters and response items/pages/total.
 * Observation dates never become validFrom/validTo. No writes or credentials.
 */
export async function fetchOpenPricesObservations({
  lat, lon, radiusKm = 3, observedSince = null,
  maxPages = 3, pageSize = 50, timeoutMs = 8000,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!inRange(lat, -90, 90) || !inRange(lon, -180, 180)) throw new TypeError('Valid latitude and longitude are required.');
  if (!inRange(radiusKm, 0.01, 30)) throw new TypeError('radiusKm must be between 0.01 and 30.');
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 5) throw new TypeError('maxPages must be an integer between 1 and 5.');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new TypeError('pageSize must be an integer between 1 and 100.');
  if (!inRange(timeoutMs, 1, 30000)) throw new TypeError('timeoutMs must be between 1 and 30000.');
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  if (observedSince !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(observedSince) || !Number.isFinite(Date.parse(observedSince)) || new Date(observedSince).toISOString().slice(0, 10) !== observedSince)) throw new TypeError('observedSince must be a real ISO calendar date.');

  const observations = [];
  const seen = new Set();
  const requests = [];
  let providerTotal = null;
  let truncated = false;
  for (let page = 1; page <= maxPages; page++) {
    const url = new URL('/api/v1/prices', OPEN_PRICES_BASE_URL);
    url.search = new URLSearchParams({ lat: String(lat), lon: String(lon), radius_km: String(radiusKm), currency: 'EUR', size: String(pageSize), page: String(page) }).toString();
    if (observedSince !== null) url.searchParams.set('date__gte', observedSince);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let payload;
    try {
      const response = await fetchImpl(url.toString(), { signal: controller.signal, headers: { Accept: 'application/json' }, credentials: 'omit' });
      if (!response.ok) throw new Error(`Open Prices request failed (${response.status}).`);
      payload = await response.json();
    } catch (error) {
      const failure = new Error(controller.signal.aborted ? 'Open Prices request timed out.' : `Open Prices unavailable: ${error.message}`);
      failure.cause = error;
      throw failure;
    } finally {
      clearTimeout(timer);
    }
    if (!payload || !Array.isArray(payload.items) || payload.items.length > pageSize || !Number.isInteger(payload.pages) || payload.pages < 0 || !Number.isInteger(payload.total) || payload.total < 0) throw new Error('Unsupported Open Prices response shape.');
    if (payload.total < payload.items.length || (payload.pages === 0 && (payload.total !== 0 || payload.items.length !== 0)) || (payload.total > 0 && payload.items.length === 0)) throw new Error('Inconsistent Open Prices pagination metadata.');
    providerTotal = payload.total;
    const capturedAt = new Date().toISOString();
    requests.push({ url: url.toString(), capturedAt });
    for (const raw of payload.items) {
      if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.id)) throw new Error('Unsupported Open Prices observation record.');
      if (seen.has(raw.id)) continue;
      seen.add(raw.id);
      observations.push({
        provider: 'open-prices', providerRecordId: String(raw.id),
        sourceUrl: `${OPEN_PRICES_BASE_URL}/api/v1/prices/${raw.id}`,
        capturedAt, observedOn: raw.date ?? null,
        validity: 'unconfirmed', eligibleAsActiveOffer: false,
        attribution: 'Open Prices / Open Food Facts',
        license: 'ODbL-1.0', raw,
      });
    }
    const morePages = page < payload.pages;
    if (!morePages) break;
    if (payload.items.length === 0) throw new Error('Open Prices pagination ended unexpectedly.');
    if (page === maxPages) truncated = true;
  }
  return {
    provider: 'open-prices', docsUrl: OPEN_PRICES_DOCS_URL,
    query: { lat, lon, radiusKm, observedSince },
    observations, requests, providerTotal, truncated,
    coverage: 'Only retrieved observations; no claim of complete or current Münster coverage.',
  };
}
