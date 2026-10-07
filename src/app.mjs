import { stores, offers, catalog, defaultOrigin } from './demo-data.mjs';
import { planBasket } from './optimizer.mjs';
import { parseAuditReport } from './audit-view.mjs';

const STORAGE_KEY = 'basketwise-demo-v1';
const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const quantityFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });
const byId = (id) => document.getElementById(id);
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const euros = (cents) => money.format(cents / 100);
const distance = (metres) => `${(metres / 1000).toFixed(1)} km`;
const unitLabel = (unit) => unit === 'count' ? 'pieces' : unit;
const catalogByCategory = new Map(catalog.map((entry) => [entry.category, entry]));
const storeById = new Map(stores.map((store) => [store.id, store]));
let idSequence = 0;
const nextId = () => `item-${Date.now()}-${++idSequence}`;
const fallbackOrigin = { lat: defaultOrigin.lat ?? defaultOrigin.latitude, lon: defaultOrigin.lon ?? defaultOrigin.lng ?? defaultOrigin.longitude };
const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
const calendarPart = (type) => todayParts.find((part) => part.type === type).value;
const today = `${calendarPart('year')}-${calendarPart('month')}-${calendarPart('day')}`;
const defaults = {
  items: catalog.slice(0, 4).map((entry) => ({ id: nextId(), category: entry.category, quantity: entry.defaultQuantity, unit: entry.unit, brand: null, requiredTags: [] })),
  shoppingDate: today, radiusM: 2000, walkingMinutes: 45,
  maxStores: 2, allowMembership: false, origin: fallbackOrigin,
};

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validOrigin(origin) {
  return origin && Number.isFinite(origin.lat) && Math.abs(origin.lat) <= 90 && Number.isFinite(origin.lon) && Math.abs(origin.lon) <= 180;
}

function validQuantity(item) {
  return Number.isFinite(item.quantity) && item.quantity > 0 && item.quantity <= 10000 && (item.unit !== 'count' || Number.isSafeInteger(item.quantity));
}

function mergeEquivalentItems(items) {
  const grouped = new Map();
  const merged = [];
  for (const item of items) {
    if (!validQuantity(item)) { merged.push(item); continue; }
    const key = JSON.stringify([item.category, item.unit, item.brand, [...new Set(item.requiredTags)].sort()]);
    const existing = grouped.get(key);
    if (existing) existing.quantity += item.quantity;
    else { grouped.set(key, item); merged.push(item); }
  }
  return merged;
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.items)) return defaults;
    const items = saved.items.slice(0, 50).filter((item) => item && catalogByCategory.has(item.category) && Number.isFinite(item.quantity) && item.quantity > 0).map((item) => ({
      id: nextId(), category: item.category, quantity: item.quantity,
      unit: catalogByCategory.get(item.category).unit,
      brand: item.brand === 'Demo Standard' ? item.brand : null,
      requiredTags: Array.isArray(item.requiredTags) ? item.requiredTags.filter((tag) => ['vegan', 'organic'].includes(tag)) : [],
    }));
    return {
      ...defaults, items,
      shoppingDate: validDate(saved.shoppingDate) ? saved.shoppingDate : defaults.shoppingDate,
      radiusM: Number.isFinite(saved.radiusM) && saved.radiusM >= 500 && saved.radiusM <= 5000 ? saved.radiusM : defaults.radiusM,
      walkingMinutes: Number.isFinite(saved.walkingMinutes) && saved.walkingMinutes >= 10 && saved.walkingMinutes <= 120 ? saved.walkingMinutes : defaults.walkingMinutes,
      maxStores: saved.maxStores === 1 ? 1 : 2,
      allowMembership: saved.allowMembership === true,
      origin: validOrigin(saved.origin) ? saved.origin : fallbackOrigin,
    };
  } catch { return defaults; }
}

let state = restoreState();

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Private browsing or storage restrictions do not block comparison. */ }
}

