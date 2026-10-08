import { GROCERY_INTENTS, searchGroceryIntents, createShoppingRequest, addShoppingRequest, removeShoppingRequest, shoppingRequestLabel, findShoppingCandidateLeads } from './shopping-list.mjs';
import { parseOfferView, OFFER_VIEW_MAX_BYTES, offerDateStatus, isOfferDate, inspectOfferCoverage } from './offer-view.mjs';
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
let reports = [], generation = 0, shoppingList = [];

function empty() {
  reports = [];
  for (const id of ['offer-cards', 'offer-source', 'offer-coverage']) byId(id).replaceChildren();
  byId('offer-source').hidden = true;
  byId('offer-coverage').hidden = true;
  byId('offer-clear').hidden = true;
  renderList();
  byId('offer-category').replaceChildren(new Option('All categories', ''));
  byId('offer-branch').replaceChildren(new Option('All imported branches', ''));
}
function renderCoverage() {
  const area = byId('offer-coverage');
  area.replaceChildren(node('h2', 'Starter list: where evidence is missing'),
    node('p', 'Category candidates are leads to review, not equivalent products or eligible basket lines. This table covers all imported branches regardless of filters.'));
  const table = node('table', undefined, 'offer-coverage-table');
  table.append(node('caption', 'Six staple requests and captured category candidates'));
  const head = node('tr'); head.append(node('th', 'Requested item'));
  for (const storeId of [...new Set(reports.map(report => report.storeId))]) head.append(node('th', reports.find(report => report.storeId === storeId).storeName));
  const thead = node('thead'); thead.append(head); table.append(thead);
  const tbody = node('tbody');
  for (const line of inspectOfferCoverage(reports)) {
    const row = node('tr'), label = node('th', `${line.category} · ${quantity.format(line.quantity)} ${line.unit === 'count' ? 'pieces' : line.unit}`);
    label.scope = 'row'; row.append(label);
    for (const branch of line.branches) row.append(node('td', branch.candidateCount ? `${branch.candidateCount} candidate; checks open` : 'No verified offer found'));
    tbody.append(row);
  }
  table.append(tbody); const wrapper = node('div', undefined, 'offer-table-scroll'); wrapper.append(table); area.append(wrapper,
    node('p', '0 of 6 requested lines are comparison-eligible at each imported branch. No complete basket total or savings can be computed.', 'quiet-note'));
  area.hidden = false;
}
function render() {
  byId('offer-cards').replaceChildren();
  if (!reports.length) return;
  const shoppingDate = byId('offer-date').value;
  if (!isOfferDate(shoppingDate)) { byId('offer-status').textContent = 'Choose a valid shopping date.'; return; }
  const category = byId('offer-category').value, branch = byId('offer-branch').value;
  const selected = reports.filter(report => !branch || branch === report.storeId);
  const candidateCount = selected.reduce((sum, report) => sum + report.candidates.filter(item => !category || item.category === category).length, 0);
  const branchCount = new Set(selected.map(report => report.storeId)).size;
  byId('offer-status').textContent = `${candidateCount} ${candidateCount === 1 ? 'candidate' : 'candidates'} shown across ${branchCount} ${branchCount === 1 ? 'branch' : 'branches'} and ${selected.length} leaflets. ${selected.map(report => `${report.storeName} (${report.leafletLabel}): ${offerDateStatus(report, shoppingDate)}`).join('. ')}. Comparison checks remain open.`;
  const source = byId('offer-source'); source.replaceChildren();
  if (reports.length > 1 && new Set(reports.map(report => report.leafletSha256)).size < reports.length)
    source.append(node('p', 'Shared leaflet: these reports identify the same captured publication. Repeated candidates are not independent price evidence. This alone does not demonstrate savings between branches.', 'audit-warning'));
  for (const report of selected) {
    const group = node('section');
    group.append(node('h2', report.storeName), node('p', `${report.address} · ${report.leafletLabel}`),
      node('p', `Recorded leaflet period: ${report.validFrom} to ${report.validTo}. Captured: ${report.retrievedAt}.`));
    const link = node('a', 'Open the official branch page');
    link.href = report.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; group.append(link); source.append(group);
    for (const item of report.candidates.filter(item => !category || item.category === category)) {
      const card = node('article', undefined, 'panel offer-card');
      card.append(node('p', `${report.storeName} · ${report.leafletLabel} · ${item.category} · page ${item.page}`, 'eyebrow'),
        node('h2', item.productName), node('p', money.format(item.priceCents / 100), 'offer-price'),
        node('p', offerDateStatus(report, shoppingDate)),
        node('p', `Source quantity: ${quantity.format(item.packQuantity)} ${item.unit === 'count' ? 'pieces' : item.unit}. Priced pack and quantity basis require review.`),
        ...(item.packAmbiguity ? [node('p', item.packAmbiguity, 'audit-warning')] : []),
        ...(item.depositDisplay ? [node('p', `Source Pfand wording: ${item.depositDisplay}`)] : []),
        node('p', item.depositCents === null ? 'Pfand: unknown; checkout total unavailable.' : `Recorded Pfand: ${money.format(item.depositCents / 100)}. Review required before comparison.`),
        ...(item.fatBasisPoints === null ? [] : [node('p', `Recorded fat: ${quantity.format(item.fatBasisPoints / 100)}%. Milk source and acceptable substitution still require review.`)]),
        node('p', item.conditions), node('p', `Remaining checks: ${item.remainingReview.length ? item.remainingReview.map(value => value.replaceAll('_', ' ')).join(', ') : 'No listed checks; comparison remains disabled in this inspection view.'}`, 'quiet-note'));
      byId('offer-cards').append(card);
    }
  }
  source.append(node('p', 'The preparation tool checks snapshot hashes. Importing JSON does not authenticate its assertions or recheck the original sources.', 'quiet-note'));
  source.hidden = false; renderCoverage(); renderList();
}
byId('offer-file').addEventListener('change', async event => {
  const token = ++generation, files = [...(event.target.files ?? [])]; empty();
  if (!files.length) { byId('offer-status').textContent = 'Choose local offer reports to begin.'; return; }
  byId('offer-status').textContent = 'Reading local reports…'; byId('offer-clear').hidden = false;
  try {
    if (files.length > 3 || files.some(file => file.size > OFFER_VIEW_MAX_BYTES)) throw new Error('Size');
    const parsed = await Promise.all(files.map(async file => parseOfferView(await file.text())));
    if (token !== generation) return;
    inspectOfferCoverage(parsed); // Reject duplicate branch/leaflet snapshots before changing state.
    reports = parsed;
    for (const category of [...new Set(reports.flatMap(report => report.candidates.map(item => item.category)))].sort()) byId('offer-category').append(new Option(category, category));
    for (const storeId of [...new Set(reports.map(report => report.storeId))]) byId('offer-branch').append(new Option(reports.find(report => report.storeId === storeId).storeName, storeId));
    render();
  } catch {
    if (token !== generation) return;
    empty(); byId('offer-status').textContent = 'Could not read these offer reports. Choose up to three supported JSON files, one per branch and leaflet, up to 2 MiB each. No file contents were displayed.';
  }
});
byId('offer-clear').addEventListener('click', () => { ++generation; empty(); byId('offer-file').value = ''; byId('offer-status').textContent = 'Offers cleared. Choose local reports to begin.'; });
for (const id of ['offer-date', 'offer-category', 'offer-branch']) byId(id).addEventListener('change', render);

