import { summarizeCoverage } from "./coverage.mjs";

export const AUDIT_MAX_BYTES = 2 * 1024 * 1024;
export const AUDIT_MAX_RECORDS = 300;
const DAY_MS = 86400000;
const ATTRIBUTION = "Open Prices / Open Food Facts";
const PRICE_URL = "https://prices.openfoodfacts.org/api/v1/prices";
const MISSING_FIELDS = [
  "providerRecordId", "locationId", "productCode", "observedDate",
  "price", "currency", "proofId", "packQuantity", "packUnit"
];

export class AuditViewError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AuditViewError";
    this.code = code;
  }
}

function reject(code, message) { throw new AuditViewError(code, message); }
function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function integer(value, minimum, maximum) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}
function calendar(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const milliseconds = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().slice(0, 10) === value
    ? milliseconds : null;
}
function timestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value ? milliseconds : null;
}
function utf8Bytes(value) {
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}
function optionalText(value, maximum) {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > maximum) reject("INVALID_RECORD", "An observation field has an invalid type or size.");
  return value;
}
function optionalId(value) {
  if (value == null || value === "") return null;
  if (!integer(value, 1, Number.MAX_SAFE_INTEGER)) reject("INVALID_RECORD", "An observation identifier is invalid.");
  return value;
}
function optionalNumber(value) {
  if (value == null || value === "") return null;
  if (!(typeof value === "number" || (typeof value === "string" && value.length <= 64 && value.trim())) ||
      !Number.isFinite(Number(value)) || Number(value) < 0) reject("INVALID_RECORD", "An observation number is invalid.");
  return value;
}
function requestParameters(url) {
  if (typeof url !== "string" || url.length > 2048 || !url.startsWith(PRICE_URL + "?") || url.includes("#")) {
    reject("INVALID_PROVENANCE", "Report requests must use the expected Open Prices list endpoint.");
  }
  const result = {};
  const allowed = new Set(["lat", "lon", "radius_km", "currency", "size", "page", "date__gte"]);
  for (const part of url.slice(PRICE_URL.length + 1).split("&")) {
    const split = part.indexOf("=");
    if (split < 1) reject("INVALID_PROVENANCE", "A report request parameter is malformed.");
    let key, value;
    try {
      key = decodeURIComponent(part.slice(0, split).replace(/\+/g, " "));
      value = decodeURIComponent(part.slice(split + 1).replace(/\+/g, " "));
    } catch { reject("INVALID_PROVENANCE", "A report request parameter is malformed."); }
    if (!allowed.has(key) || Object.prototype.hasOwnProperty.call(result, key) || !value.trim()) {
      reject("INVALID_PROVENANCE", "Unexpected or repeated report request parameters.");
    }
    result[key] = value;
  }
  if (Object.keys(result).length !== allowed.size) reject("INVALID_PROVENANCE", "Report request parameters are incomplete.");
  return result;
}

/**
 * Parse a local, untrusted audit-v1 report into aggregate-only diagnostic data.
 * No network, storage, raw records, owners, proof URLs, prices or product IDs
 * leave this boundary. Uploaded summaries are ignored and counts recomputed.
 * Structural consistency is not independent verification of the reported fetch.
 */
