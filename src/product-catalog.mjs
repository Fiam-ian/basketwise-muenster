const attributeNames = ['milkSource', 'fatBasisPoints', 'processing', 'organic', 'lactoseFree'];
const token = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value);
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 300;
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function fail(message) { throw new TypeError('Invalid product catalog input: ' + message); }
function keys(value, allowed, required = allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) fail('object fields');
}
function pack(value) {
  keys(value, ['quantity', 'unit', 'basis']);
  if (!positive(value.quantity) || !['g', 'ml', 'count'].includes(value.unit) || !['net', 'drained', 'count'].includes(value.basis) || (value.unit === 'count' ? value.basis !== 'count' : value.basis === 'count')) fail('pack');
}
function draftPack(value) {
  keys(value, ['quantity', 'unit', 'basis']);
  if (!(value.quantity === null || positive(value.quantity)) || !(value.unit === null || ['g', 'ml', 'count'].includes(value.unit)) || !(value.basis === null || ['net', 'drained', 'count'].includes(value.basis))) fail('draft pack');
  if (value.unit !== null && value.basis !== null && (value.unit === 'count' ? value.basis !== 'count' : value.basis === 'count')) fail('draft pack basis');
}
function attribute(name, value) {
  if (value === null) return true;
  if (name === 'milkSource') return ['cow', 'goat', 'plant'].includes(value);
  if (name === 'processing') return ['fresh', 'uht'].includes(value);
  if (name === 'fatBasisPoints') return Number.isInteger(value) && value >= 0 && value <= 10000;
  return typeof value === 'boolean';
}
function source(value) {
  keys(value, ['provider', 'sourceUrl', 'retrievedAt', 'licence']);
  let url;
  try { url = new URL(value.sourceUrl); } catch { fail('source URL'); }
  if (!token(value.provider) || typeof value.sourceUrl !== 'string' || value.sourceUrl.length > 2048 || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || !text(value.licence)) fail('source');
  if (typeof value.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.retrievedAt) || !Number.isFinite(Date.parse(value.retrievedAt)) || new Date(value.retrievedAt).toISOString() !== value.retrievedAt.replace(/Z$/, value.retrievedAt.includes('.') ? 'Z' : '.000Z')) fail('retrieval timestamp');
}

/** Validate bounded metadata. Review flags are assertions, not verification performed here. */
export function validateProductCatalog(catalog) {
  keys(catalog, ['catalogVersion', 'products']);
  if (catalog.catalogVersion !== 1 || !Array.isArray(catalog.products) || catalog.products.length > 500) fail('catalog version or size');
  const ids = new Set();
  for (const product of catalog.products) {
    keys(product, ['id', 'name', 'category', 'brand', 'pack', 'attributes', 'metadataReviewed', 'attributeReview', 'source'], ['id', 'category', 'brand', 'pack', 'attributes', 'metadataReviewed', 'attributeReview', 'source']);
    if (Object.hasOwn(product, 'name') && !(product.name === null || (typeof product.name === 'string' && product.name.trim().length > 0 && product.name.length <= 160))) fail('product name');
    if (!token(product.id) || ids.has(product.id) || !(token(product.category) || (product.category === null && product.metadataReviewed === false)) || !(product.brand === null || text(product.brand)) || typeof product.metadataReviewed !== 'boolean') fail('product identity or review');
    ids.add(product.id);
    if (product.metadataReviewed) pack(product.pack);
    else draftPack(product.pack);
    keys(product.attributes, attributeNames);
    keys(product.attributeReview, attributeNames);
    for (const name of attributeNames) {
      if (!attribute(name, product.attributes[name]) || typeof product.attributeReview[name] !== 'boolean' || (product.attributes[name] === null && product.attributeReview[name])) fail('attribute or review');
    }
    source(product.source);
  }
  return catalog;
}

/** Product equivalence only. Prices, shop availability and inventory coverage are separate gates. */
export function matchProductAlternatives(catalog, request) {
  validateProductCatalog(catalog);
  keys(request, ['category', 'quantity', 'unit', 'basis', 'brand', 'requiredAttributes'], ['category', 'quantity', 'unit', 'basis', 'brand']);
  if (!token(request.category) || !(request.brand === null || text(request.brand))) fail('request');
  pack({ quantity: request.quantity, unit: request.unit, basis: request.basis });
  const required = Object.hasOwn(request, 'requiredAttributes') ? request.requiredAttributes : {};
  keys(required, attributeNames, []);
  for (const [name, value] of Object.entries(required)) if (value === null || !attribute(name, value)) fail('required attribute');
  const eligibleProductIds = [], excluded = [];
  for (const product of catalog.products) {
    const reasons = [];
    if (!product.metadataReviewed) reasons.push('metadata_unreviewed');
    if (product.category !== request.category) reasons.push('category_mismatch');
    if (product.pack.unit !== request.unit) reasons.push('unit_mismatch');
    if (product.pack.basis !== request.basis) reasons.push('basis_mismatch');
    if (request.brand !== null && product.brand !== request.brand) reasons.push('brand_mismatch');
    for (const [name, value] of Object.entries(required)) {
      if (product.attributes[name] === null) reasons.push('attribute_unknown:' + name);
      else if (!product.attributeReview[name]) reasons.push('attribute_unreviewed:' + name);
      else if (product.attributes[name] !== value) reasons.push('attribute_mismatch:' + name);
    }
    if (reasons.length) excluded.push({ productId: product.id, reasons });
    else eligibleProductIds.push(product.id);
  }
  return { catalogVersion: 1, eligibleProductIds, excluded, priceEligible: false, inventoryComplete: false, scope: 'product-equivalence-only' };
}
