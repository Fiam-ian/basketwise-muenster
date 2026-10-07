const PILOT_URL = 'https://wolt.com/de/deu/munster/venue/de-mus-zent';
const SLUG = 'de-mus-zent';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max ? value : null;
const cents = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
function reject() { throw new TypeError('Unsupported bounded Wolt pilot listing source.'); }

/** Inspect a captured public delivery listing. Never promotes it to shelf, stock or checkout evidence. */
export function inspectWoltListings(html, {sourceUrl, fetchedAt} = {}) {
  if (typeof html !== 'string' || new TextEncoder().encode(html).length > 2 * 1024 * 1024 || sourceUrl !== PILOT_URL) reject();
  if (typeof fetchedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(fetchedAt) || !Number.isFinite(Date.parse(fetchedAt)) || new Date(fetchedAt).toISOString() !== fetchedAt.replace(/Z$/, fetchedAt.includes('.') ? 'Z' : '.000Z')) reject();
  const states = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attributes = match[1];
    const type = /(?:^|\s)type\s*=\s*(["'])(.*?)\1/i.exec(attributes)?.[2];
    const classes = /(?:^|\s)class\s*=\s*(["'])(.*?)\1/i.exec(attributes)?.[2]?.split(/\s+/) ?? [];
    if (type === 'application/json' && classes.includes('query-state')) states.push(match[2]);
  }
  if (states.length !== 1) reject();
  let state;
  try { state = JSON.parse(states[0]); } catch { reject(); }
  if (!object(state) || !Array.isArray(state.queries) || state.queries.length > 100) reject();
  const venueQueries = state.queries.filter(query => object(query) && Array.isArray(query.queryKey) && JSON.stringify(query.queryKey) === JSON.stringify(['venue', 'static', SLUG, 'de']));
  const contentQueries = state.queries.filter(query => object(query) && Array.isArray(query.queryKey) && query.queryKey[0] === 'venue-assortment' && query.queryKey[1] === 'venue-content' && query.queryKey[2] === SLUG);
  if (venueQueries.length !== 1 || contentQueries.length !== 1) reject();
  const venue = venueQueries[0].state?.data?.venue;
  if (!object(venue) || venue.slug !== SLUG || venue.city !== 'Münster' || venue.country !== 'DEU' || venue.currency !== 'EUR' || !text(venue.name, 160)) reject();
  const pages = contentQueries[0].state?.data?.pages;
  if (!Array.isArray(pages) || pages.length > 100) reject();
  const listings = [], seen = new Map();
  let itemCount = 0, sectionCount = 0, duplicateCount = 0;
  for (const page of pages) {
    if (!object(page) || !Array.isArray(page.sections)) reject();
    sectionCount += page.sections.length;
    if (sectionCount > 500) reject();
    for (const section of page.sections) {
      if (!object(section)) reject();
      if (section.items === undefined) continue;
      if (!Array.isArray(section.items)) reject();
      itemCount += section.items.length;
      if (itemCount > 500) reject();
      for (const item of section.items) {
        if (!object(item) || !text(item.id, 128) || !text(item.name, 300) || cents(item.price) === null) reject();
        const deposit = item.deposit;
        const sourceDepositDisplay = object(deposit) && cents(deposit.amount) !== null && text(deposit.label, 80)
          ? {amountCents: deposit.amount, label: deposit.label} : null;
        const listing = {listingId: item.id, name: item.name, priceCents: item.price,
          originalPriceCents: cents(item.original_price), unitLabel: text(item.unit_info, 160),
          depositCents: null, depositReviewed: false, sourceDepositDisplay,
          isWoltPlusOnly: typeof item.is_wolt_plus_only === 'boolean' ? item.is_wolt_plus_only : null,
          metadataReviewed: false, pack: {quantity: null, unit: null, basis: null}};
        const existing = seen.get(item.id);
        if (existing !== undefined) {
          if (existing !== JSON.stringify(listing)) reject();
          duplicateCount++; continue;
        }
        seen.set(item.id, JSON.stringify(listing)); listings.push(listing);
      }
    }
  }
  return {woltListingVersion: 1, venue: {slug: venue.slug, name: venue.name, city: venue.city, country: venue.country},
    sourceUrl, fetchedAt, priceCurrency: 'EUR', channel: 'delivery_listing', listings, duplicateCount,
    inventoryComplete: false, addressServiceabilityVerified: false, checkoutFeesKnown: false,
    rankingEnabled: false, activeValidityReviewed: false,
    sourceDataLicence: 'Retailer platform content; reuse rights not established, retained locally for review'};
}
