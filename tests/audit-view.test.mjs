import test from "node:test";
import assert from "node:assert/strict";
import { parseAuditReport, AuditViewError, AUDIT_MAX_BYTES } from "../src/audit-view.mjs";

const CAPTURE = "2026-10-07T12:00:00.000Z";
function observation(id = 1, date = "2026-09-26") {
  return {
    provider: "open-prices", providerRecordId: String(id),
    sourceUrl: "https://prices.openfoodfacts.org/api/v1/prices/" + id,
    capturedAt: CAPTURE, observedOn: date, validity: "unconfirmed",
    eligibleAsActiveOffer: false, attribution: "Open Prices / Open Food Facts", license: "ODbL-1.0",
    raw: {
      id, date, location_id: 77, product_code: "000000" + id,
      price: "1.99", currency: "EUR", proof_id: 42,
      product: { product_quantity: 500, product_quantity_unit: "g" },
      owner: "PRIVATE_OWNER", proof: { id: 42, url: "https://private.example/receipt" }
    }
  };
}
function report(observations = [observation()]) {
  return {
    auditVersion: 1, generatedAt: "2026-10-07T12:01:00.000Z",
    referenceDateBasis: "Europe/Berlin",
    queriedWindow: { sinceInclusive: "2026-09-24", referenceDate: "2026-10-07", upperDateFilterApplied: false },
    limits: { maxPages: 3, pageSize: 100, maximumRetainedRecords: 300 },
    summary: { observationCount: 999999, distinctLocationCount: 999999 },
    providerTotal: observations.length, truncated: false,
    query: { lat: 51.96236, lon: 7.62571, radiusKm: 3, observedSince: "2026-09-24" },
    requests: [{
      url: "https://prices.openfoodfacts.org/api/v1/prices?lat=51.96236&lon=7.62571&radius_km=3&currency=EUR&size=100&page=1&date__gte=2026-09-24",
      capturedAt: CAPTURE
    }],
    docsUrl: "https://prices.openfoodfacts.org/api/docs",
    attribution: "Open Prices / Open Food Facts", license: "ODbL-1.0", observations
  };
}
const parse = value => parseAuditReport(JSON.stringify(value));

test("coverage is recomputed and supplied summary is ignored", () => {
  const value = report([observation(1), observation(2)]);
  const view = parse(value);
  assert.equal(view.recordCount, 2);
  assert.equal(view.locationCount, 1);
  assert.equal(view.productCount, 2);
  assert.equal(view.recentDays, 14);
  assert.equal(view.recentSince, "2026-09-24");
  assert.equal(view.referenceDate, "2026-10-07");
  assert.equal(view.freshness.recent, 2);
  assert.equal(view.currentPriceEligible, false);
  assert.equal(view.provenance, "uploaded_report_unverified");
});

test("aggregate output cannot expose owners, proofs, products, coordinates or prices", () => {
  const value = report();
  value.observations[0].raw.product_code = "PRIVATE_PRODUCT_CODE";
  value.summary.secret = "PRIVATE_SUMMARY";
  const view = parse(value);
  const serialized = JSON.stringify(view);
  for (const secret of ["PRIVATE_OWNER", "private.example", "PRIVATE_PRODUCT_CODE", "PRIVATE_SUMMARY", "1.99", "51.96236", "7.62571"]) {
    assert.equal(serialized.includes(secret), false);
  }
  assert.equal("observations" in view, false);
  assert.equal("requests" in view, false);
  assert.equal("raw" in view, false);
});

test("freshness uses the report window rather than the browser clock", () => {
  const value = report([
    observation(1, "2026-09-26"), observation(2, "2026-09-01"),
    observation(3, "2026-10-08"), observation(4, null), observation(5, "2026-02-30")
  ]);
  const view = parse(value);
  assert.deepEqual(view.freshness, { recent: 1, older: 1, future: 1, missing: 1, invalid: 1 });
  assert.equal(view.oldestObservationDate, "2026-09-01");
  assert.equal(view.newestObservationDate, "2026-10-08");
  assert.equal(view.referenceDate, "2026-10-07");
});

test("missingness is recomputed from projected provider fields", () => {
  const value = report();
  value.observations[0].raw.location_id = null;
  value.observations[0].raw.product_code = null;
  value.observations[0].raw.product = null;
  value.observations[0].raw.price = null;
  value.observations[0].raw.currency = null;
  value.observations[0].raw.proof_id = null;
  value.observations[0].raw.proof = null;
  const view = parse(value);
  assert.equal(view.locationCount, 0);
  assert.equal(view.productCount, 0);
  for (const field of ["locationId", "productCode", "price", "currency", "proofId", "packQuantity", "packUnit"]) {
    assert.equal(view.missingFields[field], 1);
  }
});

test("nested relation identifiers and product codes match the existing coverage contract", () => {
  const value = report();
  delete value.observations[0].raw.location_id;
  delete value.observations[0].raw.product_code;
  delete value.observations[0].raw.proof_id;
  value.observations[0].raw.location = { id: 77, name: "PRIVATE_LOCATION" };
  value.observations[0].raw.product.code = "NESTED_CODE";
  const view = parse(value);
  assert.equal(view.locationCount, 1);
  assert.equal(view.productCount, 1);
  assert.equal(view.missingFields.proofId, 0);
  assert.equal(JSON.stringify(view).includes("PRIVATE_LOCATION"), false);
});

test("empty internally consistent reports produce zero aggregates", () => {
  const view = parse(report([]));
  assert.equal(view.recordCount, 0);
  assert.equal(view.providerTotal, 0);
  assert.equal(view.oldestObservationDate, null);
  assert.equal(view.newestObservationDate, null);
  assert.equal(view.currentPriceEligible, false);
});

