# Walking-route provider boundary

Status note (2026-10-07 WSL continuation): execution-limit and pending-check statements below describe the original session. Native tests, bounded browser checks, raw-audit inspection and public source release subsequently completed; see [current status](current-status.md), [WSL verification](wsl-verification.md) and [context reconciliation](context-reconciliation.md). Live walking, real product/pack eligibility and current-price coverage remain gated.

This boundary is prepared for later backend integration. The app's basket optimizer still uses labelled geometric estimates. Neither this module nor a successful provider response enables a claim that the whole trip fits a walking budget.

## Primary references

Reviewed on 2026-10-07 against the public ORS 10.0.1 documentation. ORS documents a POST directions GeoJSON endpoint, a FeatureCollection with LineString route geometry, provider summary distance in metres and duration in seconds, and waypoint indices into that geometry. [ORS request and response documentation](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types)

The source schema explicitly defines longitude/latitude ordering, a metre distance-unit option, and snapping radiuses. [ORS request schema](https://github.com/GIScience/openrouteservice/blob/main/ors-api/src/main/java/org/heigit/ors/api/requests/routing/RouteRequest.java)

A future walking matrix must retain directional source-to-destination distances and durations. This module does not fetch, validate or optimize a matrix. [ORS matrix documentation](https://giscience.github.io/openrouteservice/api-reference/endpoints/matrix/)

## Functions

`createRoundTripCoordinates(origin, shops)` accepts the app's latitude/longitude objects and produces `[[longitude, latitude], ...shops, [longitude, latitude]]`. One or two shops are supported. A shop at the exact origin and missing return legs are rejected.

`validateRoundTripCoordinates(coordinates)` validates this closed trip and returns independent coordinate arrays.

`normalizeWalkingRoute(payload, { coordinates, sourceUrl, retrievedAt, maxSnapM = 100 })` is pure. It accepts one ORS-shaped GeoJSON route and requires:

- An echoed matching trip, `foot-walking` profile and explicitly echoed `m` units.
- A LineString with finite valid coordinates, positive finite provider distance and duration.
- Strictly increasing integer geometry indices for every requested waypoint, including both path endpoints.
- Every snapped waypoint within the configured tolerance and path endpoints within that tolerance of each other.
- Provider distance must be no shorter than the summed spherical geometry segments beyond a tolerance of the greater of two metres or one percent of geometry length. This is a metric-consistency check, not a universal walking lower bound or independent ground truth.
- No skipped segments or provider warnings. If leg summaries are present, they must cover all legs and match the route totals within one metre/second.

`retrievedAt` is an explicit ISO UTC timestamp with milliseconds. It records the supplied retrieval context; it does not verify access at a future shopping time. The snapping tolerance is finite, nonnegative and capped at 1000 metres. Increasing it never verifies access. Output arrays are copied.

The result preserves provider distance and duration, source URL, retrieval timestamp, attribution, geometry and per-waypoint snap distances. It carries `distanceKind: "routed_walking"`, `evidenceKind: "provider_response"`, `complete: true`, `accessLegsVerified: false` and `walkingBudgetEligible: false`. Completeness describes the accepted network route at snapped points; it does not certify shop-door access, road safety, accessibility, stock or opening hours.

## Server transport

`fetchWalkingRoute({ coordinates, sourceUrl, apiKey = null, fetchImpl, retrievedAt, maxSnapM = 100, signal })` injects transport explicitly and sends a metre-based walking GeoJSON POST. No endpoint, network call or key is configured by importing this module. No live routing call was made during development.

The configured endpoint must be HTTPS or HTTP loopback and end in `v2/directions/foot-walking/geojson`. Query strings and embedded credentials are rejected. A caller-held optional key is passed only in the Authorization header; it is not persisted, logged or included in normalized output. Self-hosted loopback can operate without a key. Provider redirect/error/unreadable responses raise a `RoutingError`; there is no retry or geometric fallback. Before any live use, the caller must bound the injected fetch with a finite deadline, for example an AbortSignal timeout. This boundary does not enforce its own transport deadline.

The transport rejects browser windows, documents and browser workers. Keep provider credentials in the backend environment. Browser bundles, HTML, local storage, public repositories and UI forms must not contain backend secrets. The frontend may use the pure normalizer on sanitized backend responses.

## Integration gate

Before exposing real walking-budget claims, obtain a configured provider with Münster walking coverage, run the Node suite, validate actual response fixtures, and verify access legs. Then integrate a complete directional walking matrix or route every feasible candidate order. Keep unknown routes unavailable rather than replacing them with geometry. A routed check of one geometrically selected winner does not establish the cheapest feasible walking trip.

Maintain independent price and routing evidence gates. Advertised price eligibility does not establish availability; a routed path does not establish shop opening hours. UI distance and duration labels must name their evidence and keep the current estimate mode clear.

## Verification

`node --test tests/routing.test.mjs` provides twenty-one regression scenarios, using synthetic ORS-shaped data and injectable fetch stubs. The authored module and all twenty-one callbacks pass in the V8 tool environment. Node module loading, the native Node runner, real provider coverage and browser/backend integration remain unverified while the host runtime is unavailable.
