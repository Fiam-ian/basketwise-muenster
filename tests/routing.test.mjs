import test from "node:test";
import assert from "node:assert/strict";
import {
  RoutingError, createRoundTripCoordinates, validateRoundTripCoordinates,
  normalizeWalkingRoute, fetchWalkingRoute
} from "../src/routing.mjs";

const sourceUrl = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";
const retrievedAt = "2026-10-07T12:00:00.000Z";
const coordinates = [[7.625, 51.9625], [7.628, 51.963], [7.625, 51.9625]];
const context = (changes = {}) => ({ coordinates, sourceUrl, retrievedAt, ...changes });
const payload = () => ({
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {
      summary: { distance: 600, duration: 480 }, way_points: [0, 1, 2],
      segments: [{ distance: 300, duration: 240 }, { distance: 300, duration: 240 }]
    },
    geometry: { type: "LineString", coordinates: coordinates.map(value => value.slice()) }
  }],
  metadata: {
    attribution: "Synthetic ORS-shaped fixture, not a real route",
    query: { profile: "foot-walking", units: "m", coordinates: coordinates.map(value => value.slice()) }
  }
});

test("materially impossible provider distance fails geometry consistency without a ground-truth claim", () => {
  const farTrip = [coordinates[0], [7.7, 52], coordinates[0]];
  const impossible = payload();
  impossible.metadata.query.coordinates = farTrip;
  impossible.features[0].geometry.coordinates = farTrip;
  impossible.features[0].properties.summary.distance = 1;
  delete impossible.features[0].properties.segments;
  let caught;
  try { normalizeWalkingRoute(impossible, context({ coordinates: farTrip })); }
  catch (error) { caught = error; }
  assert.ok(caught instanceof RoutingError);
  assert.equal(caught.code, "INCONSISTENT_METRICS");
  // A conservative two-metre/one-percent tolerance accommodates small metric differences.
  const plausible = payload();
  delete plausible.features[0].properties.segments;
  plausible.features[0].properties.summary.distance = 1000;
  const accepted = normalizeWalkingRoute(plausible, context());
  assert.equal(accepted.distanceM, 1000);
  assert.equal(accepted.walkingBudgetEligible, false);
});

test("trip construction includes home, every shop and home in GeoJSON coordinate order", () => {
  assert.deepEqual(createRoundTripCoordinates(
    { lat: 51.9625, lon: 7.625 },
    [{ lat: 51.963, lon: 7.628 }]
  ), coordinates);
  const two = createRoundTripCoordinates(
    { lat: 51.9625, lon: 7.625 },
    [{ lat: 51.963, lon: 7.628 }, { lat: 51.965, lon: 7.629 }]
  );
  assert.equal(two.length, 4);
  assert.deepEqual(two[0], two[3]);
});

test("trip validation rejects missing return, wrong origin, invalid coordinates and excessive shops", () => {
  for (const value of [
    coordinates.slice(0, 2), [coordinates[0], coordinates[1], [7.63, 51.97]],
    [[200, 51], coordinates[1], [200, 51]],
    [[7, NaN], coordinates[1], [7, NaN]],
    [coordinates[0], coordinates[0], coordinates[0]],
    [coordinates[0], coordinates[1], coordinates[1], coordinates[1], coordinates[0]]
  ]) assert.throws(() => validateRoundTripCoordinates(value), RoutingError);
});

test("normalizer preserves provider distances and provenance without claiming budget eligibility", () => {
  const result = normalizeWalkingRoute(payload(), context());
  assert.equal(result.distanceM, 600);
  assert.equal(result.durationS, 480);
  assert.equal(result.distanceKind, "routed_walking");
  assert.equal(result.evidenceKind, "provider_response");
  assert.equal(result.retrievedAt, retrievedAt);
  assert.equal(result.sourceUrl, sourceUrl);
  assert.equal(result.complete, true);
  assert.equal(result.accessLegsVerified, false);
  assert.equal(result.walkingBudgetEligible, false);
  assert.deepEqual(result.snapDistancesM, [0, 0, 0]);
});

