/**
 * Deterministic whole-pack basket comparison.
 *
 * Distances are geometric estimates, never verified walking routes.
 * Each item is purchased wholly from one compatible offer at one shop.
 * Different pack sizes cannot be combined for one item; cheapest means cheapest
 * within this restricted model, rather than every possible mix of products.
 * Enumerating singles and pairs is exact for this model: costs are additive,
 * there are no basket promotions or stock caps, and no item is split across shops.
 */
const UNITS = new Set(["g", "ml", "count"]);

function coordinates(point) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon) ||
      Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) {
    throw new TypeError("Coordinates must contain valid finite latitude and longitude.");
  }
}

export function haversineMeters(a, b) {
  coordinates(a);
  coordinates(b);
  const radians = value => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function strings(values) {
  return Array.isArray(values) && values.every(value => typeof value === "string");
}

function validateRequest(request) {
  if (!request || !Array.isArray(request.items) || !Array.isArray(request.stores) ||
      !Array.isArray(request.offers)) throw new TypeError("Items, stores and offers must be arrays.");
  coordinates(request.origin);
  if (!validDate(request.shoppingDate)) throw new TypeError("Shopping date must be a valid YYYY-MM-DD date.");
  if (!["demo", "active_offer"].includes(request.mode)) throw new TypeError("Unknown price comparison mode.");
  if (![1, 2].includes(request.maxStores)) throw new TypeError("Maximum stores must be one or two.");
  if (typeof request.allowMembership !== "boolean") throw new TypeError("Membership preference must be explicit.");
  for (const key of ["radiusM", "maxRoundTripM"]) {
    if (!Number.isFinite(request[key]) || request[key] < 0) throw new TypeError(key + " must be finite and nonnegative.");
  }
  const itemIds = new Set();
  for (const item of request.items) {
    if (!item || typeof item.id !== "string" || !item.id || itemIds.has(item.id) ||
        typeof item.category !== "string" || !item.category ||
        !Number.isFinite(item.quantity) || item.quantity <= 0 || !UNITS.has(item.unit) ||
        (item.unit === "count" && !Number.isSafeInteger(item.quantity)) ||
        (item.brand != null && typeof item.brand !== "string") ||
        (item.requiredTags != null && !strings(item.requiredTags))) {
      throw new TypeError("Shopping items need unique IDs, a category, positive quantity and a supported unit.");
    }
    itemIds.add(item.id);
  }
  const storeIds = new Set();
  for (const shop of request.stores) {
    if (!shop || typeof shop.id !== "string" || !shop.id || storeIds.has(shop.id) ||
        typeof shop.name !== "string") throw new TypeError("Stores need unique IDs and names.");
    coordinates(shop);
    storeIds.add(shop.id);
  }
}

function eligibleOffer(offer, request, knownStores) {
  if (!offer || typeof offer.id !== "string" || !offer.id ||
      typeof offer.category !== "string" || typeof offer.productName !== "string" ||
      !UNITS.has(offer.unit) || !Number.isFinite(offer.packQuantity) || offer.packQuantity <= 0 ||
      (offer.unit === "count" && !Number.isSafeInteger(offer.packQuantity)) ||
      !Number.isSafeInteger(offer.priceCents) || offer.priceCents < 0 ||
      !Number.isSafeInteger(offer.depositCents) || offer.depositCents < 0 ||
      !strings(offer.storeIds) || offer.storeIds.length === 0 ||
      !offer.storeIds.every(id => knownStores.has(id)) ||
      !strings(offer.tags) || typeof offer.requiresMembership !== "boolean" ||
      (offer.requiresMembership && !request.allowMembership) ||
      !validDate(offer.validFrom) || !validDate(offer.validTo) ||
      offer.validFrom > offer.validTo || request.shoppingDate < offer.validFrom ||
      request.shoppingDate > offer.validTo || offer.priceKind !== request.mode ||
      !offer.source || typeof offer.source.label !== "string" ||
      !(offer.source.url === null || typeof offer.source.url === "string")) return false;
  if (request.mode === "active_offer" &&
      (offer.branchScopeVerified !== true || offer.matchReviewed !== true ||
       offer.source.reviewed !== true || typeof offer.source.url !== "string" ||
       !/^https?:\/\/\S+/i.test(offer.source.url))) return false;
  return true;
}

function compatible(item, offer) {
  return item.category === offer.category && item.unit === offer.unit &&
    (item.brand == null || item.brand === "" || item.brand === offer.brand) &&
    (item.requiredTags ?? []).every(tag => offer.tags.includes(tag));
}

function purchase(item, offer, storeId) {
  // Small machine-rounding correction only at a near-exact pack boundary.
  const ratio = item.quantity / offer.packQuantity;
  const nearest = Math.round(ratio);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(ratio)) * 4;
  const packs = Math.abs(ratio - nearest) <= tolerance && nearest > 0 ? nearest : Math.ceil(ratio);
  const merchandiseCents = packs * offer.priceCents;
  const depositCents = packs * offer.depositCents;
  const checkoutCents = merchandiseCents + depositCents;
  if (!Number.isSafeInteger(packs) || packs <= 0 ||
      !Number.isSafeInteger(merchandiseCents) || !Number.isSafeInteger(depositCents) ||
      !Number.isSafeInteger(checkoutCents)) return null;
  const purchasedQuantity = packs * offer.packQuantity;
  if (!Number.isFinite(purchasedQuantity)) return null;
  return {
    itemId: item.id, storeId, offerId: offer.id, productName: offer.productName,
    packs, purchasedQuantity, excessQuantity: Math.max(0, purchasedQuantity - item.quantity),
    unit: item.unit, merchandiseCents, depositCents, checkoutCents,
    source: { ...offer.source }, validFrom: offer.validFrom, validTo: offer.validTo
  };
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function comparePlans(a, b) {
  return a.checkoutCents - b.checkoutCents || a.roundTripM - b.roundTripM ||
    compareText(a.storeIds.join("|"), b.storeIds.join("|"));
}

/**
 * Strict comparisons exclude observations, unknown deposits, expired offers,
 * unresolved memberships and mixed demo/real evidence.
 *
 * Partial baskets are returned separately and never enter the complete rankings.
 * Requests do not mutate input arrays or objects. Duplicate category lines are
 * independent demands; callers should merge equivalent lines before comparison.
 */
export function planBasket(request) {
  validateRequest(request);
  const { items, stores, offers, origin } = request;
  if (items.length === 0) return { plans: [], partials: [], rejectedOfferCount: 0 };
  const knownStores = new Set(stores.map(shop => shop.id));
  const idCounts = new Map();
  for (const offer of offers) {
    if (offer && typeof offer.id === "string") idCounts.set(offer.id, (idCounts.get(offer.id) ?? 0) + 1);
  }
  const accepted = offers.filter(offer =>
    eligibleOffer(offer, request, knownStores) && idCounts.get(offer.id) === 1);
  const rejectedOfferCount = offers.length - accepted.length;
  const distance = new Map(stores.map(shop => [shop.id, haversineMeters(origin, shop)]));
  const nearby = stores.filter(shop => distance.get(shop.id) <= request.radiusM)
    .slice().sort((a, b) => compareText(a.id, b.id));
  const candidates = nearby.map(shop => [shop]);
  if (request.maxStores === 2) {
    for (let i = 0; i < nearby.length; i += 1) {
      for (let j = i + 1; j < nearby.length; j += 1) candidates.push([nearby[i], nearby[j]]);
    }
  }
  const plans = [];
  const partials = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const purchases = [];
    const missingItemIds = [];
    for (const item of items) {
      const options = [];
      for (const offer of accepted) {
        if (!compatible(item, offer)) continue;
        for (const shop of candidate) {
          if (!offer.storeIds.includes(shop.id)) continue;
          const option = purchase(item, offer, shop.id);
          if (option) options.push(option);
        }
      }
      options.sort((a, b) => a.checkoutCents - b.checkoutCents ||
        distance.get(a.storeId) - distance.get(b.storeId) ||
        compareText(a.storeId, b.storeId) || compareText(a.offerId, b.offerId));
      if (options.length) purchases.push(options[0]);
      else missingItemIds.push(item.id);
    }
    const visitedIds = new Set(purchases.map(line => line.storeId));
    const visited = candidate.filter(shop => visitedIds.has(shop.id));
    // Retain the attempted shop(s) for a zero-coverage diagnostic.
    const routeStores = visited.length ? visited : candidate;
    const roundTripM = routeStores.length === 1
      ? 2 * distance.get(routeStores[0].id)
      : distance.get(routeStores[0].id) + haversineMeters(routeStores[0], routeStores[1]) +
        distance.get(routeStores[1].id);
    if (roundTripM > request.maxRoundTripM) continue;
    const merchandiseCents = purchases.reduce((total, line) => total + line.merchandiseCents, 0);
    const depositCents = purchases.reduce((total, line) => total + line.depositCents, 0);
    const checkoutCents = merchandiseCents + depositCents;
    if (!Number.isSafeInteger(checkoutCents)) throw new RangeError("Basket total exceeds safe integer cents.");
    const complete = missingItemIds.length === 0;
    const outputStores = visited.length ? visited : candidate;
    const storeIds = outputStores.map(shop => shop.id).sort(compareText);
    const key = JSON.stringify([storeIds, purchases.map(line => [line.itemId, line.storeId, line.offerId, line.packs]), missingItemIds]);
    if (seen.has(key)) continue;
    seen.add(key);
    const result = {
      storeIds, stores: outputStores.map(shop => ({ ...shop })), purchases,
      merchandiseCents, depositCents, checkoutCents, roundTripM,
      distanceKind: "straight_line_estimate", complete, missingItemIds
    };
    if (complete) plans.push(result);
    else partials.push(result);
  }
  plans.sort(comparePlans);
  // Diagnostic ordering prioritizes coverage, never low partial cost.
  partials.sort((a, b) => a.missingItemIds.length - b.missingItemIds.length || comparePlans(a, b));
  return { plans, partials, rejectedOfferCount };
}
