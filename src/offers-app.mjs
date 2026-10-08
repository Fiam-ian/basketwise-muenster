import { parseOfferView, OFFER_VIEW_MAX_BYTES, offerDateStatus, isOfferDate } from './offer-view.mjs';
const byId = id => document.getElementById(id);
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const quantity = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });
const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
byId('offer-date').value = ['year', 'month', 'day'].map(type => dateParts.find(part => part.type === type).value).join('-');
let report = null, generation = 0;
function empty() {
  report = null;
  byId('offer-cards').replaceChildren();
  byId('offer-source').replaceChildren();
  byId('offer-source').hidden = true;
  byId('offer-clear').hidden = true;
  byId('offer-category').replaceChildren(new Option('All categories', ''));
}
function render() {
  byId('offer-cards').replaceChildren();
  if (!report) return;
  if (!isOfferDate(byId('offer-date').value)) { byId('offer-status').textContent = 'Choose a valid shopping date.'; return; }
  const selected = byId('offer-category').value;
  const candidates = report.candidates.filter(item => !selected || item.category === selected);
  byId('offer-status').textContent = `${candidates.length} of ${report.candidates.length} candidates shown. ${offerDateStatus(report, byId('offer-date').value)}. Comparison is unavailable until the remaining checks pass.`;
  const source = byId('offer-source');
  source.replaceChildren(node('h2', report.storeName), node('p', report.address),
    node('p', `Recorded leaflet period: ${report.validFrom} to ${report.validTo}. Captured: ${report.retrievedAt}.`),
    node('p', 'The preparation tool checks snapshot hashes. Importing JSON does not authenticate its assertions or recheck the original sources.', 'quiet-note'));
  const link = node('a', 'Open the official branch page');
  link.href = report.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; source.append(link);
  source.hidden = false;
  for (const item of candidates) {
    const card = node('article', undefined, 'panel offer-card');
    card.append(node('p', `${item.category} · leaflet page ${item.page}`, 'eyebrow'), node('h2', item.productName),
      node('p', money.format(item.priceCents / 100), 'offer-price'),
      node('p', `Pack: ${quantity.format(item.packQuantity)} ${item.unit === 'count' ? 'pieces' : item.unit}. Quantity basis requires review.`),
      node('p', item.depositCents === null ? 'Pfand: unknown; checkout total unavailable.' : `Recorded Pfand: ${money.format(item.depositCents / 100)}. Review required before comparison.`),
      ...(item.fatBasisPoints === null ? [] : [node('p', `Recorded fat: ${quantity.format(item.fatBasisPoints / 100)}%. Milk source and acceptable substitution still require review.`)]),
      node('p', item.conditions), node('p', `Remaining checks: ${item.remainingReview.length ? item.remainingReview.map(value => value.replaceAll('_', ' ')).join(', ') : 'No listed checks; comparison remains disabled in this inspection view.'}`, 'quiet-note'));
    byId('offer-cards').append(card);
  }
}
byId('offer-file').addEventListener('change', async event => {
  const token = ++generation, file = event.target.files?.[0];
  empty();
  if (!file) { byId('offer-status').textContent = 'Choose a local offer report to begin.'; return; }
  byId('offer-status').textContent = 'Reading the local report…';
  byId('offer-clear').hidden = false;
  try {
    if (file.size > OFFER_VIEW_MAX_BYTES) throw new Error('Size');
    const input = await file.text();
    if (token !== generation) return;
    report = parseOfferView(input);
    for (const category of [...new Set(report.candidates.map(item => item.category))].sort()) byId('offer-category').append(new Option(category, category));
    render();
  } catch {
    if (token !== generation) return;
    empty(); byId('offer-status').textContent = 'Could not read this offer report. Use the local preparation tool and a JSON file up to 2 MiB. No file contents were displayed.';
  }
});
byId('offer-clear').addEventListener('click', () => { ++generation; empty(); byId('offer-file').value = ''; byId('offer-status').textContent = 'Offers cleared. Choose a local report to begin.'; });
byId('offer-date').addEventListener('change', render);
byId('offer-category').addEventListener('change', render);
