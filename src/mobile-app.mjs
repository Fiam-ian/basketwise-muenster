import { foodIcon } from './food-icons.mjs';
import { buildProductPicker, searchPickerProducts, addPickedProduct, changePickedQuantity, pickedBasketCoverage } from './product-picker.mjs';
import { parseOfferView, OFFER_VIEW_MAX_BYTES, isOfferDate } from './offer-view.mjs';
const $ = id => document.getElementById(id);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const artFor = (product, className) => { const art = el('div', undefined, className); art.append(foodIcon(product.category)); return art; };
const categories = [['', 'All'], ['milk', 'Milk'], ['pasta', 'Pasta'], ['tomatoes', 'Produce'], ['water', 'Drinks'], ['eggs', 'Eggs'], ['oats', 'Breakfast']];
let reports = [], products = [], basket = [], category = '', generation = 0, installPrompt;
const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
$('app-shopping-date').value = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
const packLabel = product => product.packAmbiguity ? 'Pack size awaiting review' : `${product.packQuantity >= 1000 && ['g', 'ml'].includes(product.unit) ? product.packQuantity / 1000 : product.packQuantity} ${product.packQuantity >= 1000 && product.unit === 'ml' ? 'L' : product.packQuantity >= 1000 && product.unit === 'g' ? 'kg' : product.unit === 'count' ? 'pieces' : product.unit}${product.fatBasisPoints == null ? '' : ` · ${product.fatBasisPoints / 100}% fat`}`;
function navigate(screen) {
  for (const name of ['explore', 'basket', 'stores']) $('screen-' + name).hidden = name !== screen;
  for (const button of document.querySelectorAll('[data-screen]')) { if (button.dataset.screen === screen) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); }
  window.scrollTo(0, 0);
}
for (const button of document.querySelectorAll('[data-screen]')) button.addEventListener('click', () => navigate(button.dataset.screen));
$('location-button').addEventListener('click', () => navigate('stores'));
$('browse-products').addEventListener('click', () => navigate('explore'));
function add(product) {
  try { basket = addPickedProduct(basket, product); $('app-status').textContent = `${product.name} added to your basket.`; renderProducts(); renderBasket(); }
  catch { $('app-status').textContent = 'Maximum 99 of one listing and 50 distinct selections.'; }
}
function detail(product) {
  const content = $('detail-content'); content.replaceChildren(el('h2', product.name), artFor(product, `product-art art-${product.category}`), el('p', packLabel(product), 'product-meta'));
  const button = el('button', 'Add to basket', 'primary'); button.type = 'button'; button.addEventListener('click', () => { add(product); $('product-detail').close(); }); content.append(button);
  content.append(el('p', 'Captured advertisement. Stock and equivalent cheaper alternatives are not verified.', 'muted'));
  for (const listing of product.listings) {
    const card = el('section', undefined, 'store-card'); card.append(el('h3', listing.storeName), el('p', `${money.format(listing.candidate.priceCents / 100)} advertised · ${listing.validFrom} – ${listing.validTo}`), el('p', listing.candidate.conditions));
    const details = el('details'), summary = el('summary', 'Source & outstanding checks'); details.append(summary,
      el('p', listing.candidate.depositCents == null ? 'Pfand unknown; checkout total unavailable.' : `Recorded Pfand: ${money.format(listing.candidate.depositCents / 100)}; review pending.`),
      el('p', listing.candidate.packAmbiguity ?? 'Priced pack and product equivalence require review.'),
      el('p', `Captured ${listing.retrievedAt}. ${listing.leafletLabel}.`), el('p', listing.candidate.remainingReview.join(', ').replaceAll('_', ' ')));
    const link = el('a', 'Official branch page'); link.href = listing.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; details.append(link); card.append(details); content.append(card);
  }
  $('product-detail').showModal();
}
$('close-detail').addEventListener('click', () => $('product-detail').close());
for (const [value, label] of categories) {
  const button = el('button', label, 'chip'); button.type = 'button'; button.setAttribute('aria-pressed', String(category === value));
  button.addEventListener('click', () => { category = value; for (const chip of $('category-chips').children) chip.setAttribute('aria-pressed', String(chip === button)); renderProducts(); }); $('category-chips').append(button);
}
function renderProducts() {
  const matches = searchPickerProducts(products, $('product-search').value, category);
  $('catalogue-count').textContent = `${matches.length} ${matches.length === 1 ? 'product' : 'products'}`;
  $('catalogue-note').textContent = reports.length ? `Partial leaflet catalogue · ${new Set(reports.map(report => report.storeId)).size} branches · captured offers, not live stock.` : 'No local product data loaded. Open Stores → Local data to load reports.';
  $('product-grid').replaceChildren(); $('catalogue-empty').hidden = matches.length > 0;
  for (const product of matches) {
    const card = el('article', undefined, 'product-card'), open = el('button', undefined, 'product-open'); open.type = 'button'; open.setAttribute('aria-label', `View ${product.name}`);
    const art = artFor(product, `product-art art-${product.category}`); art.setAttribute('aria-hidden', 'true'); open.append(art, el('h3', product.name), el('p', packLabel(product), 'product-meta')); open.addEventListener('click', () => detail(product)); card.append(open);
    const foot = el('div', undefined, 'product-foot'), price = el('div'); price.append(el('span', money.format(product.listings[0].candidate.priceCents / 100), 'price'), el('p', 'Advertised price', 'price-note')); foot.append(price);
    const button = el('button', '+', 'add-button'); button.type = 'button'; button.setAttribute('aria-label', `Add ${product.name} to basket`); button.addEventListener('click', () => add(product)); foot.append(button); card.append(foot);
    const count = basket.find(line => line.product.id === product.id)?.count;
    if (count) card.append(el('p', `${count} in your basket`, 'selected-note'));
    $('product-grid').append(card);
  }
}
function renderBasket() {
  $('basket-lines').replaceChildren(); $('basket-empty').hidden = !!basket.length; $('basket-comparison').hidden = !basket.length;
  const total = basket.reduce((sum, line) => sum + line.count, 0); $('basket-badge').textContent = total; $('basket-badge').hidden = !total;
  for (const line of basket) {
    const row = el('article', undefined, 'basket-row'), art = artFor(line.product, 'basket-art'); art.setAttribute('aria-hidden', 'true'); row.append(art);
    const info = el('div', undefined, 'basket-info'); info.append(el('h3', line.product.name), el('p', packLabel(line.product), 'product-meta'));
    if (!products.some(product => product.id === line.product.id)) info.append(el('p', 'Source no longer loaded; selection preserved.', 'muted'));
    const stepper = el('div', undefined, 'stepper');
    for (const [label, delta] of [['−', -1], ['+', 1]]) {
      const button = el('button', label); button.type = 'button'; button.disabled = delta === 1 && line.count === 99; button.setAttribute('aria-label', `${delta === 1 ? 'Increase' : 'Decrease'} quantity of ${line.product.name}`);
      button.addEventListener('click', () => { basket = changePickedQuantity(basket, line.product.id, line.count + delta); renderBasket(); renderProducts(); });
      stepper.append(button); if (delta === -1) stepper.append(el('span', String(line.count)));
    }
    info.append(stepper); row.append(info); $('basket-lines').append(row);
  }
  $('basket-branches').replaceChildren();
  if (!basket.length) return;
  if (!isOfferDate($('app-shopping-date').value)) { $('basket-branches').append(el('p', 'Choose a valid shopping date.')); return; }
  const coverage = pickedBasketCoverage(reports, basket, $('app-shopping-date').value);
  if (!coverage.length) $('basket-branches').append(el('p', 'Load branch reports to check your selections.'));
  for (const branch of coverage) {
    const card = el('section', undefined, 'store-card'); card.append(el('h3', branch.storeName), el('p', `${branch.capturedLines} of ${branch.requestedLines} selected products captured here · ${branch.inPeriodLines} in recorded period.`), el('span', 'Checkout evidence pending', 'store-tag')); $('basket-branches').append(card);
  }
}
function renderStores() {
  $('store-list').replaceChildren();
  const branches = [...new Map(reports.map(report => [report.storeId, report])).values()];
  for (const branch of branches) {
    const card = el('article', undefined, 'store-card'); card.append(el('h3', branch.storeName), el('p', branch.address), el('span', 'Captured leaflet offers', 'store-tag')); $('store-list').append(card);
  }
  for (const name of ['REWE Geiststraße', 'Netto Weseler Straße']) { const card = el('article', undefined, 'store-card'); card.append(el('h3', name), el('p', 'App-source access trial pending'), el('span', 'No catalogue connected', 'store-tag')); $('store-list').append(card); }
}
function accept(next) { const catalogue = buildProductPicker(next); reports = next; products = catalogue; renderProducts(); renderBasket(); renderStores(); }
async function loadCatalogue() {
  const token = ++generation;
  try { const response = await fetch('./api/catalogue', { cache: 'no-store' }); if (!response.ok) throw Error(); const payload = await response.json(); if (!Array.isArray(payload.reports)) throw Error(); if (token !== generation) return; const next = payload.reports.map(report => parseOfferView(JSON.stringify({ ...report, mode: 'advertised_candidates' }))); accept(next); $('app-status').textContent = next.length ? 'Local catalogue loaded.' : 'No branch reports configured.'; }
  catch { if (token !== generation) return; accept([]); $('app-status').textContent = 'Local source unavailable. Load reports in Stores, or reconnect to the local server.'; }
}
$('reload-catalogue').addEventListener('click', loadCatalogue);
$('app-report-files').addEventListener('change', async event => {
  const token = ++generation;
  try { const files = [...event.target.files]; if (!files.length) return; if (files.length > 3 || files.some(file => file.size > OFFER_VIEW_MAX_BYTES)) throw Error(); const next = await Promise.all(files.map(async file => parseOfferView(await file.text()))); if (token !== generation) return; accept(next); $('app-status').textContent = 'Private reports loaded.'; }
  catch { if (token !== generation) return; $('app-status').textContent = 'Unsupported reports. Existing catalogue and basket preserved.'; }
});
$('product-search').addEventListener('input', renderProducts);
$('app-shopping-date').addEventListener('change', renderBasket);
$('clear-basket').addEventListener('click', () => { basket = []; renderBasket(); renderProducts(); $('app-status').textContent = 'Basket cleared.'; });
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('install-app').hidden = false; });
$('install-app').addEventListener('click', async () => { if (!installPrompt) return; await installPrompt.prompt(); installPrompt = undefined; $('install-app').hidden = true; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./app-sw.mjs', { scope: './' }).catch(() => { $('install-note').textContent = 'Offline app shell unavailable in this browser.'; });
renderProducts(); renderBasket(); renderStores(); loadCatalogue();
