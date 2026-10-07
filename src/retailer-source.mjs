export const EDEKA_PILOT_SOURCE = Object.freeze({
  storeId: 'edeka-074601',
  branchUrl: 'https://www.edeka.de/maerkte/074601/',
  prospectUrl: 'https://www.edeka.de/maerkte/074601/prospekte/',
  viewerUrl: 'https://blaetterkatalog.edeka.de/RHEINRUHR/SUUPER_Angebote/index.html',
  // Discovered through the public viewer's visible Speichern / Komplettes PDF link.
  pdfUrl: 'https://blaetterkatalog.edeka.de/RHEINRUHR/SUUPER_Angebote/blaetterkatalog/pdf/complete.pdf'
});
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
export function inspectEdekaBranchPage(html) {
  checkHtml(html);
  const sections = [...html.matchAll(/<section\b[^>]*\bid=["']angebote-der-woche["'][^>]*>([\s\S]*?)<\/section>/g)];
  if (sections.length !== 1) reject();
  const section = sections[0][1];
  const plain = section.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  if (!plain.includes('Aegidiimarkt 7') || !plain.includes('48143 Münster')) reject();
  const periods = [...plain.matchAll(/Gültig vom\s+(\d{2}\.\d{2}\.\d{4})\s+bis zum\s+(\d{2}\.\d{2}\.\d{4})/g)];
  if (periods.length !== 1) reject();
  const period = periods[0];
  const validFrom = date(period[1]), validTo = date(period[2]);
  if (validFrom > validTo) reject();
  const links = [...section.matchAll(/\bhref=["']([^"']+)["']/g)].map(match => match[1]);
  const expected = new URL(EDEKA_PILOT_SOURCE.prospectUrl).pathname;
  if (!links.some(link => link.split('#')[0] === expected || link.split('#')[0] === EDEKA_PILOT_SOURCE.prospectUrl)) reject();
  return { storeId: EDEKA_PILOT_SOURCE.storeId, pageAdvertisedWindow: { validFrom, validTo },
    prospectUrl: EDEKA_PILOT_SOURCE.prospectUrl, itemValidityReviewed: false,
    inventoryComplete: false, rankingEnabled: false };
}

/** Require the exact publicly linked pilot viewer, not an inferred regional match. */
export function inspectEdekaProspectPage(html) {
  checkHtml(html);
  const viewers = [...html.matchAll(/<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)].map(match => match[1]);
  if (!viewers.includes(EDEKA_PILOT_SOURCE.viewerUrl)) reject();
  return { viewerUrl: EDEKA_PILOT_SOURCE.viewerUrl, pdfUrl: EDEKA_PILOT_SOURCE.pdfUrl,
    leafletValidityReviewed: false, rankingEnabled: false };
}