function chooseIntent() {
  const intent = GROCERY_INTENTS.find(item => item.id === byId('list-intent').value);
  byId('list-add').disabled = !intent;
  byId('list-milk').hidden = intent?.id !== 'milk';
  byId('list-unit').textContent = intent ? `(${intent.unit === 'count' ? 'pieces' : intent.unit})` : '';
  byId('list-quantity').value = intent?.defaultQuantity ?? '';
}
function searchIntents() {
  const matches = searchGroceryIntents(byId('list-search').value);
  byId('list-intent').replaceChildren(...matches.map(item => new Option(item.label, item.id)));
  if (!matches.length) byId('list-intent').append(new Option('No starter grocery matches', ''));
  chooseIntent();
}
function renderList() {
  const area = byId('list-lines'); area.replaceChildren();
  shoppingList.forEach((request, index) => {
    const section = node('section', undefined, 'shopping-line');
    section.append(node('h3', shoppingRequestLabel(request)));
    const label = node('label', 'Requested quantity', 'field');
    const input = node('input'); input.type = 'number'; input.min = '1'; input.max = '1000000'; input.step = '1'; input.value = request.quantity;
    input.setAttribute('aria-label', `Quantity in ${request.unit} for ${shoppingRequestLabel(request)}`);
    input.addEventListener('change', () => {
      try {
        const updated = createShoppingRequest(request.category, { ...request.constraints, quantity: Number(input.value) });
        shoppingList = shoppingList.map((line, position) => position === index ? updated : line); renderList();
        byId('list-status').textContent = 'Quantity updated.';
      } catch { input.value = request.quantity; byId('list-status').textContent = 'Enter a positive whole quantity up to 1,000,000.'; }
    });
    label.append(input, node('span', request.unit === 'count' ? 'pieces' : request.unit)); section.append(label);
    const leads = findShoppingCandidateLeads(reports, request);
    if (!leads.length) section.append(node('p', reports.length ? 'No captured category leads. This does not mean the stores lack this grocery.' : 'Load local offer reports below to see nearby leads.'));
    for (const lead of leads) {
      const report = reports.find(item => item.storeId === lead.storeId && item.leafletId === lead.leafletId);
      const mismatch = request.constraints.fatBasisPoints != null && lead.candidate.fatBasisPoints != null && request.constraints.fatBasisPoints !== lead.candidate.fatBasisPoints;
      section.append(node('p', `${lead.storeName}: ${lead.candidate.productName} · ${money.format(lead.candidate.priceCents / 100)} advertised · ${offerDateStatus(report, byId('offer-date').value)}. ${mismatch ? 'Recorded fat differs from your request. ' : ''}Category lead only; brand, preferences, pack, conditions and Pfand are not verified for this request.`));
    }
    const remove = node('button', 'Remove', 'button'); remove.type = 'button'; remove.setAttribute('aria-label', `Remove ${shoppingRequestLabel(request)}`);
    remove.addEventListener('click', () => { shoppingList = removeShoppingRequest(shoppingList, index); renderList(); byId('list-status').textContent = 'Grocery removed.'; });
    section.append(remove); area.append(section);
  });
  byId('list-clear').hidden = !shoppingList.length;
  byId('basket-status').textContent = shoppingList.length ? `${shoppingList.length} requested lines. Cheapest basket unavailable: imported leads have unresolved matching and checkout evidence. Missing lines never count as zero.` : 'Add groceries to see which imported branches have offer leads.';
}
byId('list-search').addEventListener('input', searchIntents);
byId('list-intent').addEventListener('change', chooseIntent);
byId('list-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const options = { quantity: Number(byId('list-quantity').value), brand: byId('list-brand').value };
    if (byId('list-intent').value === 'milk') Object.assign(options, { milkSource: byId('list-source').value, fatBasisPoints: byId('list-fat').value ? Number(byId('list-fat').value) : undefined, processing: byId('list-processing').value });
    shoppingList = addShoppingRequest(shoppingList, createShoppingRequest(byId('list-intent').value, options));
    renderList(); byId('list-status').textContent = 'Added to your list. Identical requests combine quantities.';
  } catch { byId('list-status').textContent = 'Choose a starter grocery and a positive whole quantity. The list supports up to 50 distinct requests.'; }
});
byId('list-clear').addEventListener('click', () => { shoppingList = []; renderList(); byId('list-status').textContent = 'Grocery list cleared.'; });
byId('offer-date').addEventListener('change', renderList);
searchIntents(); renderList();
