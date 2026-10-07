// Synthetic prices and fictional shops. Never merge this fixture with provider observations.
export const defaultOrigin = { lat: 51.96236, lon: 7.62571, label: 'Illustrative Münster city-centre starting point' };

export const stores = [
  { id: 'demo-a', name: 'Demo · Corner Basket', lat: 51.9658, lon: 7.6225 },
  { id: 'demo-b', name: 'Demo · Everyday Market', lat: 51.9570, lon: 7.6350 },
  { id: 'demo-c', name: 'Demo · Pantry Place', lat: 51.9760, lon: 7.6090 },
  { id: 'demo-d', name: 'Demo · Green Grocer', lat: 51.9430, lon: 7.6410 },
];

export const catalog = [
  { category: 'milk', label: 'Milk', unit: 'ml', defaultQuantity: 2000 },
  { category: 'pasta', label: 'Pasta', unit: 'g', defaultQuantity: 750 },
  { category: 'eggs', label: 'Eggs', unit: 'count', defaultQuantity: 6 },
  { category: 'oats', label: 'Oats', unit: 'g', defaultQuantity: 500 },
  { category: 'tomatoes', label: 'Tinned tomatoes', unit: 'g', defaultQuantity: 800 },
  { category: 'water', label: 'Mineral water', unit: 'ml', defaultQuantity: 1500 },
];

const makeOffer = (storeId, category, packQuantity, unit, priceCents, options = {}) => ({
  id: `${storeId}-${category}-${options.suffix ?? 'standard'}`,
  category,
  productName: options.productName ?? `Demo ${catalog.find(item => item.category === category).label}`,
  brand: options.brand ?? 'Demo Standard',
  packQuantity,
  unit,
  quantityBasis: unit === 'count' ? 'count' : 'net',
  priceCents,
  depositCents: options.depositCents ?? 0,
  storeIds: [storeId],
  validFrom: '2020-01-01',
  validTo: '2099-12-31',
  priceKind: 'demo',
  requiresMembership: options.requiresMembership ?? false,
  tags: options.tags ?? [],
  branchScopeVerified: true,
  matchReviewed: true,
  source: { label: 'Synthetic demo fixture', url: null, reviewed: true },
});

export const offers = [
  makeOffer('demo-a', 'milk', 1000, 'ml', 115),
  makeOffer('demo-a', 'pasta', 500, 'g', 99, { tags: ['vegan'] }),
  makeOffer('demo-a', 'eggs', 6, 'count', 219),
  makeOffer('demo-a', 'oats', 500, 'g', 89, { tags: ['vegan'] }),
  makeOffer('demo-a', 'tomatoes', 400, 'g', 85, { tags: ['vegan'] }),
  makeOffer('demo-a', 'water', 1500, 'ml', 49, { depositCents: 25, tags: ['vegan'] }),
  makeOffer('demo-b', 'milk', 1000, 'ml', 99),
  makeOffer('demo-b', 'pasta', 1000, 'g', 169, { tags: ['vegan'] }),
  makeOffer('demo-b', 'eggs', 10, 'count', 249),
  makeOffer('demo-b', 'oats', 500, 'g', 75, { tags: ['vegan'] }),
  makeOffer('demo-b', 'tomatoes', 400, 'g', 69, { tags: ['vegan'] }),
  makeOffer('demo-b', 'water', 1500, 'ml', 39, { depositCents: 25, tags: ['vegan'] }),
  // Missing eggs here deliberately exercises incomplete baskets.
  makeOffer('demo-c', 'milk', 1000, 'ml', 89),
  makeOffer('demo-c', 'pasta', 500, 'g', 69, { tags: ['vegan'] }),
  makeOffer('demo-c', 'oats', 500, 'g', 69, { tags: ['vegan'] }),
  makeOffer('demo-c', 'tomatoes', 400, 'g', 79, { tags: ['vegan'] }),
  makeOffer('demo-c', 'water', 1500, 'ml', 29, { depositCents: 25, tags: ['vegan'] }),
  makeOffer('demo-c', 'milk', 1000, 'ml', 59, { suffix: 'member', requiresMembership: true }),
  makeOffer('demo-d', 'milk', 1000, 'ml', 159, { tags: ['organic'], brand: 'Demo Alternative' }),
  makeOffer('demo-d', 'pasta', 500, 'g', 119, { tags: ['organic', 'vegan'], brand: 'Demo Alternative' }),
  makeOffer('demo-d', 'eggs', 6, 'count', 299, { tags: ['organic'], brand: 'Demo Alternative' }),
  makeOffer('demo-d', 'oats', 500, 'g', 99, { tags: ['organic', 'vegan'], brand: 'Demo Alternative' }),
  makeOffer('demo-d', 'tomatoes', 400, 'g', 95, { tags: ['organic', 'vegan'], brand: 'Demo Alternative' }),
  makeOffer('demo-d', 'water', 1500, 'ml', 45, { depositCents: 25, tags: ['vegan'], brand: 'Demo Alternative' }),
];

export const demo = { stores, offers, catalog, defaultOrigin };
export default demo;