test("normalizer requires walking profile and explicit metre units", () => {
  for (const changes of [
    { profile: "driving-car" }, { units: "km" }, { units: undefined },
    { profile: undefined }
  ]) {
    const value = payload();
    Object.assign(value.metadata.query, changes);
    assert.throws(() => normalizeWalkingRoute(value, context()), RoutingError);
  }
});

test("normalizer rejects missing, encoded, wrong-type or invalid path geometry", () => {
  for (const geometry of [
    null, { type: "Point", coordinates: coordinates[0] },
    { type: "LineString", coordinates: [] },
    { type: "LineString", coordinates: [coordinates[0], [7, 91], coordinates[2]] },
    { type: "LineString", coordinates: [coordinates[0], [NaN, 51], coordinates[2]] }
  ]) {
    const value = payload();
    value.features[0].geometry = geometry;
    assert.throws(() => normalizeWalkingRoute(value, context()), RoutingError);
  }
});

test("normalizer refuses ambiguous alternative routes and absent route features", () => {
  const value = payload();
  value.features.push(value.features[0]);
  assert.throws(() => normalizeWalkingRoute(value, context()), RoutingError);
  assert.throws(() => normalizeWalkingRoute({ type: "FeatureCollection", features: [] }, context()), RoutingError);
});

test("normalizer requires positive finite distance and duration", () => {
  for (const summary of [
    { distance: 0, duration: 480 }, { distance: 600, duration: 0 },
    { distance: NaN, duration: 480 }, { distance: 600, duration: Infinity },
    { distance: -1, duration: 480 }, { distance: "600", duration: 480 }
  ]) {
    const value = payload();
    value.features[0].properties.summary = summary;
    assert.throws(() => normalizeWalkingRoute(value, context()), RoutingError);
  }
});

test("ordered integer waypoints must cover all shops and both path endpoints", () => {
  for (const indices of [
    [0, 2], [0, 1.5, 2], [0, 3, 2], [0, 0, 2], [1, 1, 2], [0, 1, 1]
  ]) {
    const value = payload();
    value.features[0].properties.way_points = indices;
    assert.throws(() => normalizeWalkingRoute(value, context()), RoutingError);
  }
});

test("response trip cannot be substituted with another shop or missing return", () => {
  const value = payload();
  value.metadata.query.coordinates[1] = [7.63, 51.963];
  assert.throws(() => normalizeWalkingRoute(value, context()), RoutingError);
  const noReturn = payload();
  noReturn.metadata.query.coordinates.pop();
  assert.throws(() => normalizeWalkingRoute(noReturn, context()), RoutingError);
});

test("snapping tolerance rejects distant waypoints and never certifies access", () => {
  const value = payload();
  value.features[0].geometry.coordinates[1][0] += 0.0001;
  assert.throws(() => normalizeWalkingRoute(value, context({ maxSnapM: 0 })), RoutingError);
  const result = normalizeWalkingRoute(value, context({ maxSnapM: 100 }));
  assert.ok(result.snapDistancesM[1] > 0);
  assert.equal(result.accessLegsVerified, false);
  assert.equal(result.walkingBudgetEligible, false);
  for (const maxSnapM of [-1, NaN, Infinity, 1001]) {
    assert.throws(() => normalizeWalkingRoute(payload(), context({ maxSnapM })), RoutingError);
  }
});

test("snapped path start and finish must still form a return trip within tolerance", () => {
  const value = payload();
  value.features[0].geometry.coordinates[0][0] -= 0.001;
  value.features[0].geometry.coordinates[2][0] += 0.001;
  assert.throws(() => normalizeWalkingRoute(value, context({ maxSnapM: 100 })), RoutingError);
});

test("skipped segments and provider warnings require explicit review", () => {
  const skipped = payload();
  skipped.metadata.query.skip_segments = [1];
  assert.throws(() => normalizeWalkingRoute(skipped, context()), RoutingError);
  const warned = payload();
  warned.features[0].properties.warnings = [{ code: 3, message: "Fixture warning" }];
  assert.throws(() => normalizeWalkingRoute(warned, context()), RoutingError);
});

