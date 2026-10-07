import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectCoverageReport } from '../src/inspect-coverage.mjs';

export async function runInspection(args = process.argv.slice(2)) {
  if (args.length !== 2 || args[0] !== '--file' || !args[1]?.trim()) throw new Error('Usage: node scripts/inspect-coverage.mjs --file LOCAL_AUDIT.json');
  const inputPath = resolve(args[1]);
  const info = await stat(inputPath);
  if (!info.isFile() || info.size > 2 * 1024 * 1024) throw new Error('Expected an audit JSON file no larger than 2 MiB.');
  const content = await readFile(inputPath, 'utf8');
  if (Buffer.byteLength(content, 'utf8') > 2 * 1024 * 1024) throw new Error('Audit JSON grew beyond 2 MiB while reading.');
  const summary = inspectCoverageReport(JSON.parse(content));
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runInspection().catch(() => { console.error('Coverage inspection failed. Check --file, JSON format, size, audit dates and supported provider records. No raw data was printed.'); process.exitCode = 1; });
}
