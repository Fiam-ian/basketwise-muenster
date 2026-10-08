import { realpath, stat, readFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { parseOfferView, OFFER_VIEW_MAX_BYTES, inspectOfferCoverage } from './offer-view.mjs';

/** Only explicitly configured immediate-child reports, never arbitrary client paths. */
export async function loadLocalAppReports(root, configured = '') {
  if (!configured) return [];
  let names;
  try { names = JSON.parse(configured); } catch { throw new Error('Invalid local report configuration.'); }
  if (!Array.isArray(names) || names.length > 3 || names.some(name => typeof name !== 'string' || name.length > 160 || !name.endsWith('.json') || basename(name) !== name || name.includes('\\') || name === '..')) throw new Error('Invalid local report configuration.');
  const expectedLocal = resolve(root, 'local-data'), local = await realpath(expectedLocal);
  if (local !== expectedLocal) throw new Error('Linked data root rejected.');
  const reports = [];
  for (const name of names) {
    const expected = resolve(local, name), actual = await realpath(expected);
    if (actual !== expected || dirname(actual) !== local || (await stat(actual)).size > OFFER_VIEW_MAX_BYTES) throw new Error('Unsupported local report.');
    reports.push(parseOfferView(await readFile(actual, 'utf8')));
  }
  inspectOfferCoverage(reports);
  return reports;
}
