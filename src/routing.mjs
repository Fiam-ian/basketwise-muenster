import { haversineMeters } from "./optimizer.mjs";

/**
 * Openrouteservice-shaped routing boundary; not wired into basket ranking.
 * Pure normalization records provider evidence, not ground-truth accessibility.
 * Never relabel a geometric estimate as a routed walking distance.
 */
export class RoutingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RoutingError";
    this.code = code;
  }
}

function problem(code, message) {
  throw new RoutingError(code, message);
}

function coordinate(value, allowElevation = false) {
  if (!Array.isArray(value) || !(value.length === 2 || (allowElevation && value.length === 3)) ||
      !value.every(Number.isFinite) || Math.abs(value[0]) > 180 || Math.abs(value[1]) > 90) {
    problem("INVALID_COORDINATES", "Coordinates must be finite longitude/latitude pairs.");
  }
  return value.slice();
}

function same(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function separation(a, b) {
  return haversineMeters({ lon: a[0], lat: a[1] }, { lon: b[0], lat: b[1] });
}

export function validateRoundTripCoordinates(values) {
  if (!Array.isArray(values) || values.length < 3 || values.length > 4) {
    problem("INVALID_TRIP", "A trip must contain origin, one or two shops, and the same origin.");
  }
  const coordinates = values.map(value => coordinate(value));
  if (!same(coordinates[0], coordinates[coordinates.length - 1])) {
    problem("INVALID_TRIP", "The trip must return to its exact requested origin.");
  }
  if (coordinates.slice(1, -1).some(value => same(value, coordinates[0]))) {
    problem("INVALID_TRIP", "A shop waypoint must differ from the trip origin.");
  }
  return coordinates;
}

export function createRoundTripCoordinates(origin, shops) {
  if (!origin || !Array.isArray(shops) || shops.length < 1 || shops.length > 2) {
    problem("INVALID_TRIP", "Choose one or two shops for a return trip.");
  }
  return validateRoundTripCoordinates([
    [origin.lon, origin.lat], ...shops.map(shop => [shop?.lon, shop?.lat]),
    [origin.lon, origin.lat]
  ]);
}

function endpoint(value) {
  // Explicit endpoint avoids implicit vendor/network use; credentials and query strings are forbidden.
  const path = "(?:[a-z0-9._~-]+/)*v2/directions/foot-walking/geojson";
  const secure = new RegExp("^https://[a-z0-9.-]+(?::[0-9]{1,5})?/" + path + "$", "i");
  const local = new RegExp("^http://(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?::[0-9]{1,5})?/" + path + "$", "i");
  if (typeof value !== "string" || !(secure.test(value) || local.test(value))) {
    problem("INVALID_ENDPOINT", "Use an explicit HTTPS walking GeoJSON endpoint, or an HTTP loopback endpoint.");
  }
  return value;
}

function timestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    problem("INVALID_CONTEXT", "Provide an explicit valid ISO UTC retrieval timestamp with milliseconds.");
  }
  return value;
}

/**
 * Strict subset of ORS POST /v2/directions/foot-walking/geojson.
 * Context: { coordinates, retrievedAt, sourceUrl, maxSnapM?:100 }.
 * Summary units must be explicitly metres; every requested waypoint is checked.
 */
