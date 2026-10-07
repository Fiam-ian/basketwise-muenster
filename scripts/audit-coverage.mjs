import { resolve, dirname } from 'node:path';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fetchOpenPricesObservations } from '../src/open-prices.mjs';
import { summarizeCoverage } from '../src/coverage.mjs';

const HELP = 'Usage: node scripts/audit-coverage.mjs --out NEW_FILE.json [--lat NUMBER] [--lon NUMBER] [--radius-km NUMBER] [--since YYYY-MM-DD]';

export function berlinReferenceDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseAuditArguments(args, shoppingDate) {
  const accepted = new Set(['--out', '--lat', '--lon', '--radius-km', '--since']);
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!accepted.has(key) || values.has(key) || typeof args[index + 1] !== 'string' || !args[index + 1].trim() || args[index + 1].startsWith('--')) throw new Error(HELP);
    values.set(key, args[index + 1]);
  }
  if (!values.get('--out')?.trim()) throw new Error('--out is mandatory. ' + HELP);
  // Fourteen calendar dates, including the reference shopping date.
  const since = values.get('--since') ?? new Date(Date.parse(`${shoppingDate}T00:00:00Z`) - 13 * 86400000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !Number.isFinite(Date.parse(since)) || new Date(since).toISOString().slice(0, 10) !== since || since > shoppingDate) throw new Error('--since must be a real calendar date on or before the Europe/Berlin reference date.');
  const lat = values.has('--lat') ? Number(values.get('--lat')) : 51.96236;
  const lon = values.has('--lon') ? Number(values.get('--lon')) : 7.62571;
  const radiusKm = values.has('--radius-km') ? Number(values.get('--radius-km')) : 3;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(radiusKm) || radiusKm < 0.01 || radiusKm > 30) throw new Error('Invalid coordinates or radius; radius must be between 0.01 and 30 km.');
  return { outputPath: resolve(values.get('--out')), lat, lon, radiusKm, observedSince: since };
}

export async function runAudit(args = process.argv.slice(2)) {
  const shoppingDate = berlinReferenceDate();
  const options = parseAuditArguments(args, shoppingDate);
  try {
    await access(options.outputPath);
    throw new Error('Output already exists; choose a new --out file.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  // Prepare the explicitly requested output directory before using the API.
  await mkdir(dirname(options.outputPath), { recursive: true });
  const result = await fetchOpenPricesObservations({ lat: options.lat, lon: options.lon, radiusKm: options.radiusKm, observedSince: options.observedSince, maxPages: 3, pageSize: 100 });
  const summary = summarizeCoverage(result.observations, { shoppingDate });
  const report = {
    auditVersion: 1, generatedAt: new Date().toISOString(),
    referenceDateBasis: 'Europe/Berlin',
    queriedWindow: { sinceInclusive: options.observedSince, referenceDate: shoppingDate, upperDateFilterApplied: false },
    limits: { maxPages: 3, pageSize: 100, maximumRetainedRecords: 300 },
    summary, providerTotal: result.providerTotal, truncated: result.truncated,
    query: result.query, requests: result.requests, docsUrl: result.docsUrl,
    attribution: 'Open Prices / Open Food Facts', license: 'ODbL-1.0',
    observations: result.observations,
  };
  await writeFile(options.outputPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', encoding: 'utf8', mode: 0o600 });
  console.log(JSON.stringify({ outputPath: options.outputPath, summary, providerTotal: result.providerTotal, truncated: result.truncated }, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runAudit().catch(error => { console.error(`Coverage audit failed: ${error.message}`); process.exitCode = 1; });
}