test("size limit counts UTF-8 bytes and hard limits cannot be increased", () => {
  const value = report();
  value.notes = "é".repeat(50);
  const text = JSON.stringify(value);
  assert.throws(() => parseAuditReport(text, { maxBytes: text.length }), AuditViewError);
  assert.throws(() => parseAuditReport(" ".repeat(AUDIT_MAX_BYTES + 1)), AuditViewError);
  assert.throws(() => parseAuditReport(text, { maxBytes: AUDIT_MAX_BYTES + 1 }), AuditViewError);
  assert.throws(() => parseAuditReport(text, { maxRecords: 301 }), AuditViewError);
});

test("record cap and lower caller record limits are enforced", () => {
  const value = report(Array.from({ length: 301 }, (_, index) => observation(index + 1)));
  assert.throws(() => parse(value), AuditViewError);
  assert.throws(() => parseAuditReport(JSON.stringify(report()), { maxRecords: 0 }), AuditViewError);
});

test("invalid JSON, primitive reports, unsupported versions and provenance fail closed", () => {
  for (const text of ["{", "null", "[]", "123", '"report"']) {
    assert.throws(() => parseAuditReport(text), AuditViewError);
  }
  for (const changes of [
    { auditVersion: 2 }, { referenceDateBasis: "host-local" },
    { attribution: "another-provider" }, { license: "unknown" }, { generatedAt: "2026-02-30T12:00:00.000Z" }
  ]) assert.throws(() => parse({ ...report(), ...changes }), AuditViewError);
});

test("query windows and limits must agree with the declared request", () => {
  for (const mutate of [
    value => { value.query.lat = 100; },
    value => { value.query.radiusKm = 0; },
    value => { value.query.observedSince = "2026-09-25"; },
    value => { value.queriedWindow.referenceDate = "2026-02-30"; },
    value => { value.queriedWindow.upperDateFilterApplied = true; },
    value => { value.limits.maxPages = 4; },
    value => { value.limits.maximumRetainedRecords = 500; }
  ]) {
    const value = report(); mutate(value);
    assert.throws(() => parse(value), AuditViewError);
  }
});

test("provider total and truncation cannot certify inconsistent pagination", () => {
  for (const mutate of [
    value => { value.providerTotal = 0; },
    value => { value.providerTotal = 2; },
    value => { value.truncated = true; },
    value => { value.requests = []; },
    value => { value.truncated = "false"; }
  ]) {
    const value = report(); mutate(value);
    assert.throws(() => parse(value), AuditViewError);
  }
});

test("truncated report may retain fewer than the cap when pages are short or deduplicated", () => {
  const value = report([observation(1), observation(2)]);
  value.providerTotal = 10;
  value.truncated = true;
  value.requests = [1, 2, 3].map(page => ({
    url: value.requests[0].url.replace("page=1", "page=" + page), capturedAt: CAPTURE
  }));
  const view = parse(value);
  assert.equal(view.recordCount, 2);
  assert.equal(view.providerTotal, 10);
  assert.equal(view.truncated, true);
  assert.equal(view.requestCount, 3);
});

test("provider request origin, radius, filters, order and timestamp are validated", () => {
  for (const mutate of [
    value => { value.requests[0].url = value.requests[0].url.replace("prices.openfoodfacts.org", "evil.example"); },
    value => { value.requests[0].url = value.requests[0].url.replace("radius_km=3", "radius_km=30"); },
    value => { value.requests[0].url += "&page=1"; },
    value => { value.requests[0].url = value.requests[0].url.replace("page=1", "page=2"); },
    value => { value.requests[0].url = value.requests[0].url.replace("&date__gte=2026-09-24", ""); },
    value => { value.requests[0].capturedAt = "2026-10-08T12:00:00.000Z"; }
  ]) {
    const value = report(); mutate(value);
    assert.throws(() => parse(value), AuditViewError);
  }
});

test("record wrappers must match raw identity, page capture, source and historical eligibility", () => {
  for (const mutate of [
    value => { value.observations[0].providerRecordId = "2"; },
    value => { value.observations[0].sourceUrl = "https://evil.example/1"; },
    value => { value.observations[0].capturedAt = "2026-10-07T12:00:01.000Z"; },
    value => { value.observations[0].observedOn = "2026-09-27"; },
    value => { value.observations[0].eligibleAsActiveOffer = true; },
    value => { value.observations[0].validity = "current"; },
    value => { value.observations[0].raw.id = -1; }
  ]) {
    const value = report(); mutate(value);
    assert.throws(() => parse(value), AuditViewError);
  }
});

test("duplicate IDs and malformed projected field types fail closed", () => {
  assert.throws(() => parse(report([observation(1), observation(1)])), AuditViewError);
  for (const mutate of [
    value => { value.observations[0].raw.location_id = -1; },
    value => { value.observations[0].raw.product_code = {}; },
    value => { value.observations[0].raw.product = []; },
    value => { value.observations[0].raw.price = "not-a-number"; },
    value => { value.observations[0].raw.currency = "EURO"; }
  ]) {
    const value = report(); mutate(value);
    assert.throws(() => parse(value), AuditViewError);
  }
});

test("error messages are static and repeated parses are deterministic", () => {
  const value = report();
  value.observations[0].sourceUrl = "PRIVATE_ERROR_CONTENT";
  let caught;
  try { parse(value); } catch (error) { caught = error; }
  assert.ok(caught instanceof AuditViewError);
  assert.equal(caught.message.includes("PRIVATE_ERROR_CONTENT"), false);
  assert.deepEqual(parse(report()), parse(report()));
});

