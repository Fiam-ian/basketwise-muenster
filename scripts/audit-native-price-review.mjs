import { readFile, realpath, open, stat } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { draftNativePriceReview, auditNativePriceReview, bindReports } from '../src/native-price-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../local-data');
async function localFile(value, existing) {
  if (!value || basename(value) !== value || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/.test(value)) throw new Error('Use immediate local-data JSON filenames.');
  if (await realpath(root) !== root) throw new Error('Linked local-data root is not allowed.');
  const path = resolve(root, value);
  if (existing) {
    if (await realpath(path) !== path) throw new Error('Linked source files are not allowed.');
    const info = await stat(path);
    if (!info.isFile() || info.size > 2_000_000) throw new Error('Source exceeds bounded JSON file limit.');
  }
  return path;
}
try {
  const args = process.argv.slice(2), options = {}, reports = [];
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!value || !['--report', '--draft-output', '--review', '--output', '--requests', '--selection'].includes(key)) throw new Error('Invalid arguments.');
    if (key === '--report') reports.push(value); else { if (options[key]) throw new Error('Duplicate option.'); options[key] = value; }
  }
  if (reports.length < 1 || reports.length > 6) throw new Error('Supply one to six reports.');
  const inputs = await Promise.all(reports.map(async name => readFile(await localFile(name, true))));
  let result, output;
  if (options['--draft-output']) {
    if (options['--review'] || options['--output']) throw new Error('Choose draft or audit mode.');
    const bound = bindReports(inputs);
    const selections = JSON.parse(options['--selection']).map(({ reportOrdinal, ...item }) => {
      if (!Number.isInteger(reportOrdinal) || !bound[reportOrdinal]) throw new Error('Invalid zero-based reportOrdinal.');
      return { ...item, reportSha256: bound[reportOrdinal].sha256 };
    });
    result = draftNativePriceReview(inputs, JSON.parse(options['--requests']), selections); output = options['--draft-output'];
  } else {
    if (options['--requests'] || options['--selection']) throw new Error('Audit uses the retained review requests.');
    result = auditNativePriceReview(inputs, JSON.parse(await readFile(await localFile(options['--review'], true), 'utf8'))); output = options['--output'];
  }
  const handle = await open(await localFile(output, false), 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(result, null, 2) + '\n'); } finally { await handle.close(); }
  console.log('Private review artifact created; checkout eligibility remains disabled.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
