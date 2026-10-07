import { mkdir, lstat, realpath, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { validateCaptureOutput } from './capture-retailer-source.mjs';
import { inspectWoltListings } from '../src/wolt-listings.mjs';

const sourceUrl = 'https://wolt.com/de/deu/munster/venue/de-mus-zent';
export async function captureWoltListings(outputPath, { fetchImpl = fetch } = {}) {
  const output = validateCaptureOutput(outputPath);
  const root = fileURLToPath(new URL('../local-data/', import.meta.url));
  if (await realpath(root) !== resolve(root)) throw new Error('Unsupported local output root.');
  try { await lstat(output); throw new Error('Output exists.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const response = await fetchImpl(sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(25000) });
  if (response.status !== 200 || !/^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? '') || !response.body)
    throw new Error('Public listing unavailable.');
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > 2 * 1024 * 1024) throw new Error('Public listing exceeded capture bound.');
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks), fetchedAt = new Date().toISOString();
  const listing = inspectWoltListings(bytes.toString('utf8'), { sourceUrl, fetchedAt });
  const report = { ...listing, responseSha256: createHash('sha256').update(bytes).digest('hex'),
    sourceDataLicence: 'Retailer/platform content; reuse rights not established; retained locally' };
  await mkdir(output, { mode: 0o700 });
  try {
    await writeFile(resolve(output, 'page.html'), bytes, { flag: 'wx', mode: 0o600 });
    await writeFile(resolve(output, 'listings.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  } catch (error) { await rm(output, { recursive: true, force: true }); throw error; }
  return { channel: 'delivery_listing', listingCount: listing.listings.length,
    inventoryComplete: false, checkoutFeesKnown: false, rankingEnabled: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') console.log('Capture one public Flink/Wolt delivery listing: --out NEW_DIRECTORY_UNDER_LOCAL_DATA');
  else if (args.length !== 2 || args[0] !== '--out') { console.error('Use --out NEW_DIRECTORY_UNDER_LOCAL_DATA'); process.exitCode = 1; }
  else try { console.log(JSON.stringify(await captureWoltListings(args[1]))); }
  catch { console.error('Public delivery listing capture failed; no catalogue completeness or checkout claim established.'); process.exitCode = 1; }
}