test("optional leg totals must cover the trip and agree with provider summary", () => {
  for (const segments of [
    [{ distance: 600, duration: 480 }],
    [{ distance: 300, duration: 240 }, { distance: 100, duration: 240 }],
    [{ distance: 300, duration: 240 }, { distance: 300, duration: 10 }],
    [{ distance: 300, duration: 240 }, { distance: NaN, duration: 240 }]
  ]) {
    const value = payload();
    value.features[0].properties.segments = segments;
    assert.throws(() => normalizeWalkingRoute(value, context()), RoutingError);
  }
});

test("normalizer returns independent geometry arrays and leaves frozen response unchanged", () => {
  const value = payload();
  const before = JSON.stringify(value);
  const freeze = object => {
    Object.freeze(object);
    for (const entry of Object.values(object)) {
      if (entry && typeof entry === "object" && !Object.isFrozen(entry)) freeze(entry);
    }
    return object;
  };
  freeze(value);
  const result = normalizeWalkingRoute(value, context());
  result.geometry.coordinates[0][0] = 8;
  assert.equal(JSON.stringify(value), before);
});

test("endpoint and retrieval context reject unsupported schemes, embedded credentials and impossible dates", () => {
  for (const bad of [
    { sourceUrl: "http://external.example/v2/directions/foot-walking/geojson" },
    { sourceUrl: sourceUrl + "?api_key=secret" },
    { sourceUrl: "https://user:secret@example.org/v2/directions/foot-walking/geojson" },
    { sourceUrl: "javascript:alert(1)" },
    { retrievedAt: "2026-02-30T12:00:00.000Z" },
    { retrievedAt: "not-a-date" }
  ]) assert.throws(() => normalizeWalkingRoute(payload(), context(bad)), RoutingError);
});

test("injectable server transport uses metre walking GeoJSON with caller-held key", async () => {
  const calls = [];
  const result = await fetchWalkingRoute({
    ...context(), apiKey: "fixture-server-key",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, redirected: false, json: async () => payload() };
    }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.Authorization, "fixture-server-key");
  assert.equal(calls[0].options.redirect, "error");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    coordinates, units: "m", instructions: false, geometry: true
  });
  assert.equal(JSON.stringify(result).includes("fixture-server-key"), false);
});

test("self-hosted loopback route needs no mandatory vendor key", async () => {
  const local = "http://localhost:8082/ors/v2/directions/foot-walking/geojson";
  const result = await fetchWalkingRoute({
    ...context({ sourceUrl: local }),
    fetchImpl: async (_url, options) => {
      assert.equal(options.headers.Authorization, undefined);
      return { ok: true, status: 200, json: async () => payload() };
    }
  });
  assert.equal(result.sourceUrl, local);
});

test("invalid transport configuration makes zero provider calls", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error("Unexpected request"); };
  for (const changes of [
    { coordinates: coordinates.slice(0, 2) }, { apiKey: "" }, { apiKey: "key\nInjected" },
    { sourceUrl: "https://example.org/not-walking" }, { maxSnapM: NaN },
    { retrievedAt: "not-a-date" }
  ]) await assert.rejects(fetchWalkingRoute({ ...context(), fetchImpl, ...changes }), RoutingError);
  assert.equal(calls, 0);
});

test("provider failure, redirect and unreadable data never become geometric fallback", async () => {
  const providers = [
    async () => { throw new Error("fixture-secret-key must never leak"); },
    async () => ({ ok: false, status: 429, json: async () => payload() }),
    async () => ({ ok: true, status: 200, redirected: true, json: async () => payload() }),
    async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad JSON"); } })
  ];
  for (const fetchImpl of providers) {
    try {
      await fetchWalkingRoute({ ...context(), fetchImpl });
      assert.fail("Expected routing failure");
    } catch (error) {
      assert.ok(error instanceof RoutingError);
      assert.equal(error.message.includes("fixture-secret-key"), false);
    }
  }
});

test("transport refuses browser execution before provider calls", async () => {
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
  const previous = globalThis.window;
  globalThis.window = {};
  let calls = 0;
  try {
    await assert.rejects(fetchWalkingRoute({
      ...context(), apiKey: "server-only",
      fetchImpl: async () => { calls++; return { ok: true, status: 200, json: async () => payload() }; }
    }), RoutingError);
    assert.equal(calls, 0);
  } finally {
    if (hadWindow) globalThis.window = previous;
    else delete globalThis.window;
  }
});
