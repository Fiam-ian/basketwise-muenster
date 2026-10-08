import { mkdir, writeFile, rm, lstat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { retailerSource, inspectEdekaBranchPage, inspectEdekaProspectPage } from '../src/retailer-source.mjs';

const HTML_LIMIT = 2 * 1024 * 1024, PDF_LIMIT = 20 * 1024 * 1024;
const localRoot = fileURLToPath(new URL('../local-data/', import.meta.url));
export function validateCaptureOutput(path) {
  const output = resolve(path), child = relative(localRoot, output);
  if (!child || child === '..' || child.includes('/') || child.includes('\\') || isAbsolute(child))
    throw new Error('Output must be a new directory inside prototype/local-data.');
  return output;
}

/** Four allowlisted public requests, no retries, cookies, private endpoints or fallback prices. */
export async function captureRetailerSource(outputPath, { fetchImpl = fetch, storeId = 'edeka-074601' } = {}) {
  const source = retailerSource(storeId);
  const output = validateCaptureOutput(outputPath), snapshots = [];
  if (await realpath(localRoot) !== resolve(localRoot)) throw new Error('Unsupported local data directory.');
  try { await lstat(output); throw new Error('Output already exists.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  async function capture(url, filename, pdf = false) {
    const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(25000) });
    if (response.status !== 200) throw new Error('Retailer request failed; collection stopped.');
    const type = response.headers.get('content-type') ?? '';
    if (!(pdf ? /^application\/pdf(?:;|$)/i.test(type) : /^text\/html(?:;|$)/i.test(type)))
      throw new Error('Unsupported retailer content type.');
    const limit = pdf ? PDF_LIMIT : HTML_LIMIT, chunks = [];
    let length = 0;
    if (!response.body) throw new Error('Missing source body.');
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > limit) throw new Error('Retailer source exceeded capture bound.');
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    if (pdf && !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Invalid PDF body.');
    snapshots.push({ filename, bytes, url, sha256: createHash('sha256').update(bytes).digest('hex'),
      retrievedAt: new Date().toISOString(), contentType: type });
    return bytes.toString('utf8');
  }
  const branch = inspectEdekaBranchPage(await capture(source.branchUrl, 'branch.html'), source);
  const prospect = inspectEdekaProspectPage(await capture(source.prospectUrl, 'prospects.html'), source);
  await capture(source.viewerUrl, 'viewer.html');
  await capture(source.pdfUrl, 'leaflet.pdf', true);
  const manifest = { retailerCaptureVersion: 1, ...branch, ...prospect,
    sourceDataLicence: 'Retailer content; reuse rights not established, retained locally for review',
    sources: snapshots.map(({ bytes, ...metadata }) => ({ ...metadata, bytes: bytes.length })),
    priceCandidateCount: 0, captureOnly: true };
  await mkdir(output, { mode: 0o700 }); // Existing directories are never overwritten.
  try {
    for (const snapshot of snapshots)
      await writeFile(resolve(output, snapshot.filename), snapshot.bytes, { flag: 'wx', mode: 0o600 });
    await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  } catch (error) { await rm(output, { recursive: true, force: true }); throw error; }
  return { storeId: source.storeId, capturedSources: snapshots.length,
    pageAdvertisedWindow: branch.pageAdvertisedWindow, rankingEnabled: false, inventoryComplete: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') console.log('Capture four public EDEKA sources: --out NEW_DIRECTORY_UNDER_LOCAL_DATA [--store edeka-074601|edeka-074835]');
  else if (!([2, 4].includes(args.length) && args[0] === '--out' && (args.length === 2 || args[2] === '--store'))) { console.error('Use --out NEW_DIRECTORY_UNDER_LOCAL_DATA [--store STORE_ID]'); process.exitCode = 1; }
  else try { console.log(JSON.stringify(await captureRetailerSource(args[1], { storeId: args[3] ?? 'edeka-074601' }))); }
  catch { console.error('Retailer capture failed; check public access, source structure and a new local output path.'); process.exitCode = 1; }
}