function update() {
  state.items = mergeEquivalentItems(state.items);
  saveState();
  renderItems();
  renderResults();
  byId('radius-value').textContent = distance(state.radiusM);
  byId('walking-value').textContent = `${state.walkingMinutes} min estimated`;
  byId('origin-summary').textContent = state.origin.lat === fallbackOrigin.lat && state.origin.lon === fallbackOrigin.lon ? 'Starting point · central Münster' : 'Starting point · custom coordinates';
}

function optionControl(item, labelText, checked, onChange) {
  const label = node('label');
  const input = node('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.setAttribute('aria-label', `${labelText} for ${catalogByCategory.get(item.category).label}`);
  input.addEventListener('change', () => { onChange(input.checked); update(); });
  label.append(input, node('span', '', labelText));
  return label;
}

function renderItems() {
  byId('item-count').textContent = `${state.items.length} ${state.items.length === 1 ? 'item' : 'items'}`;
  const container = byId('shopping-items');
  container.replaceChildren();
  if (!state.items.length) {
    container.append(node('p', 'quiet-note', 'Start with a staple above. Your comparison will appear as soon as you add an item.'));
    return;
  }
  for (const item of state.items) {
    const entry = catalogByCategory.get(item.category);
    const row = node('div', 'item-row');
    const top = node('div', 'item-top');
    const bullet = node('span', 'item-bullet', '◦');
    bullet.setAttribute('aria-hidden', 'true');
    const quantity = node('input', 'item-quantity');
    quantity.type = 'number'; quantity.min = item.unit === 'count' ? '1' : '0.001'; quantity.max = '10000'; quantity.step = item.unit === 'count' ? '1' : 'any'; quantity.required = true;
    quantity.value = Number.isFinite(item.quantity) ? item.quantity : '';
    quantity.setAttribute('aria-label', `Required quantity of ${entry.label} in ${unitLabel(item.unit)}`);
    quantity.addEventListener('change', () => { item.quantity = quantity.value === '' ? NaN : Number(quantity.value); update(); });
    const remove = node('button', 'remove-button', '×');
    remove.type = 'button'; remove.setAttribute('aria-label', `Remove ${entry.label}`);
    remove.addEventListener('click', () => { state.items = state.items.filter((candidate) => candidate.id !== item.id); update(); });
    top.append(bullet, node('span', 'item-name', entry.label), quantity, node('span', 'item-unit', unitLabel(item.unit)), remove);
    const options = node('div', 'item-options');
    options.append(optionControl(item, 'Demo Standard brand', item.brand === 'Demo Standard', (checked) => { item.brand = checked ? 'Demo Standard' : null; }));
    for (const tag of ['vegan', 'organic']) {
      options.append(optionControl(item, tag[0].toUpperCase() + tag.slice(1), item.requiredTags.includes(tag), (checked) => {
        item.requiredTags = checked ? [...new Set([...item.requiredTags, tag])] : item.requiredTags.filter((value) => value !== tag);
      }));
    }
    row.append(top, options); container.append(row);
  }
}

function safeSourceLink(source) {
  const url = typeof source === 'string' ? source : source?.url;
  const label = typeof source === 'object' && source ? source.label ?? source.name ?? 'Demo source' : 'Demo source';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return node('span', '', label);
    const link = node('a', '', label);
    link.href = parsed.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    return link;
  } catch { return node('span', '', label); }
}

function planStoreNames(plan) {
  return (plan.storeIds ?? []).map((id) => storeById.get(id)?.name ?? String(id)).join(' + ');
}

