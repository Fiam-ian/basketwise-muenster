import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../src/app.mjs', import.meta.url), 'utf8').replace(/^import .*;\s*$/gm, '');

function makeElement(tag = 'div') {
  const listeners = new Map();
  let value = '';
  return {
    tag, children: [], attributes: {}, textContent: '', checked: false,
    get value() { return value; }, set value(next) { value = String(next); },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = [...children]; this.textContent = ''; },
    setAttribute(name, next) { this.attributes[name] = String(next); },
    addEventListener(name, handler) { listeners.set(name, handler); },
    dispatch(name) { return listeners.get(name)?.({ target: this, preventDefault() {} }); },
  };
}

function fixture(source, savedValue, storageAvailable = true, auditParser = () => auditView()) {
  const elements = new Map();
  const document = {
    getElementById(id) { if (!elements.has(id)) elements.set(id, makeElement()); return elements.get(id); },
    createElement: makeElement,
  };
  let saved = savedValue;
  const localStorage = {
    getItem() { if (!storageAvailable) throw new Error('Storage unavailable'); return saved ?? null; },
    setItem(key, value) { if (!storageAvailable) throw new Error('Storage unavailable'); saved = value; },
  };
  const catalog = [
    { category: 'pasta', label: 'Pasta', unit: 'g', defaultQuantity: 750 },
    { category: 'eggs', label: 'Eggs', unit: 'count', defaultQuantity: 6 },
  ];
  const stores = [{ id: 'a', name: 'Demo A', lat: 51.96, lon: 7.62 }, { id: 'b', name: 'Demo B', lat: 51.961, lon: 7.625 }];
  const calls = [];
  const planBasket = (request) => {
    calls.push(JSON.parse(JSON.stringify(request)));
    const purchases = request.items.map((item) => {
      const packQuantity = item.unit === 'count' ? 6 : 500;
      const packs = Math.ceil(item.quantity / packQuantity);
      return { itemId: item.id, storeId: 'a', offerId: `offer-${item.category}`, productName: `Demo ${item.category}`, packs, purchasedQuantity: packs * packQuantity, excessQuantity: packs * packQuantity - item.quantity, unit: item.unit, merchandiseCents: packs * 100, depositCents: 0, checkoutCents: packs * 100, source: { label: 'Unsafe link remains text', url: 'javascript:alert(1)' }, validFrom: '2026-10-01', validTo: '2026-10-31' };
    });
    const total = purchases.reduce((sum, purchase) => sum + purchase.checkoutCents, 0);
    const base = { stores, purchases, merchandiseCents: total, depositCents: 0, checkoutCents: total, roundTripM: 1000, distanceKind: 'straight-line', complete: true, missingItemIds: [] };
    return { plans: [{ ...base, storeIds: ['a', 'b'] }, { ...base, storeIds: ['a'], merchandiseCents: total + 100, checkoutCents: total + 100 }], partials: [{ ...base, storeIds: ['b'], complete: false, missingItemIds: [request.items[0].id] }], rejectedOfferCount: 0 };
  };
  const start = new Function('document', 'localStorage', 'stores', 'offers', 'catalog', 'defaultOrigin', 'planBasket', 'parseAuditReport', `${source}\nreturn { getState: () => state, update };`);
  const runtime = start(document, localStorage, stores, [], catalog, { lat: 51.96, lon: 7.62 }, planBasket, auditParser);
  return { document, calls, runtime, storedValue: () => saved };
}

function textOf(element) {
  return String(element.textContent ?? '') + element.children.map((child) => typeof child === 'string' ? child : textOf(child)).join(' ');
}

function allElements(element) {
  return [element, ...element.children.flatMap((child) => typeof child === 'string' ? [] : allElements(child))];
}

test('UI smoke: render, safe sources, duplicate quantities, input errors, empty list and inaccessible storage', () => {
  const { document, calls, runtime } = fixture(appSource);
  assert.equal(calls.length, 1);
  assert.match(textOf(document.getElementById('comparison-results')), /Lowest compared complete basket/);
  assert.match(textOf(document.getElementById('comparison-results')), /Best single shop/);
  assert.match(textOf(document.getElementById('partial-results')), /Missing: Pasta/);
  assert.equal(allElements(document.getElementById('comparison-results')).filter((element) => element.tag === 'a').length, 0);

  document.getElementById('catalog-select').value = 'pasta';
  document.getElementById('add-form').dispatch('submit');
  assert.equal(calls.at(-1).items.filter((item) => item.category === 'pasta').length, 1);
  assert.equal(calls.at(-1).items.find((item) => item.category === 'pasta').quantity, 1500);
  assert.equal(runtime.getState().items.length, 2);

  const quantity = allElements(document.getElementById('shopping-items')).find((element) => element.className === 'item-quantity');
  quantity.value = '750'; quantity.dispatch('change');
  assert.equal(calls.at(-1).items.find((item) => item.category === 'pasta').quantity, 750);
  document.getElementById('allow-membership').checked = true;
  document.getElementById('allow-membership').dispatch('change');
  assert.equal(calls.at(-1).allowMembership, true);

  let before = calls.length;
  document.getElementById('shopping-date').value = '2026-02-31';
  document.getElementById('shopping-date').dispatch('change');
  assert.equal(calls.length, before);
  assert.match(textOf(document.getElementById('comparison-results')), /detail needs fixing/);
  document.getElementById('shopping-date').value = '2026-10-07';
  document.getElementById('shopping-date').dispatch('change');
  before = calls.length;
  document.getElementById('origin-lat').value = '999'; document.getElementById('origin-lat').dispatch('change');
  assert.equal(calls.length, before);
  document.getElementById('origin-lat').value = '51.96'; document.getElementById('origin-lat').dispatch('change');

  const eggs = runtime.getState().items.find((item) => item.category === 'eggs');
  eggs.quantity = 1.5; before = calls.length; runtime.update();
  assert.equal(calls.length, before);
  assert.match(textOf(document.getElementById('comparison-results')), /Counted items require whole numbers/);
  eggs.quantity = 6; runtime.update();
  while (runtime.getState().items.length) {
    const remove = allElements(document.getElementById('shopping-items')).find((element) => element.className === 'remove-button');
    remove.dispatch('click');
  }
  assert.match(textOf(document.getElementById('comparison-results')), /A good trip starts with a list/);
  assert.equal(document.getElementById('partial-results').children.length, 0);
  assert.doesNotThrow(() => fixture(appSource, null, false));
});

