import test from "node:test";
import assert from "node:assert/strict";
import { planBasket, haversineMeters } from "../src/optimizer.mjs";
import demo from "../src/demo-data.mjs";
const demoRequest = (overrides = {}) => ({
  items: demo.catalog.map(entry => ({
    id: entry.category, category: entry.category,
    quantity: entry.defaultQuantity, unit: entry.unit
  })),
  stores: demo.stores, offers: demo.offers, origin: demo.defaultOrigin,
  shoppingDate: "2026-10-07", mode: "demo", radiusM: 3000,
  maxRoundTripM: 10000, maxStores: 2, allowMembership: false, ...overrides
});

test("demo integration: best complete single shop costs 893 cents", () => {
  const result = planBasket(demoRequest({ maxStores: 1 }));
  assert.deepEqual(result.plans[0].storeIds, ["demo-b"]);
  assert.equal(result.plans[0].checkoutCents, 893);
});

test("demo integration: best complete pair costs 816 cents including 25 cents Pfand", () => {
  const result = planBasket(demoRequest());
  assert.deepEqual(result.plans[0].storeIds, ["demo-a", "demo-c"]);
  assert.equal(result.plans[0].merchandiseCents, 791);
  assert.equal(result.plans[0].depositCents, 25);
  assert.equal(result.plans[0].checkoutCents, 816);
});

test("demo integration: explicit membership opt-in yields a 756-cent basket", () => {
  const result = planBasket(demoRequest({ allowMembership: true }));
  assert.deepEqual(result.plans[0].storeIds, ["demo-a", "demo-c"]);
  assert.equal(result.plans[0].checkoutCents, 756);
});

test("demo integration: synthetic fixture cannot produce an active-price result", () => {
  const result = planBasket(demoRequest({ mode: "active_offer" }));
  assert.equal(result.plans.length, 0);
  assert.equal(result.rejectedOfferCount, demo.offers.length);
});

test("demo integration: shop without eggs remains a partial basket", () => {
  const result = planBasket(demoRequest({ maxStores: 1 }));
  const partial = result.partials.find(plan => plan.storeIds.join() === "demo-c");
  assert.deepEqual(partial.missingItemIds, ["eggs"]);
  assert.equal(partial.complete, false);
  assert.ok(result.plans.every(plan => plan.storeIds.join() !== "demo-c"));
});

test("demo integration: deeply frozen input stays unchanged", () => {
  const input = JSON.parse(JSON.stringify(demoRequest()));
  const freeze = object => {
    Object.freeze(object);
    for (const value of Object.values(object)) {
      if (value && typeof value === "object" && !Object.isFrozen(value)) freeze(value);
    }
    return object;
  };
  freeze(input);
  const before = JSON.stringify(input);
  assert.equal(planBasket(input).plans[0].checkoutCents, 816);
  assert.equal(JSON.stringify(input), before);
});


const origin = { lat: 51.9625, lon: 7.6250 };
const stores = [
  { id: "a", name: "Shop A", lat: 51.9630, lon: 7.6250 },
  { id: "b", name: "Shop B", lat: 51.9625, lon: 7.6280 },
  { id: "far", name: "Far shop", lat: 51.9900, lon: 7.6500 }
];
const item = (overrides = {}) => ({
  id: "milk", category: "milk", quantity: 1000, unit: "ml", ...overrides
});
const offer = (overrides = {}) => ({
  id: "milk-a", category: "milk", productName: "Milk", brand: "Example",
  packQuantity: 1000, unit: "ml", priceCents: 150, depositCents: 0,
  storeIds: ["a"], validFrom: "2026-10-01", validTo: "2026-10-10",
  priceKind: "demo", requiresMembership: false, tags: ["vegetarian"],
  branchScopeVerified: true, matchReviewed: true,
  source: { label: "Fictional fixture", url: null, reviewed: true }, ...overrides
});
const activeSource = { label: "Reviewed fixture source", url: "https://example.org/offers", reviewed: true };
const request = (overrides = {}) => ({
  items: [item()], stores, offers: [offer()], origin,
  shoppingDate: "2026-10-07", mode: "demo", radiusM: 1000,
  maxRoundTripM: 5000, maxStores: 2, allowMembership: false, ...overrides
});

