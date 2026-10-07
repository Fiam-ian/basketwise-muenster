import { readFile, stat, lstat, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseAuditReport, AUDIT_MAX_BYTES } from '../src/audit-view.mjs';
import { auditHistoricalEligibility } from '../src/historical-eligibility.mjs';

const HELP = 'Use --report LOCAL_AUDIT.json --review LOCAL_REVIEW.json --out NEW_OUTPUT.json; or --draft --report LOCAL_AUDIT.json --basket BASKET.json --shopping-date YYYY-MM-DD --max-age-days INTEGER --out NEW_REVIEW.json. Optional: --registry REGISTRY.json.';

export function parseHistoricalArguments(args) {
  const draft = args[0] === '--draft';
  const values = new Map();
  const accepted = new Set(draft
    ? ['--report', '--basket', '--shopping-date', '--max-age-days', '--out', '--registry']
    : ['--report', '--review', '--out', '--registry']);
  for (let index = draft ? 1 : 0; index < args.length; index += 2) {
    const key = args[index], value = args[index + 1];
    if (!accepted.has(key) || values.has(key) || typeof value !== 'string' || !value.trim() || value.startsWith('--')) throw new Error(HELP);
    values.set(key, value);
  }
  for (const key of draft ? ['--report', '--basket', '--shopping-date', '--max-age-days', '--out'] : ['--report', '--review', '--out']) {
    if (!values.has(key)) throw new Error(HELP);
  }
  if (draft && !/^(0|[1-9]\d{0,2})$/.test(values.get('--max-age-days'))) throw new Error(HELP);
  return { draft, values };
}

async function readBoundedJson(path) {
  const info = await stat(path);
  if (!info.isFile() || info.size > AUDIT_MAX_BYTES) throw new Error('Expected a JSON file no larger than 2 MiB.');
  const bytes = await readFile(path);
  if (bytes.length > AUDIT_MAX_BYTES) throw new Error('Input exceeded the size bound while reading.');
  return { bytes, value: JSON.parse(bytes.toString('utf8')) };
}

export async function runHistoricalAudit(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--help') { console.log(HELP); return null; }
  const { draft, values } = parseHistoricalArguments(args);
  const output = resolve(values.get('--out'));
  try {
    await lstat(output);
    throw new Error('Output exists; choose a new --out path.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const { bytes, value: report } = await readBoundedJson(resolve(values.get('--report')));
  parseAuditReport(bytes.toString('utf8'));
  const reportSha256 = createHash('sha256').update(bytes).digest('hex');
  const registryPath = values.has('--registry') ? resolve(values.get('--registry'))
    : fileURLToPath(new URL('../data/muenster-stores.json', import.meta.url));
  const { value: registry } = await readBoundedJson(registryPath);
  let review;
  if (draft) {
    const { value: basket } = await readBoundedJson(resolve(values.get('--basket')));
    review = {
      auditReviewVersion: 1, reportSha256,
      shoppingDate: values.get('--shopping-date'), maxAgeDays: Number(values.get('--max-age-days')),
      allowMembership: false, basket,
      recordReviews: report.observations.map(observation => ({ providerRecordId: observation.providerRecordId, reviewed: false }))
    };
  } else {
    ({ value: review } = await readBoundedJson(resolve(values.get('--review'))));
  }
  // The same validator checks draft policies; false review flags confer no eligibility.
  const result = auditHistoricalEligibility(report, review, registry, { reportSha256 });
  const saved = draft ? review : result;
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(saved, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const printed = draft ? { kind: 'unreviewed-local-draft', recordCount: report.observations.length, productMatchesReviewed: false } : result;
  console.log(JSON.stringify(printed, null, 2));
  return saved;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runHistoricalAudit().catch(() => {
    console.error('Historical audit failed. Check arguments, bounded JSON inputs, report fingerprint, review schema and a new output path. No raw data was printed.');
    process.exitCode = 1;
  });
}
