import { readFile, realpath, lstat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseOfferView } from '../src/offer-view.mjs';
import { retailerSource } from '../src/retailer-source.mjs';

const root = fileURLToPath(new URL('../local-data/', import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function bounded(path, limit) {
  const info = await lstat(path);
  if (!info.isFile() || info.size > limit) throw new Error('Unsupported source file.');
  const bytes = await readFile(path);
  if (bytes.length > limit) throw new Error('Source exceeds limit.');
  return bytes;
}
function child(path) {
  const name = relative(root, resolve(path));
  if (!name || name === '..' || name.includes('/') || name.includes('\\') || isAbsolute(name))
    throw new Error('Use immediate children of local-data.');
  return resolve(path);
}
/** Offline hash check and projection. Review assertions do not certify products or prices. */
export async function prepareOfferView(capturePath, outputPath) {
  const capture = child(capturePath), output = child(outputPath);
  if (await realpath(root) !== resolve(root) || await realpath(capture) !== capture) throw new Error('Linked paths unsupported.');
  try { await lstat(output); throw new Error('Output already exists.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const manifestBytes = await bounded(resolve(capture, 'manifest.json'), 2 * 1024 * 1024);
  const reviewBytes = await bounded(resolve(capture, 'reviewed-candidates-v1.json'), 2 * 1024 * 1024);
  const manifest = JSON.parse(manifestBytes), review = JSON.parse(reviewBytes);
  const source = retailerSource(manifest.storeId);
  if (manifest.retailerCaptureVersion !== 1 || manifest.storeId !== source.storeId ||
      review.retailerCandidateReviewVersion !== 1 || review.storeId !== source.storeId ||
      review.captureManifestSha256 !== digest(manifestBytes) || !Array.isArray(manifest.sources) || manifest.sources.length !== 4 ||
      review.validFrom !== manifest.pageAdvertisedWindow?.validFrom || review.validTo !== manifest.pageAdvertisedWindow?.validTo)
    throw new Error('Capture and review do not match.');
  const expected = [['branch.html', source.branchUrl], ['prospects.html', source.prospectUrl],
    ['viewer.html', source.viewerUrl], ['leaflet.pdf', source.pdfUrl]];
  for (const [filename, url] of expected) {
    const matches = manifest.sources.filter(item => item.filename === filename && item.url === url);
    if (matches.length !== 1) throw new Error('Capture source mismatch.');
    const item = matches[0], bytes = await bounded(resolve(capture, filename), filename.endsWith('.pdf') ? 20 * 1024 * 1024 : 2 * 1024 * 1024);
    if (item.sha256 !== digest(bytes) || item.bytes !== bytes.length) throw new Error('Capture bytes changed.');
  }
  const pdf = manifest.sources.find(item => item.filename === 'leaflet.pdf');
  if (review.leafletSha256 !== pdf.sha256) throw new Error('Review leaflet mismatch.');
  const projection = parseOfferView(JSON.stringify({ ...review, offerViewVersion: 1, retrievedAt: pdf.retrievedAt }));
  await writeFile(output, JSON.stringify({ ...projection, mode: 'advertised_candidates' }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { candidateCount: projection.candidates.length, rankingEnabled: false, sourceHashesChecked: true };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  try {
    if (args.length !== 4 || args[0] !== '--capture' || args[2] !== '--out') throw new Error('Arguments');
    console.log(JSON.stringify(await prepareOfferView(args[1], args[3])));
  } catch { console.error('Offer view preparation failed. Use --capture LOCAL_DATA_CAPTURE_DIR --out NEW_LOCAL_DATA_JSON. No raw source data was printed.'); process.exitCode = 1; }
}