test("actual packs determine cost and excess, rather than prorated unit prices", () => {
  const result = planBasket(request({
    items: [item({ id: "pasta", category: "pasta", quantity: 750, unit: "g" })],
    offers: [offer({ category: "pasta", packQuantity: 500, unit: "g", priceCents: 120 })]
  }));
  const line = result.plans[0].purchases[0];
  assert.equal(line.packs, 2);
  assert.equal(line.purchasedQuantity, 1000);
  assert.equal(line.excessQuantity, 250);
  assert.equal(result.plans[0].checkoutCents, 240);
});

test("choose the actual cheapest pack purchase even when a bigger pack has a better unit price", () => {
  const result = planBasket(request({ offers: [
    offer({ id: "small", packQuantity: 1000, priceCents: 150 }),
    offer({ id: "large", packQuantity: 2000, priceCents: 220 })
  ] }));
  assert.equal(result.plans[0].purchases[0].offerId, "small");
});

test("complete two-shop basket can beat every complete single-shop basket", () => {
  const result = planBasket(request({
    items: [item(), item({ id: "eggs", category: "eggs", quantity: 6, unit: "count" })],
    offers: [
      offer({ id: "milk-a", priceCents: 100 }),
      offer({ id: "milk-b", storeIds: ["b"], priceCents: 300 }),
      offer({ id: "eggs-a", category: "eggs", packQuantity: 6, unit: "count", priceCents: 300 }),
      offer({ id: "eggs-b", category: "eggs", packQuantity: 6, unit: "count", storeIds: ["b"], priceCents: 100 })
    ]
  }));
  assert.deepEqual(result.plans[0].storeIds, ["a", "b"]);
  assert.equal(result.plans[0].checkoutCents, 200);
  assert.equal(result.plans.find(plan => plan.storeIds.join() === "a").checkoutCents, 400);
});

test("missing required items never enter cheapest complete rankings", () => {
  const result = planBasket(request({
    items: [item(), item({ id: "eggs", category: "eggs", quantity: 6, unit: "count" })],
    offers: [
      offer({ id: "cheap-incomplete", priceCents: 1 }),
      offer({ id: "milk-b", storeIds: ["b"], priceCents: 150 }),
      offer({ id: "eggs-b", category: "eggs", packQuantity: 6, unit: "count", storeIds: ["b"], priceCents: 200 })
    ], maxStores: 1
  }));
  assert.equal(result.plans[0].checkoutCents, 350);
  assert.deepEqual(result.plans[0].storeIds, ["b"]);
  assert.deepEqual(result.partials[0].missingItemIds, ["eggs"]);
  assert.equal(result.partials[0].checkoutCents, 1);
});

test("expired, not-yet-valid and observation prices are excluded", () => {
  const result = planBasket(request({ offers: [
    offer({ id: "expired", validTo: "2026-10-06" }),
    offer({ id: "future", validFrom: "2026-10-08" }),
    offer({ id: "historical", priceKind: "observation" }),
    offer({ id: "current", validFrom: "2026-10-07", validTo: "2026-10-07" })
  ] }));
  assert.equal(result.rejectedOfferCount, 3);
  assert.equal(result.plans[0].purchases[0].offerId, "current");
});

test("unknown or impossible validity dates fail closed", () => {
  const result = planBasket(request({ offers: [
    offer({ id: "unknown", validTo: null }),
    offer({ id: "impossible", validFrom: "2026-02-30" }),
    offer({ id: "reversed", validFrom: "2026-10-09", validTo: "2026-10-01" })
  ] }));
  assert.equal(result.plans.length, 0);
  assert.equal(result.rejectedOfferCount, 3);
});

test("membership prices require explicit opt-in", () => {
  const input = request({ offers: [offer({ requiresMembership: true })] });
  assert.equal(planBasket(input).plans.length, 0);
  assert.equal(planBasket({ ...input, allowMembership: true }).plans[0].checkoutCents, 150);
});