function planCard(plan, title, featured) {
  const card = node('article', `comparison-card${featured ? ' featured' : ''}`);
  const top = node('div', 'card-topline');
  top.append(node('h3', 'card-label', title), node('span', 'card-badge', `${state.items.length}/${state.items.length} items priced`));
  const price = node('div', 'price-line');
  price.append(node('span', 'basket-price', euros(plan.checkoutCents)), node('span', 'price-caption', 'at checkout · demo'));
  card.append(top, price, node('p', 'cost-detail', `${euros(plan.merchandiseCents)} groceries + ${euros(plan.depositCents)} refundable Pfand`), node('p', 'store-names', planStoreNames(plan)));
  const metrics = node('div', 'trip-metrics');
  metrics.append(node('span', '', `${plan.storeIds.length} ${plan.storeIds.length === 1 ? 'shop' : 'shops'}`), node('span', '', `${distance(plan.roundTripM)} round trip estimate`), node('span', '', `~${Math.ceil(plan.roundTripM / 80)} min estimate`));
  card.append(metrics, node('p', 'estimate-note', 'Fictional stores. Straight-line distance estimate, not a walking route. Includes returning to your starting point.'));
  const details = node('details', 'purchase-details');
  details.append(node('summary', '', 'See purchases and price evidence'));
  const list = node('ul', 'purchase-list');
  for (const purchase of plan.purchases) {
    const row = node('li', 'purchase-row');
    const name = node('div', 'purchase-title');
    name.append(node('span', '', purchase.productName), node('span', '', euros(purchase.checkoutCents)));
    row.append(name, node('p', 'purchase-meta', `${purchase.packs} ${purchase.packs === 1 ? 'pack' : 'packs'} · ${quantityFormat.format(purchase.purchasedQuantity)} ${unitLabel(purchase.unit)} purchased · ${quantityFormat.format(purchase.excessQuantity)} ${unitLabel(purchase.unit)} extra · ${storeById.get(purchase.storeId)?.name ?? purchase.storeId}`));
    if (purchase.depositCents > 0) row.append(node('p', 'purchase-meta', `Includes ${euros(purchase.depositCents)} refundable Pfand.`));
    const evidence = node('p', 'source-note');
    evidence.append(node('span', '', 'Fictional offer · '), safeSourceLink(purchase.source), node('span', '', ` · valid ${purchase.validFrom} to ${purchase.validTo}`));
    row.append(evidence); list.append(row);
  }
  details.append(list); card.append(details);
  return card;
}

function showEmpty(title, message) {
  const empty = node('div', 'empty-state');
  empty.append(node('h3', '', title), node('p', '', message));
  byId('comparison-results').append(empty);
}

