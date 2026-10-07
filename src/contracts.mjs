/**
 * All amounts use integer EUR cents and quantities use g, ml, or count.
 * Only mode=demo or mode=active_offer exists in this first slice.
 * Historical observations are retained by adapters, never ranked as current.
 *
 * Store: {id,name,lat,lon}
 * Item: {id,category,quantity,unit,brand?:string|null,requiredTags?:string[]}
 * Offer: {id,category,productName,brand,packQuantity,unit,priceCents,
 *   depositCents,storeIds:string[],validFrom,validTo,priceKind,
 *   requiresMembership:boolean,tags:string[],
 *   branchScopeVerified:boolean,matchReviewed:boolean,
 *   source:{label,url:string|null,reviewed:boolean}}
 * Request: {items,stores,offers,origin:{lat,lon},shoppingDate:YYYY-MM-DD,
 *   mode:"demo"|"active_offer",radiusM,maxRoundTripM,maxStores:1|2,
 *   allowMembership:boolean}
 * Result: {plans,partials,rejectedOfferCount}
 * Plan: {storeIds,stores,purchases,merchandiseCents,depositCents,
 *   checkoutCents,roundTripM,distanceKind:"straight_line_estimate",
 *   complete:boolean,missingItemIds}
 * Purchase: {itemId,storeId,offerId,productName,packs,purchasedQuantity,
 *   excessQuantity,unit,merchandiseCents,depositCents,checkoutCents,
 *   source,validFrom,validTo}
 * Engine exports: planBasket(request), haversineMeters(a,b).
 * Plans sorted by checkoutCents, roundTripM, stable storeIds key.
 * Partials are informational and never enter plans.
 * Coordinates and fixture prices are synthetic examples in Münster.
 */
export const UNITS = Object.freeze(["g", "ml", "count"]);
export const PRICE_MODES = Object.freeze(["demo", "active_offer"]);
export const WALKING_METERS_PER_MINUTE = 80;