test("active offers require reviewed provenance, matching and branch scope", () => {
  for (const changes of [
    { branchScopeVerified: false },
    { matchReviewed: false },
    { source: { label: "Unreviewed", url: null, reviewed: false } },
    { storeIds: ["unknown-branch"] }
  ]) {
    const result = planBasket(request({
      mode: "active_offer", offers: [offer({ priceKind: "active_offer", source: activeSource, ...changes })]
    }));
    assert.equal(result.plans.length, 0);
    assert.equal(result.rejectedOfferCount, 1);
  }
  assert.equal(planBasket(request({
    mode: "active_offer", offers: [offer({ priceKind: "active_offer", source: activeSource })]
  })).plans.length, 1);
});

test("demo and real evidence cannot mix in either comparison mode", () => {
  const offers = [offer(), offer({ id: "real", priceKind: "active_offer", priceCents: 1, source: activeSource })];
  assert.equal(planBasket(request({ offers })).plans[0].checkoutCents, 150);
  assert.equal(planBasket(request({ offers, mode: "active_offer" })).plans[0].checkoutCents, 1);
});

test("one-offer-per-line scope does not claim the cheaper mixed-pack solution", () => {
  const result = planBasket(request({
    items: [item({ id: "pasta", category: "pasta", quantity: 750, unit: "g" })],
    offers: [
      offer({ id: "large-pack", category: "pasta", packQuantity: 500, unit: "g", priceCents: 100 }),
      offer({ id: "small-pack", category: "pasta", packQuantity: 250, unit: "g", priceCents: 75 })
    ]
  }));
  // Combining a 500g and 250g pack would cost 175 cents, outside this MVP model.
  assert.equal(result.plans[0].checkoutCents, 200);
  assert.equal(result.plans[0].purchases.length, 1);
  assert.equal(result.plans[0].purchases[0].offerId, "large-pack");
  assert.equal(result.plans[0].purchases[0].packs, 2);
});

test("active price provenance requires a nonempty HTTP(S) source link", () => {
  for (const url of [null, "", "javascript:alert(1)", "data:text/plain,price", "https://", "https:// source.invalid"]) {
    const result = planBasket(request({
      mode: "active_offer",
      offers: [offer({ priceKind: "active_offer", source: { ...activeSource, url } })]
    }));
    assert.equal(result.plans.length, 0);
    assert.equal(result.rejectedOfferCount, 1);
  }
  const result = planBasket(request({
    mode: "active_offer",
    offers: [offer({ priceKind: "active_offer", source: { ...activeSource, url: "http://example.org/prices" } })]
  }));
  assert.equal(result.plans.length, 1);
});

test("unsafe basket sums fail explicitly rather than rounding integer cents", () => {
  const hugePrice = Math.floor(Number.MAX_SAFE_INTEGER / 2) + 1;
  assert.throws(() => planBasket(request({
    items: [item(), item({ id: "water", category: "water" })],
    offers: [
      offer({ priceCents: hugePrice }),
      offer({ id: "water", category: "water", priceCents: hugePrice })
    ]
  })), RangeError);
});

test("Pfand is separate and contributes to actual checkout ranking", () => {
  const result = planBasket(request({ offers: [
    offer({ id: "deposit", priceCents: 100, depositCents: 100 }),
    offer({ id: "no-deposit", storeIds: ["b"], priceCents: 150 })
  ] }));
  assert.equal(result.plans[0].purchases[0].offerId, "no-deposit");
  const withDeposit = result.plans.find(plan => plan.storeIds.join() === "a");
  assert.equal(withDeposit.merchandiseCents, 100);
  assert.equal(withDeposit.depositCents, 100);
  assert.equal(withDeposit.checkoutCents, 200);
});

test("unknown deposits and invalid monetary values never imply zero cost", () => {
  const result = planBasket(request({ offers: [
    offer({ id: "unknown-deposit", depositCents: null }),
    offer({ id: "negative", priceCents: -1 }),
    offer({ id: "fractional-cent", priceCents: 1.5 })
  ] }));
  assert.equal(result.plans.length, 0);
  assert.equal(result.rejectedOfferCount, 3);
});

