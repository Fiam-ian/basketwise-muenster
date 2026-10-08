/** Request types, not retailer products or claims about store inventory. */
export const GROCERY_INTENTS = Object.freeze([
  ['milk', 'Milk / Milch', 'ml', 1000, ['milk', 'milch', 'vollmilch', 'fettarme milch', 'h-milch']],
  ['eggs', 'Eggs / Eier', 'count', 6, ['eggs', 'egg', 'eier', 'ei']],
  ['pasta', 'Pasta / Nudeln', 'g', 500, ['pasta', 'nudeln', 'spaghetti', 'penne']],
  ['oats', 'Oats / Haferflocken', 'g', 500, ['oats', 'oat', 'haferflocken', 'hafer']],
  ['tomatoes', 'Tomatoes / Tomaten', 'g', 500, ['tomatoes', 'tomato', 'tomaten', 'tomate']],
  ['water', 'Water / Wasser', 'ml', 1500, ['water', 'wasser', 'mineralwasser']]
].map(([id, label, unit, defaultQuantity, aliases]) => Object.freeze({
  id, category: id, label, unit, defaultQuantity, aliases: Object.freeze(aliases)
})));

const MAX_QUANTITY = 1000000;
const fail = () => { throw new Error('Choose a supported grocery request and a positive whole quantity within the limit.'); };
const normalText = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ');
const searchText = value => normalText(value).toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const intentFor = id => GROCERY_INTENTS.find(intent => intent.id === id);

export function searchGroceryIntents(query = '') {
  if (typeof query !== 'string' || query.length > 100) fail();
  const words = searchText(query).split(' ').filter(Boolean);
  return GROCERY_INTENTS.filter(intent => {
    const text = searchText([intent.label, ...intent.aliases].join(' '));
    return words.every(word => text.includes(word));
  });
}

/** Milk preferences are hard request constraints. An unspecified preference is omitted. */
export function createShoppingRequest(intentId, options = {}) {
  const intent = intentFor(intentId);
  if (!intent || !options || typeof options !== 'object' || Array.isArray(options)) fail();
  const allowed = ['quantity', 'brand', 'milkSource', 'fatBasisPoints', 'processing', 'organic', 'lactoseFree'];
  if (Object.keys(options).some(key => !allowed.includes(key))) fail();
  const quantity = options.quantity === undefined ? intent.defaultQuantity : options.quantity;
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) fail();
  const constraints = {};
  if (options.brand != null && options.brand !== '') {
    if (typeof options.brand !== 'string' || options.brand.length > 80 || !normalText(options.brand)) fail();
    constraints.brand = normalText(options.brand);
  }
  for (const key of ['milkSource', 'fatBasisPoints', 'processing']) {
    if (options[key] == null || options[key] === '') continue;
    if (intent.category !== 'milk') fail();
    if (key === 'milkSource' && options[key] !== 'cow') fail();
    if (key === 'fatBasisPoints' && ![150, 350].includes(options[key])) fail();
    if (key === 'processing' && !['fresh', 'uht'].includes(options[key])) fail();
    constraints[key] = options[key];
  }
  for (const key of ['organic', 'lactoseFree']) {
    if (options[key] == null) continue;
    if (typeof options[key] !== 'boolean' || key === 'lactoseFree' && intent.category !== 'milk') fail();
    constraints[key] = options[key];
  }
  return { category: intent.category, quantity, unit: intent.unit, constraints };
}

function validateRequest(request) {
  if (!request || typeof request !== 'object' || !request.constraints ||
      typeof request.constraints !== 'object' || Array.isArray(request.constraints) ||
      !Number.isSafeInteger(request.quantity) ||
      Object.keys(request.constraints).some(key => !['brand', 'milkSource', 'fatBasisPoints', 'processing', 'organic', 'lactoseFree'].includes(key)) ||
      Object.keys(request).some(key => !['category', 'quantity', 'unit', 'constraints'].includes(key))) fail();
  const result = createShoppingRequest(request.category, { ...request.constraints, quantity: request.quantity });
  if (request.unit !== result.unit) fail();
  return result;
}
function validateList(list) {
  if (!Array.isArray(list) || list.length > 50) fail();
  return list.map(validateRequest);
}
const identity = request => JSON.stringify([request.category, request.unit,
  Object.entries(request.constraints).sort(([a], [b]) => a.localeCompare(b))]);

/** Returns a fresh list; explicit brand spelling/case and every constraint must agree. */
export function addShoppingRequest(list, request) {
  const result = validateList(list);
  const next = validateRequest(request);
  const existing = result.find(item => identity(item) === identity(next));
  if (existing) {
    if (existing.quantity + next.quantity > MAX_QUANTITY) fail();
    existing.quantity += next.quantity;
  } else {
    if (result.length >= 50) fail();
    result.push(next);
  }
  return result;
}

export function removeShoppingRequest(list, index) {
  const result = validateList(list);
  if (!Number.isSafeInteger(index) || index < 0 || index >= result.length) fail();
  return result.filter((_, position) => position !== index);
}

export function shoppingRequestLabel(request) {
  const item = validateRequest(request);
  const details = [];
  const c = item.constraints;
  if (c.brand) details.push(c.brand);
  if (c.milkSource) details.push('cow milk');
  if (c.fatBasisPoints != null) details.push(`${c.fatBasisPoints / 100}% fat`);
  if (c.processing) details.push(c.processing === 'uht' ? 'UHT' : 'fresh');
  for (const key of ['organic', 'lactoseFree']) {
    if (c[key] != null) details.push(`${key === 'organic' ? 'organic' : 'lactose free'}: ${c[key] ? 'required' : 'no'}`);
  }
  return `${intentFor(item.category).label}${details.length ? ` (${details.join(', ')})` : ''}`;
}

/** Pass parsed offer-view reports. Category leads never establish equivalence or totals. */
export function findShoppingCandidateLeads(reports, request) {
  const item = validateRequest(request);
  if (!Array.isArray(reports) || reports.length > 3) fail();
  const seen = new Set();
  const leads = [];
  for (const report of reports) {
    if (!report || report.mode === 'demo' || typeof report.storeId !== 'string' ||
        !Array.isArray(report.candidates) || report.candidates.length > 100) fail();
    const key = `${report.storeId}:${report.leafletId ?? 'supplement'}`;
    if (seen.has(key)) fail();
    seen.add(key);
    for (const candidate of report.candidates) {
      if (candidate.category !== item.category) continue;
      leads.push({ storeId: report.storeId, storeName: report.storeName,
        leafletId: report.leafletId ?? 'supplement', candidate,
        categoryLead: true, equivalenceVerified: false, comparisonEligible: false });
    }
  }
  return leads;
}