function renderResults() {
  const results = byId('comparison-results');
  const partials = byId('partial-results');
  results.replaceChildren(); partials.replaceChildren();
  const summary = byId('results-summary');
  if (!state.items.length) {
    summary.textContent = 'Your basket is empty.';
    showEmpty('A good trip starts with a list.', 'Add an item to compare fictional complete baskets within your chosen limits.'); return;
  }
  if (!validDate(state.shoppingDate) || !validOrigin(state.origin) || state.items.some((item) => !validQuantity(item))) {
    summary.textContent = 'Check your inputs before comparing.';
    showEmpty('A little detail needs fixing.', 'Use a valid date, latitude between −90 and 90, longitude between −180 and 180, and item quantities greater than zero and no more than 10,000. Counted items require whole numbers.'); return;
  }
  let comparison;
  try {
    comparison = planBasket({ items: state.items, stores, offers, origin: state.origin, shoppingDate: state.shoppingDate, mode: 'demo', radiusM: state.radiusM, maxRoundTripM: state.walkingMinutes * 80, maxStores: state.maxStores, allowMembership: state.allowMembership });
  } catch {
    summary.textContent = 'The comparison could not be calculated.';
    showEmpty('We could not compare this basket.', 'Adjust the list or trip settings and try again. No incomplete basket has been ranked as cheapest.'); return;
  }
  const plans = comparison.plans.filter((plan) => plan.complete).slice().sort((a, b) => a.checkoutCents - b.checkoutCents || a.roundTripM - b.roundTripM || a.storeIds.length - b.storeIds.length);
  const best = plans[0];
  const single = plans.find((plan) => plan.storeIds.length === 1);
  summary.textContent = `${plans.length} complete fictional ${plans.length === 1 ? 'option' : 'options'} for ${state.shoppingDate}. Whole-pack checkout totals include Pfand. Price coverage is limited to the demo catalogue.`;
  if (!best) {
    showEmpty('No complete basket within these limits.', 'Try a wider radius or time budget, relax an item constraint, or choose a date with valid demo offers. Missing items are shown below and never treated as free.');
  } else {
    if (single && best.checkoutCents < single.checkoutCents) results.append(node('p', 'savings-note', `${euros(single.checkoutCents - best.checkoutCents)} less than the best single-shop basket · ${Math.max(0, Math.ceil(best.roundTripM / 80) - Math.ceil(single.roundTripM / 80))} extra estimated minutes.`));
    results.append(planCard(best, 'Lowest compared complete basket', true));
    if (single && single !== best) results.append(planCard(single, 'Best single shop', false));
    else if (single) results.append(node('p', 'quiet-note', 'The lowest-cost complete option is also the best single-shop option.'));
    else results.append(node('p', 'quiet-note', 'No single shop covers the full list within these limits.'));
  }
  if (comparison.partials?.length) {
    const section = node('section', 'partial-section');
    section.append(node('h3', '', 'Partial matches · not ranked as cheapest'), node('p', 'partial-intro', 'These options are missing items. Their subtotals are not comparable with a complete basket.'));
    for (const partial of comparison.partials.slice(0, 4)) {
      const missing = (partial.missingItemIds ?? []).map((id) => state.items.find((item) => item.id === id)).filter(Boolean).map((item) => catalogByCategory.get(item.category).label);
      const row = node('div', 'partial-row');
      row.append(node('strong', '', planStoreNames(partial)), node('p', '', `Missing: ${missing.join(', ') || 'unavailable price evidence'}.`));
      section.append(row);
    }
    partials.append(section);
  }
}

for (const entry of catalog) {
  const option = node('option', '', `${entry.label} · ${unitLabel(entry.unit)}`);
  option.value = entry.category; byId('catalog-select').append(option);
}

byId('add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const entry = catalogByCategory.get(byId('catalog-select').value);
  if (!entry || state.items.length >= 50) return;
  const existing = state.items.find((item) => item.category === entry.category && item.brand === null && item.requiredTags.length === 0);
  if (existing && Number.isFinite(existing.quantity)) existing.quantity += entry.defaultQuantity;
  else state.items.push({ id: nextId(), category: entry.category, quantity: entry.defaultQuantity, unit: entry.unit, brand: null, requiredTags: [] });
  update();
});

const bindValue = (id, stateKey, convert = (value) => value) => {
  const control = byId(id); control.value = state[stateKey];
  control.addEventListener('change', () => { state[stateKey] = convert(control.value); update(); });
};
bindValue('shopping-date', 'shoppingDate');
bindValue('max-stores', 'maxStores', Number);
bindValue('radius', 'radiusM', Number);
bindValue('walking-minutes', 'walkingMinutes', Number);
byId('allow-membership').checked = state.allowMembership;
byId('allow-membership').addEventListener('change', (event) => { state.allowMembership = event.target.checked; update(); });
for (const [id, key] of [['origin-lat', 'lat'], ['origin-lon', 'lon']]) {
  byId(id).value = state.origin[key];
  byId(id).addEventListener('change', (event) => { state.origin = { ...state.origin, [key]: event.target.value === '' ? NaN : Number(event.target.value) }; update(); });
}
const MAX_AUDIT_BYTES = 2 * 1024 * 1024;
let auditReadSequence = 0;