test("brand, dietary tags and dimensions constrain acceptable products", () => {
  const result = planBasket(request({
    items: [item({ brand: "Wanted", requiredTags: ["vegan"] })],
    offers: [
      offer({ id: "wrong-brand", tags: ["vegan"] }),
      offer({ id: "wrong-tags", brand: "Wanted" }),
      offer({ id: "wrong-unit", brand: "Wanted", tags: ["vegan"], unit: "g" }),
      offer({ id: "match", brand: "Wanted", tags: ["vegan"] })
    ]
  }));
  assert.equal(result.plans[0].purchases[0].offerId, "match");
});

test("the route includes returning home and obeys the whole-trip budget", () => {
  const distance = haversineMeters(origin, stores[0]);
  assert.equal(planBasket(request({ maxRoundTripM: distance * 1.5 })).plans.length, 0);
  const result = planBasket(request({ maxRoundTripM: distance * 2 + 1 }));
  assert.equal(result.plans[0].roundTripM, distance * 2);
  assert.equal(result.plans[0].distanceKind, "straight_line_estimate");
});

test("two-shop routes include both outward legs and the link between shops", () => {
  const result = planBasket(request({
    items: [item(), item({ id: "eggs", category: "eggs", quantity: 6, unit: "count" })],
    offers: [
      offer(),
      offer({ id: "eggs", category: "eggs", packQuantity: 6, unit: "count", storeIds: ["b"] })
    ]
  }));
  const expected = haversineMeters(origin, stores[0]) + haversineMeters(stores[0], stores[1]) +
    haversineMeters(stores[1], origin);
  assert.equal(result.plans[0].roundTripM, expected);
  assert.equal(planBasket(request({
    items: [item(), item({ id: "eggs", category: "eggs", quantity: 6, unit: "count" })],
    offers: [
      offer(),
      offer({ id: "eggs", category: "eggs", packQuantity: 6, unit: "count", storeIds: ["b"] })
    ], maxRoundTripM: expected - 1
  })).plans.length, 0);
});

test("radius excludes cheap distant shops", () => {
  const result = planBasket(request({ offers: [
    offer(), offer({ id: "cheap-far", storeIds: ["far"], priceCents: 1 })
  ] }));
  assert.equal(result.plans[0].checkoutCents, 150);
  assert.ok(result.plans.every(plan => !plan.storeIds.includes("far")));
});

test("unused shops are removed, plans deduplicated and inputs remain unchanged", () => {
  const input = request({ offers: [offer({ storeIds: ["a", "b"] })] });
  const before = JSON.stringify(input);
  const result = planBasket(input);
  assert.equal(result.plans.length, 2);
  assert.deepEqual(result.plans[0].storeIds, ["a"]);
  assert.equal(JSON.stringify(input), before);
});

test("equal-cost results are deterministic under input order changes", () => {
  const offers = [offer(), offer({ id: "milk-b", storeIds: ["b"] })];
  const first = planBasket(request({ offers }));
  const reversed = planBasket(request({ offers: offers.slice().reverse(), stores: stores.slice().reverse() }));
  assert.deepEqual(first.plans, reversed.plans);
});

test("duplicate offer identifiers are rejected instead of silently picking one", () => {
  const result = planBasket(request({ offers: [offer(), offer({ priceCents: 1 })] }));
  assert.equal(result.plans.length, 0);
  assert.equal(result.rejectedOfferCount, 2);
});

test("invalid requests fail explicitly and an empty basket has no winning trip", () => {
  for (const overrides of [
    { shoppingDate: "2026-02-30" }, { radiusM: -1 }, { maxRoundTripM: NaN },
    { origin: { lat: 100, lon: 7 } }, { maxStores: 3 },
    { items: [item({ quantity: NaN })] }, { items: [item({ quantity: 0 })] },
    { items: [item({ unit: "kg" })] },
    { items: [item({ quantity: 1.5, unit: "count" })] },
    { items: [item(), item()] }
  ]) assert.throws(() => planBasket(request(overrides)), TypeError);
  assert.deepEqual(planBasket(request({ items: [] })), { plans: [], partials: [], rejectedOfferCount: 0 });
});

test("floating-point decimal pack boundaries do not add a spurious pack", () => {
  const result = planBasket(request({
    items: [item({ quantity: 0.3 })],
    offers: [offer({ packQuantity: 0.1 })]
  }));
  assert.equal(result.plans[0].purchases[0].packs, 3);
});
