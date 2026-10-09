import { parseAppReport, isNativeReport, APP_REPORT_LIMIT } from './native-app-data.mjs';
import { nativePriceDisplay } from './native-price-display.mjs';
import { foodIcon } from './food-icons.mjs';
import { buildProductPicker, searchPickerProducts, addPickedProduct, changePickedQuantity, pickedBasketCoverage } from './product-picker.mjs';
import { parseOfferView, OFFER_VIEW_MAX_BYTES, isOfferDate } from './offer-view.mjs';
const $ = id => document.getElementById(id);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
const replace = (element, ...children) => { element.textContent = ''; element.append(...children); };
const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const artFor = (product, className) => { const art = el('div', undefined, className); if (product.native) art.append(el('span', '▧')); else art.append(foodIcon(product.category)); return art; };
const categories = [['', 'All'], ['unclassified', 'App catalogue'], ['milk', 'Milk'], ['pasta', 'Pasta'], ['tomatoes', 'Produce'], ['water', 'Drinks'], ['eggs', 'Eggs'], ['oats', 'Breakfast']];
let reports = [], products = [], basket = [], category = '', generation = 0, installPrompt;
const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
$('app-shopping-date').value = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
const packLabel = product => product.native ? `${product.brandDisplay ? product.brandDisplay + ' · ' : ''}${product.packDisplay}` : product.packAmbiguity ? 'Pack size awaiting review' : `${product.packQuantity >= 1000 && ['g', 'ml'].includes(product.unit) ? product.packQuantity / 1000 : product.packQuantity} ${product.packQuantity >= 1000 && product.unit === 'ml' ? 'L' : product.packQuantity >= 1000 && product.unit === 'g' ? 'kg' : product.unit === 'count' ? 'pieces' : product.unit}${product.fatBasisPoints == null ? '' : ` · ${product.fatBasisPoints / 100}% fat`}`;
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
  const content = $('detail-content'); replace(content, el('h2', product.name), artFor(product, `product-art art-${product.category}`), el('p', packLabel(product), 'product-meta'));
  const button = el('button', 'Add to basket', 'primary'); button.type = 'button'; button.addEventListener('click', () => { add(product); $('product-detail').close(); }); content.append(button);
  content.append(el('p', product.native ? 'Captured app listing. Branch applicability, stock and equivalent alternatives are unverified.' : 'Captured advertisement. Stock and equivalent cheaper alternatives are not verified.', 'muted'));
  for (const listing of product.listings) {
    const card = el('section', undefined, 'store-card');
    if (product.native) {
      const display = nativePriceDisplay(listing.candidate, listing.priceChannel);
      if (listing.priceChannel === 'lidl_app_guest_offers') {
        card.append(el('h3', listing.storeName), el('p', listing.channelLabel), el('p', display.primaryCents == null ? display.primaryLabel : `${display.primaryLabel}: ${money.format(display.primaryCents / 100)}`));
        if (display.loyaltyCents != null) card.append(el('p', `With Lidl Plus: ${money.format(display.loyaltyCents / 100)} · membership conditions unreviewed.`));
        card.append(el('p', 'Captured offer; pack, dates and Pfand need checking. No checkout total.'));
        const source = el('details'); source.append(el('summary', 'Offer conditions & source'));
        if (display.referenceCents != null) source.append(el('p', `Reference amount: ${money.format(display.referenceCents / 100)} · not an ordinary offer amount.`));
        if (listing.candidate.priceAndPackDisplay) source.append(el('p', `Recorded price and pack conditions: ${listing.candidate.priceAndPackDisplay}`));
        if (listing.candidate.validityDisplay) source.append(el('p', `Recorded period (year unreviewed): ${listing.candidate.validityDisplay}`));
        source.append(el('p', `Captured ${listing.retrievedAt.slice(0, 10)}`), el('p', 'Selected branch is a capture-session context; per-product applicability is unverified.'));
        card.append(source);
      } else {
        card.append(el('h3', listing.storeName), el('p', listing.channelLabel), el('p', display.primaryCents == null ? display.primaryLabel : `${display.primaryLabel}: ${money.format(display.primaryCents / 100)}`), el('p', `Captured ${listing.retrievedAt.slice(0, 10)}`), el('p', 'Validity and Pfand unreviewed; no checkout total.'), el('p', listing.candidate.priceConflicted ? 'Conflicting source prices; excluded from comparison.' : 'Price not verified for checkout.'), el('p', [...(listing.candidate.flagsDisplay ?? []), listing.candidate.priceFootnoteDisplay ?? '', listing.candidate.unitPriceDisplay ?? ''].filter(Boolean).join(' · ')));
      }
      if (listing.priceChannel === 'pickup') card.append(el('p', 'Pickup branch is a capture-session assertion; product screens do not repeat its header.'));
      content.append(card); continue;
    }
    card.append(el('h3', listing.storeName), el('p', `${money.format(listing.candidate.priceCents / 100)} advertised · ${listing.validFrom} – ${listing.validTo}`), el('p', listing.candidate.conditions));
    const details = el('details'), summary = el('summary', 'Source & outstanding checks'); details.append(summary,
      el('p', listing.candidate.depositCents == null ? 'Pfand unknown; checkout total unavailable.' : `Recorded Pfand: ${money.format(listing.candidate.depositCents / 100)}; review pending.`),
      el('p', listing.candidate.packAmbiguity ?? 'Priced pack and product equivalence require review.'),
      el('p', `Captured ${listing.retrievedAt}. ${listing.leafletLabel}.`), el('p', listing.candidate.remainingReview.join(', ').split('_').join(' ')));
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
  $('catalogue-note').textContent = reports.length ? 'Partial captured catalogue · app channels and leaflet offers kept separate · no verified stock or checkout totals.' : 'No local product data loaded. Open Stores → Local data to load reports.';
  replace($('product-grid')); $('catalogue-empty').hidden = matches.length > 0;
  for (const product of matches) {
    const card = el('article', undefined, 'product-card'), open = el('button', undefined, 'product-open'); open.type = 'button'; open.setAttribute('aria-label', `View ${product.name}`);
    const art = artFor(product, `product-art art-${product.category}`); art.setAttribute('aria-hidden', 'true'); open.append(art, el('h3', product.name), el('p', packLabel(product), 'product-meta')); open.addEventListener('click', () => detail(product)); card.append(open);
    const listing = product.listings[0], display = nativePriceDisplay(listing.candidate, listing.priceChannel);
    const foot = el('div', undefined, 'product-foot'), price = el('div'); price.append(el('span', display.primaryCents == null ? display.primaryLabel : money.format(display.primaryCents / 100), 'price'), el('p', product.native ? listing.channelLabel : 'Advertised price', 'price-note'));
    if (listing.priceChannel === 'lidl_app_guest_offers') {
      if (display.primaryCents != null) price.append(el('p', display.primaryLabel, 'price-note'));
      if (display.loyaltyCents != null) price.append(el('p', `With Lidl Plus: ${money.format(display.loyaltyCents / 100)}`, 'price-note'));
    }
    price.append(el('p', `Captured ${listing.retrievedAt.slice(0, 10)}`, 'price-note')); foot.append(price);
    const button = el('button', '+', 'add-button'); button.type = 'button'; button.setAttribute('aria-label', `Add ${product.name} to basket`); button.addEventListener('click', () => add(product)); foot.append(button); card.append(foot);
    const count = basket.find(line => line.product.id === product.id)?.count;
    if (count) card.append(el('p', `${count} in your basket`, 'selected-note'));
    $('product-grid').append(card);
  }
}
function renderBasket() {
  replace($('basket-lines')); $('basket-empty').hidden = !!basket.length; $('basket-comparison').hidden = !basket.length;
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
  replace($('basket-branches'));
  if (!basket.length) return;
  if (!isOfferDate($('app-shopping-date').value)) { $('basket-branches').append(el('p', 'Choose a valid shopping date.')); return; }
  const coverage = pickedBasketCoverage(reports, basket, $('app-shopping-date').value);
  if (!coverage.length) $('basket-branches').append(el('p', 'Load branch reports to check your selections.'));
  for (const branch of coverage) {
    const card = el('section', undefined, 'store-card'); card.append(el('h3', branch.storeName), el('p', branch.native ? `${branch.capturedLines} of ${branch.requestedLines} selected products in this app context · applicability and validity unverified.` : `${branch.capturedLines} of ${branch.requestedLines} selected products captured here · ${branch.inPeriodLines} in recorded period.`), el('span', 'Checkout evidence pending', 'store-tag')); $('basket-branches').append(card);
  }
}
function renderStores() {
  replace($('store-list'));
  const branches = [...new Map(reports.filter(report => !isNativeReport(report)).map(report => [report.storeId, report])).values()];
  for (const branch of branches) {
    const card = el('article', undefined, 'store-card'); card.append(el('h3', branch.storeName), el('p', branch.address), el('span', 'Captured leaflet offers', 'store-tag')); $('store-list').append(card);
  }
  for (const branch of [...new Map(products.filter(product => product.native).flatMap(product => product.listings.map(listing => [listing.storeId, listing]))).values()]) { const card = el('article', undefined, 'store-card'); card.append(el('h3', branch.storeName), el('p', branch.priceChannel === 'aldi_app_unmapped_branch' ? 'ALDI app catalogue · assortment and promotion listings' : branch.channelLabel), el('span', 'Branch applicability unverified', 'store-tag')); $('store-list').append(card); }
  for (const name of ['Netto Weseler Straße']) { const card = el('article', undefined, 'store-card'); card.append(el('h3', name), el('p', 'App-source access trial pending'), el('span', 'No catalogue connected', 'store-tag')); $('store-list').append(card); }
}
function accept(next) { const catalogue = buildProductPicker(next); reports = next; products = catalogue; renderProducts(); renderBasket(); renderStores(); }
async function loadCatalogue() {
  const token = ++generation;
  try { const response = await fetch('./api/catalogue', { cache: 'no-store' }); if (!response.ok) throw Error(); const payload = await response.json(); if (!Array.isArray(payload.reports)) throw Error(); if (token !== generation) return; const next = payload.reports.map(report => parseAppReport(JSON.stringify(report))); accept(next); $('app-status').textContent = next.length ? 'Local catalogue loaded.' : 'No branch reports configured.'; }
  catch { if (token !== generation) return; accept([]); $('app-status').textContent = 'Local source unavailable. Load reports in Stores, or reconnect to the local server.'; }
}
$('reload-catalogue').addEventListener('click', loadCatalogue);
$('clear-catalogue').addEventListener('click', () => { ++generation; accept([]); $('app-report-files').value = ''; $('app-status').textContent = 'Catalogue cleared; basket selections preserved.'; });
$('app-report-files').addEventListener('change', async event => {
  const token = ++generation;
  try { const files = [...event.target.files]; if (!files.length) return; if (files.length > APP_REPORT_LIMIT || files.some(file => file.size > OFFER_VIEW_MAX_BYTES)) throw Error(); const next = await Promise.all(files.map(async file => parseAppReport(await file.text()))); if (token !== generation) return; accept(next); $('app-status').textContent = 'Private reports loaded.'; }
  catch { if (token !== generation) return; $('app-status').textContent = 'Unsupported reports. Existing catalogue and basket preserved.'; }
});
$('product-search').addEventListener('input', renderProducts);
$('app-shopping-date').addEventListener('change', renderBasket);
$('clear-basket').addEventListener('click', () => { basket = []; renderBasket(); renderProducts(); $('app-status').textContent = 'Basket cleared.'; });
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('install-app').hidden = false; });
$('install-app').addEventListener('click', async () => { if (!installPrompt) return; await installPrompt.prompt(); installPrompt = undefined; $('install-app').hidden = true; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./app-sw.mjs', { scope: './' }).catch(() => { $('install-note').textContent = 'Offline app shell unavailable in this browser.'; });
renderProducts(); renderBasket(); renderStores(); loadCatalogue();