export function parseAuditReport(jsonText, { maxBytes = AUDIT_MAX_BYTES, maxRecords = AUDIT_MAX_RECORDS } = {}) {
  if (!integer(maxBytes, 1, AUDIT_MAX_BYTES) || !integer(maxRecords, 0, AUDIT_MAX_RECORDS)) {
    reject("INVALID_LIMIT", "Audit upload limits must remain within the bounded maximum.");
  }
  if (typeof jsonText !== "string") reject("INVALID_INPUT", "Provide the local report as JSON text.");
  if (jsonText.length > maxBytes || utf8Bytes(jsonText) > maxBytes) reject("TOO_LARGE", "The local audit report exceeds the size limit.");
  let report;
  try { report = JSON.parse(jsonText); }
  catch { reject("INVALID_JSON", "The local audit report is not valid JSON."); }
  if (!object(report) || report.auditVersion !== 1 || report.referenceDateBasis !== "Europe/Berlin" ||
      report.attribution !== ATTRIBUTION || report.license !== "ODbL-1.0") {
    reject("INVALID_REPORT", "The report version or provenance metadata is unsupported.");
  }
  const generatedTime = timestamp(report.generatedAt);
  const window = report.queriedWindow;
  const limits = report.limits;
  const query = report.query;
  if (generatedTime === null || !object(window) || !object(limits) || !object(query)) {
    reject("INVALID_REPORT", "The report is missing its retrieval, window, limits or query context.");
  }
  const sinceTime = calendar(window.sinceInclusive);
  const referenceTime = calendar(window.referenceDate);
  const recentDays = (referenceTime - sinceTime) / DAY_MS + 1;
  if (sinceTime === null || referenceTime === null || !integer(recentDays, 1, 366) ||
      window.upperDateFilterApplied !== false || query.observedSince !== window.sinceInclusive ||
      !Number.isFinite(query.lat) || Math.abs(query.lat) > 90 ||
      !Number.isFinite(query.lon) || Math.abs(query.lon) > 180 ||
      !Number.isFinite(query.radiusKm) || query.radiusKm <= 0 || query.radiusKm > 50 ||
      !integer(limits.maxPages, 1, 3) || !integer(limits.pageSize, 1, 100) ||
      limits.maximumRetainedRecords !== limits.maxPages * limits.pageSize) {
    reject("INVALID_REPORT", "The report query window or bounded query configuration is inconsistent.");
  }
  if (!Array.isArray(report.observations) || report.observations.length > maxRecords ||
      report.observations.length > limits.maximumRetainedRecords ||
      !integer(report.providerTotal, report.observations.length, Number.MAX_SAFE_INTEGER) ||
      typeof report.truncated !== "boolean" || !Array.isArray(report.requests) ||
      report.requests.length < 1 || report.requests.length > limits.maxPages ||
      report.observations.length > report.requests.length * limits.pageSize ||
      (!report.truncated && report.providerTotal !== report.observations.length) ||
      (report.truncated && (report.providerTotal <= report.observations.length ||
        report.requests.length !== limits.maxPages))) {
    reject("INVALID_REPORT", "The report counts, pagination or completeness metadata is inconsistent.");
  }
  const capturedCapacity = new Map();
  for (const [index, request] of report.requests.entries()) {
    if (!object(request)) reject("INVALID_PROVENANCE", "A report request is malformed.");
    const capturedTime = timestamp(request.capturedAt);
    const parameters = requestParameters(request.url);
    if (capturedTime === null || capturedTime > generatedTime ||
        Number(parameters.lat) !== query.lat || Number(parameters.lon) !== query.lon ||
        Number(parameters.radius_km) !== query.radiusKm || parameters.currency !== "EUR" ||
        Number(parameters.size) !== limits.pageSize || Number(parameters.page) !== index + 1 ||
        parameters.date__gte !== query.observedSince) {
      reject("INVALID_PROVENANCE", "Report requests disagree with the declared query or retrieval context.");
    }
    capturedCapacity.set(request.capturedAt, (capturedCapacity.get(request.capturedAt) ?? 0) + limits.pageSize);
  }
  const recordIds = new Set();
  const observations = report.observations.map(observation => {
    if (!object(observation) || observation.provider !== "open-prices" ||
        observation.attribution !== ATTRIBUTION || observation.license !== "ODbL-1.0" ||
        observation.validity !== "unconfirmed" || observation.eligibleAsActiveOffer !== false ||
        !object(observation.raw)) reject("INVALID_RECORD", "An observation wrapper is unsupported.");
    const raw = observation.raw;
    if (!integer(raw.id, 1, Number.MAX_SAFE_INTEGER) || observation.providerRecordId !== String(raw.id) ||
        observation.sourceUrl !== PRICE_URL + "/" + raw.id || recordIds.has(raw.id) ||
        !capturedCapacity.has(observation.capturedAt) || capturedCapacity.get(observation.capturedAt) <= 0 ||
        observation.observedOn !== (raw.date ?? null)) {
      reject("INVALID_PROVENANCE", "An observation disagrees with its record identity or page provenance.");
    }
    recordIds.add(raw.id);
    capturedCapacity.set(observation.capturedAt, capturedCapacity.get(observation.capturedAt) - 1);
    for (const nested of [raw.location, raw.product, raw.proof]) {
      if (nested != null && !object(nested)) reject("INVALID_RECORD", "An observation relation is malformed.");
    }
    const currency = optionalText(raw.currency, 16);
    if (currency !== null && currency !== "" && !/^[A-Z]{3}$/.test(currency)) {
      reject("INVALID_RECORD", "An observation currency is malformed.");
    }
    // Project only fields needed for counts and missingness; exclude raw owner/proof content.
    return {
      providerRecordId: observation.providerRecordId, observedOn: optionalText(observation.observedOn, 32),
      raw: {
        id: raw.id,
        location_id: optionalId(raw.location_id ?? raw.location?.id),
        product_code: optionalText(raw.product_code ?? raw.product?.code, 128),
        date: optionalText(raw.date, 32), price: optionalNumber(raw.price), currency,
        proof_id: optionalId(raw.proof_id ?? raw.proof?.id),
        product: {
          product_quantity: optionalNumber(raw.product?.product_quantity),
          product_quantity_unit: optionalText(raw.product?.product_quantity_unit, 32)
        }
      }
    };
  });
  const coverage = summarizeCoverage(observations, { shoppingDate: window.referenceDate, recentDays });
  const missingFields = Object.fromEntries(MISSING_FIELDS.map(field => [field, coverage.nullRequiredFields[field]]));
  return {
    recordCount: coverage.observationCount, locationCount: coverage.distinctLocationCount,
    productCount: coverage.distinctProductCodeCount, referenceDate: coverage.shoppingDate,
    oldestObservationDate: coverage.earliestObservedDate, newestObservationDate: coverage.latestObservedDate,
    freshness: {
      recent: coverage.freshness.recent, older: coverage.freshness.older, future: coverage.freshness.future,
      missing: coverage.freshness.missing, invalid: coverage.freshness.invalid
    },
    truncated: report.truncated, providerTotal: report.providerTotal, missingFields,
    recentDays: coverage.recentDays, recentSince: coverage.recentSince,
    requestedRadiusKm: query.radiusKm, requestCount: report.requests.length, generatedAt: report.generatedAt,
    provenance: "uploaded_report_unverified", currentPriceEligible: false
  };
}