test('UI smoke: restored and converging equivalent lines merge before pack rounding', () => {
  const saved = JSON.stringify({ items: [
    { category: 'pasta', quantity: 750, brand: null, requiredTags: [] },
    { category: 'pasta', quantity: 750, brand: null, requiredTags: [] },
  ] });
  const { runtime, calls } = fixture(appSource, saved);
  assert.equal(calls[0].items.length, 1);
  assert.equal(calls[0].items[0].quantity, 1500);
  runtime.getState().items.push({ id: 'constraint-line', category: 'pasta', quantity: 750, unit: 'g', brand: null, requiredTags: ['organic'] });
  runtime.update(); assert.equal(calls.at(-1).items.length, 2);
  runtime.getState().items.find((item) => item.id === 'constraint-line').requiredTags = [];
  runtime.update(); assert.equal(calls.at(-1).items.length, 1);
  assert.equal(calls.at(-1).items[0].quantity, 2250);
});

function auditView() {
  return {
    recordCount: 22, locationCount: 1, productCount: 22,
    referenceDate: '2026-10-07', oldestObservationDate: '2026-09-26', newestObservationDate: '2026-09-26',
    freshness: { recent: 22, older: 0, future: 0, missing: 0, invalid: 0 },
    providerTotal: 22, truncated: false, recentDays: 14, recentSince: '2026-09-24',
    missingFields: { packQuantity: 22, packUnit: 22, price: 0, currency: 0, locationId: 0, proofId: 0 },
  };
}

test('UI audit inspection: aggregate-only rendering and no persistence or basket insertion', async () => {
  let parserCalls = 0;
  const { document, calls, storedValue } = fixture(appSource, null, true, (text, options) => {
    parserCalls++;
    assert.equal(options.maxBytes, 2097152); assert.equal(options.maxRecords, 300);
    assert.match(text, /PRIVATE_OWNER_MARKER/); return auditView();
  });
  const originalBasketCalls = calls.length;
  const originalStoredValue = storedValue();
  document.getElementById('audit-file').files = [{ size: 90, text: async () => '{"owner":"PRIVATE_OWNER_MARKER","proof":"https://private.invalid/receipt"}' }];
  await document.getElementById('audit-file').dispatch('change');
  const visible = textOf(document.getElementById('audit-summary'));
  assert.equal(parserCalls, 1);
  assert.match(visible, /2026-09-26/); assert.match(visible, /Imported report reference day: 2026-10-07/);
  assert.match(visible, /one provider location identifier/); assert.match(visible, /Historical observation inspection only/);
  assert.equal(visible.includes('PRIVATE_OWNER_MARKER'), false); assert.equal(visible.includes('private.invalid'), false);
  assert.equal(calls.length, originalBasketCalls); assert.equal(storedValue(), originalStoredValue);
});

test('UI audit inspection: oversize files are rejected before reading', async () => {
  let reads = 0; let parses = 0;
  const { document } = fixture(appSource, null, true, () => { parses++; return auditView(); });
  document.getElementById('audit-file').files = [{ size: 2097153, text: async () => { reads++; return '{}'; } }];
  await document.getElementById('audit-file').dispatch('change');
  assert.equal(reads, 0); assert.equal(parses, 0);
  assert.match(textOf(document.getElementById('audit-status')), /too large/);
  assert.equal(document.getElementById('audit-summary').children.length, 0);
});

test('UI audit inspection: invalid reports show static errors without raw details', async () => {
  const { document } = fixture(appSource, null, true, () => { throw new Error('PRIVATE_OWNER_MARKER https://private.invalid/receipt'); });
  document.getElementById('audit-file').files = [{ size: 20, text: async () => 'invalid report' }];
  await document.getElementById('audit-file').dispatch('change');
  const visible = textOf(document.getElementById('audit-status'));
  assert.match(visible, /not a supported audit JSON/);
  assert.equal(visible.includes('PRIVATE_OWNER_MARKER'), false);
  assert.equal(document.getElementById('audit-summary').children.length, 0);
});

test('UI audit inspection: clearing prevents an outstanding read from restoring data', async () => {
  let finishRead;
  const { document } = fixture(appSource);
  document.getElementById('audit-file').files = [{ size: 2, text: () => new Promise((resolve) => { finishRead = resolve; }) }];
  const pending = document.getElementById('audit-file').dispatch('change');
  document.getElementById('audit-clear').dispatch('click');
  finishRead('{}'); await pending;
  assert.equal(document.getElementById('audit-summary').children.length, 0);
  assert.equal(document.getElementById('audit-clear').hidden, true);
  assert.match(textOf(document.getElementById('audit-status')), /Inspection cleared/);
});