function renderAudit(view) {
  const container = byId('audit-summary');
  container.replaceChildren();
  const stats = node('div', 'audit-stats');
  for (const [value, label] of [
    [view.recordCount, 'Observation records'],
    [view.locationCount, 'Distinct provider location IDs'],
    [view.productCount, 'Distinct product codes'],
    [view.freshness.recent, 'Recent relative to the report reference day'],
  ]) {
    const stat = node('div', 'audit-stat');
    stat.append(node('strong', '', String(value)), node('span', '', label));
    stats.append(stat);
  }
  container.append(stats);
  const dates = view.oldestObservationDate && view.newestObservationDate ? `${view.oldestObservationDate} to ${view.newestObservationDate}` : 'No valid observation dates';
  container.append(node('p', 'audit-detail', `Observation dates: ${dates}.`));
  container.append(node('p', 'audit-detail', `Imported report reference day: ${view.referenceDate}. Recent means ${view.recentSince} to ${view.referenceDate}, inclusive (${view.recentDays} calendar days). This is not a freshness check against today.`));
  container.append(node('p', 'audit-detail', `${view.freshness.older} older · ${view.freshness.future} after the report reference day · ${view.freshness.missing} missing dates · ${view.freshness.invalid} invalid dates.`));
  const declaredTotal = view.providerTotal === null ? 'unknown provider total' : `${view.providerTotal} provider records`;
  container.append(node('p', 'audit-detail', `The file declares ${declaredTotal}; ${view.truncated ? 'retrieval was truncated' : 'retrieval was not truncated'}. Declared retrieval metadata and file provenance are not independently verified.`));
  const gaps = [
    ['packQuantity', 'pack quantity'], ['packUnit', 'pack unit'], ['price', 'price'],
    ['currency', 'currency'], ['locationId', 'location ID'], ['proofId', 'proof reference'],
  ].filter(([key]) => view.missingFields[key] > 0).map(([key, label]) => `${view.missingFields[key]} missing ${label}`);
  if (gaps.length) container.append(node('p', 'audit-detail', `Evidence gaps: ${gaps.join('; ')}.`));
  const scope = view.locationCount === 1 ? 'This file contains one provider location identifier, whose supermarket branch identity has not been verified.' : 'Provider location identifiers are not verified supermarket branches.';
  container.append(node('p', 'audit-warning', `Historical observation inspection only. ${scope} Product codes do not establish shopping-list coverage. These records do not confirm current prices, stock, or a complete basket and are not used in the fictional comparison above.`));
}

byId('audit-file').addEventListener('change', async (event) => {
  const ticket = ++auditReadSequence;
  const file = event.target.files?.[0];
  byId('audit-summary').replaceChildren();
  byId('audit-clear').hidden = !file;
  if (!file) {
    byId('audit-status').textContent = 'Select a local audit JSON to view its evidence profile.';
    return;
  }
  if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_AUDIT_BYTES) {
    byId('audit-status').textContent = 'This file is too large or has an invalid size. Choose an audit JSON no larger than 2 MiB.';
    return;
  }
  byId('audit-status').textContent = 'Reading the selected local file. Nothing is uploaded.';
  let text;
  try { text = await file.text(); }
  catch {
    if (ticket === auditReadSequence) byId('audit-status').textContent = 'This local file could not be read. Choose it again or select another audit JSON.';
    return;
  }
  if (ticket !== auditReadSequence) return;
  try {
    const view = parseAuditReport(text, { maxBytes: MAX_AUDIT_BYTES, maxRecords: 300 });
    renderAudit(view);
    byId('audit-status').textContent = 'Aggregate counters recomputed from the selected file. File authenticity is unverified; its raw records are not displayed or saved.';
  } catch {
    byId('audit-summary').replaceChildren();
    byId('audit-status').textContent = 'This is not a supported audit JSON, or its content exceeds the limits. Choose a report produced by the audit command with at most 300 observations and a maximum size of 2 MiB.';
  }
});

byId('audit-clear').addEventListener('click', () => {
  ++auditReadSequence;
  byId('audit-file').value = '';
  byId('audit-summary').replaceChildren();
  byId('audit-clear').hidden = true;
  byId('audit-status').textContent = 'Inspection cleared. No audit data was saved by this app.';
});

update();