export function normalizeWalkingRoute(payload, context) {
  if (!context) problem("INVALID_CONTEXT", "A route needs its requested trip and retrieval context.");
  const requested = validateRoundTripCoordinates(context.coordinates);
  const sourceUrl = endpoint(context.sourceUrl);
  const retrievedAt = timestamp(context.retrievedAt);
  const maxSnapM = context.maxSnapM ?? 100;
  if (!Number.isFinite(maxSnapM) || maxSnapM < 0 || maxSnapM > 1000) {
    problem("INVALID_CONTEXT", "Snapping tolerance must be between zero and 1000 metres.");
  }
  if (!payload || payload.type !== "FeatureCollection" ||
      !Array.isArray(payload.features) || payload.features.length !== 1) {
    problem("INVALID_RESPONSE", "Expected exactly one routed GeoJSON feature.");
  }
  const query = payload.metadata?.query;
  if (!query || query.profile !== "foot-walking" || query.units !== "m") {
    problem("INVALID_RESPONSE", "The response must identify the walking profile and metre units.");
  }
  const echoed = validateRoundTripCoordinates(query.coordinates);
  if (echoed.length !== requested.length || echoed.some((value, index) => !same(value, requested[index]))) {
    problem("TRIP_MISMATCH", "The provider response belongs to a different requested trip.");
  }
  if (query.skip_segments != null && (!Array.isArray(query.skip_segments) || query.skip_segments.length)) {
    problem("INCOMPLETE_ROUTE", "Skipped route segments are not accepted.");
  }
  const feature = payload.features[0];
  const properties = feature?.properties;
  const summary = properties?.summary;
  if (feature?.type !== "Feature" || feature.geometry?.type !== "LineString" ||
      !Array.isArray(feature.geometry.coordinates) || feature.geometry.coordinates.length < requested.length ||
      !summary || !Number.isFinite(summary.distance) || summary.distance <= 0 ||
      !Number.isFinite(summary.duration) || summary.duration <= 0) {
    problem("INVALID_RESPONSE", "A route requires a LineString and positive finite distance and duration.");
  }
  if (properties.warnings != null && (!Array.isArray(properties.warnings) || properties.warnings.length)) {
    problem("INCOMPLETE_ROUTE", "A provider warning requires review before the route is accepted.");
  }
  if (properties.segments != null) {
    const legs = properties.segments;
    if (!Array.isArray(legs) || legs.length !== requested.length - 1 ||
        !legs.every(leg => leg && Number.isFinite(leg.distance) && leg.distance >= 0 &&
          Number.isFinite(leg.duration) && leg.duration >= 0) ||
        Math.abs(legs.reduce((sum, leg) => sum + leg.distance, 0) - summary.distance) > 1 ||
        Math.abs(legs.reduce((sum, leg) => sum + leg.duration, 0) - summary.duration) > 1) {
      problem("INCOMPLETE_ROUTE", "Route legs must cover the trip and agree with the total distance and duration.");
    }
  }
  const geometryCoordinates = feature.geometry.coordinates.map(value => coordinate(value, true));
  // Metric sanity check only: spherical geometry length is not ground truth.
  const geometryLengthM = geometryCoordinates.slice(1).reduce(
    (sum, value, index) => sum + separation(geometryCoordinates[index], value), 0
  );
  const metricToleranceM = Math.max(2, geometryLengthM * 0.01);
  if (!Number.isFinite(geometryLengthM) || summary.distance + metricToleranceM < geometryLengthM) {
    problem("INCONSISTENT_METRICS", "Provider distance is materially shorter than its route geometry.");
  }
  const waypoints = properties.way_points;
  if (!Array.isArray(waypoints) || waypoints.length !== requested.length ||
      !waypoints.every((value, index) => Number.isSafeInteger(value) && value >= 0 &&
        value < geometryCoordinates.length && (index === 0 || value > waypoints[index - 1])) ||
      waypoints[0] !== 0 || waypoints[waypoints.length - 1] !== geometryCoordinates.length - 1) {
    problem("INCOMPLETE_ROUTE", "Ordered geometry indices must cover every requested waypoint and the return.");
  }
  const snapDistancesM = requested.map((value, index) => separation(value, geometryCoordinates[waypoints[index]]));
  if (snapDistancesM.some(value => value > maxSnapM) ||
      separation(geometryCoordinates[0], geometryCoordinates[geometryCoordinates.length - 1]) > maxSnapM) {
    problem("TRIP_MISMATCH", "Routed waypoints are too far from the requested trip.");
  }
  return {
    provider: "openrouteservice", profile: "foot-walking", sourceUrl, retrievedAt,
    distanceKind: "routed_walking", evidenceKind: "provider_response",
    distanceM: summary.distance, durationS: summary.duration,
    complete: true, accessLegsVerified: false, walkingBudgetEligible: false, maxSnapM, snapDistancesM,
    requestedCoordinates: requested,
    geometry: { type: "LineString", coordinates: geometryCoordinates },
    wayPoints: waypoints.slice(),
    attribution: typeof payload.metadata.attribution === "string" ? payload.metadata.attribution : null
  };
}

/**
 * Server-only injectable transport. The caller holds the key; this module never
 * stores, logs or returns it. No default provider call, retries or fallback.
 * Browser code may import the pure functions above, but must use a backend proxy
 * for provider credentials. No key belongs in HTML, client storage or a bundle.
 */
export async function fetchWalkingRoute({
  coordinates, sourceUrl, apiKey = null, fetchImpl, retrievedAt, maxSnapM = 100, signal
}) {
  if (typeof window !== "undefined" || typeof document !== "undefined" ||
      typeof WorkerGlobalScope !== "undefined") {
    problem("SERVER_ONLY", "Routing provider credentials must remain on the server.");
  }
  const requested = validateRoundTripCoordinates(coordinates);
  const url = endpoint(sourceUrl);
  timestamp(retrievedAt);
  if (!Number.isFinite(maxSnapM) || maxSnapM < 0 || maxSnapM > 1000) {
    problem("INVALID_CONTEXT", "Snapping tolerance must be between zero and 1000 metres.");
  }
  if (typeof fetchImpl !== "function") problem("INVALID_CONTEXT", "Inject a server-side fetch implementation.");
  if (apiKey !== null && (typeof apiKey !== "string" || !apiKey.trim() || /[\r\n]/.test(apiKey))) {
    problem("INVALID_CONTEXT", "A configured API key must be a nonempty single-line string.");
  }
  const headers = { "Content-Type": "application/json", Accept: "application/geo+json" };
  if (apiKey !== null) headers.Authorization = apiKey;
  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST", headers, redirect: "error", signal,
      body: JSON.stringify({ coordinates: requested, units: "m", instructions: false, geometry: true })
    });
  } catch {
    problem("PROVIDER_UNAVAILABLE", "Walking routing is unavailable; route and walking budget are unknown.");
  }
  if (!response || response.ok !== true || response.redirected === true ||
      !Number.isInteger(response.status) || response.status < 200 || response.status >= 300) {
    problem("PROVIDER_UNAVAILABLE", "Walking routing did not return a successful response.");
  }
  let payload;
  try { payload = await response.json(); }
  catch { problem("INVALID_RESPONSE", "Walking routing returned unreadable route data."); }
  return normalizeWalkingRoute(payload, { coordinates: requested, sourceUrl: url, retrievedAt, maxSnapM });
}
