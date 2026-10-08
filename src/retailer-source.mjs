export const EDEKA_PILOT_SOURCE = Object.freeze({
  storeId: 'edeka-074601',
  branchUrl: 'https://www.edeka.de/maerkte/074601/',
  prospectUrl: 'https://www.edeka.de/maerkte/074601/prospekte/',
  viewerUrl: 'https://blaetterkatalog.edeka.de/RHEINRUHR/SUUPER_Angebote/index.html',
  // Discovered through the public viewer's visible Speichern / Komplettes PDF link.
  pdfUrl: 'https://blaetterkatalog.edeka.de/RHEINRUHR/SUUPER_Angebote/blaetterkatalog/pdf/complete.pdf'
});
export const EDEKA_AASEEMARKT_SOURCE = Object.freeze({ ...EDEKA_PILOT_SOURCE,
  storeId: 'edeka-074835', branchUrl: 'https://www.edeka.de/maerkte/074835/',
  prospectUrl: 'https://www.edeka.de/maerkte/074835/prospekte/' });
export function retailerSource(storeId = EDEKA_PILOT_SOURCE.storeId) {
  if (storeId === EDEKA_PILOT_SOURCE.storeId) return EDEKA_PILOT_SOURCE;
  if (storeId === EDEKA_AASEEMARKT_SOURCE.storeId) return EDEKA_AASEEMARKT_SOURCE;
  throw new Error('Unsupported retailer branch.');
}
const MAX_HTML_BYTES = 2 * 1024 * 1024;
function reject() { throw new Error('Retailer source structure changed or is unsupported.'); }
function date(value) {
  const parts = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!parts) reject();
  const iso = `${parts[3]}-${parts[2]}-${parts[1]}`;
  const parsed = new Date(iso + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) reject();
  return iso;
}
function checkHtml(html) {
  if (typeof html !== 'string' || new TextEncoder().encode(html).length > MAX_HTML_BYTES) reject();
}

/** Recognizes one reviewed branch template; never treats page dates as item validity. */
export function inspectEdekaBranchPage(html, source = EDEKA_PILOT_SOURCE) {
  source = retailerSource(source.storeId);
  checkHtml(html);
  const sections = [...html.matchAll(/<section\b[^>]*\bid=["']angebote-der-woche["'][^>]*>([\s\S]*?)<\/section>/g)];
  if (sections.length !== 1) reject();
  const section = sections[0][1];
  const plain = section.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const address = source.storeId === EDEKA_PILOT_SOURCE.storeId ? ['Aegidiimarkt 7', '48143 Münster'] : ['Von-Witzleben-Str. 10', '48151 Münster'];
  if (!address.every(value => plain.includes(value))) reject();
  const periods = [...plain.matchAll(/Gültig vom\s+(\d{2}\.\d{2}\.\d{4})\s+bis zum\s+(\d{2}\.\d{2}\.\d{4})/g)];
  if (periods.length !== 1) reject();
  const period = periods[0];
  const validFrom = date(period[1]), validTo = date(period[2]);
  if (validFrom > validTo) reject();
  const links = [...section.matchAll(/\bhref=["']([^"']+)["']/g)].map(match => match[1]);
  const expected = new URL(source.prospectUrl).pathname;
  if (!links.some(link => link.split('#')[0] === expected || link.split('#')[0] === source.prospectUrl)) reject();
  return { storeId: source.storeId, pageAdvertisedWindow: { validFrom, validTo },
    prospectUrl: source.prospectUrl, itemValidityReviewed: false,
    inventoryComplete: false, rankingEnabled: false };
}

/** Require the exact publicly linked pilot viewer, not an inferred regional match. */
export function inspectEdekaProspectPage(html, source = EDEKA_PILOT_SOURCE) {
  source = retailerSource(source.storeId);
  checkHtml(html);
  const viewers = [...html.matchAll(/<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)].map(match => match[1]);
  if (!viewers.includes(source.viewerUrl)) reject();
  return { viewerUrl: source.viewerUrl, pdfUrl: source.pdfUrl,
    leafletValidityReviewed: false, rankingEnabled: false };
}
