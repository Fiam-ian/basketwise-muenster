import { readFile, writeFile, realpath, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const local = resolve(root, 'local-data');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const python = `import fitz,json,sys
doc=fitz.open(sys.argv[1])
if len(doc)>100: raise ValueError('Too many pages')
pages=[]
for i,page in enumerate(doc):
 words=page.get_text('words',sort=True)
 if len(words)>20000: raise ValueError('Too many words')
 pages.append({'page':i+1,'width':page.rect.width,'height':page.rect.height,'words':[{'box':list(w[:4]),'text':w[4]} for w in words]})
print(json.dumps(pages,ensure_ascii=False))`;

export function draftPublication(pages, provenance) {
  if (!Array.isArray(pages) || !pages.length || pages.length > 100) throw new Error('Invalid page count');
  const result = pages.map((page, index) => {
    if (page.page !== index + 1 || !Number.isFinite(page.width) || !Number.isFinite(page.height) || page.width <= 0 || page.height <= 0 || !Array.isArray(page.words) || page.words.length > 20000) throw new Error('Invalid page geometry');
    for (const word of page.words) {
      if (typeof word.text !== 'string' || word.text.length > 2000 || !Array.isArray(word.box) || word.box.length !== 4 || word.box.some(n => !Number.isFinite(n)) || word.box[2] < word.box[0] || word.box[3] < word.box[1]) throw new Error('Invalid word geometry');
    }
    // Large standalone amounts are review anchors, never asserted product prices.
    // Smaller crossed-out/unit/Pfand amounts remain in the retained raw words.
    const anchors = page.words.filter(w => /^\d{1,4}[.,]\d{2}$/.test(w.text) && w.box[3] - w.box[1] >= Math.max(30, page.height * .018));
    const drafts = anchors.map((anchor, i) => {
      const [x, y, right, bottom] = anchor.box;
      const region = [Math.max(0, x - page.width * .36), Math.max(0, y - page.height * .22), Math.min(page.width, right + page.width * .08), Math.min(page.height, bottom + page.height * .06)];
      const nearby = page.words.filter(w => w.box[0] <= region[2] && w.box[2] >= region[0] && w.box[1] <= region[3] && w.box[3] >= region[1]);
      return { id: `p${page.page}-anchor-${i + 1}`, page: page.page, amountText: anchor.text, anchorBox: anchor.box, contextBox: region, snippet: nearby.map(w => w.text).join(' '), reviewStatus: 'unreviewed', productName: null, productPriceCents: null, comparisonEligible: false, ambiguities: ['Spatial context may include neighbouring products', 'Amount may be loyalty, prior, unit or deposit price', 'Product/pack/conditions/deposit require visual review'] };
    });
    return { ...page, draftCount: drafts.length, drafts, visualReviewComplete: false, textLayerPresent: page.words.length > 0 };
  });
  return { leafletDraftVersion: 1, mode: 'publication_review_queue', rankingEnabled: false, inventoryComplete: false, extractionComplete: false, provenance, pageCount: result.length, pagesWithText: result.filter(p => p.textLayerPresent).length, priceAnchorCount: result.reduce((sum, p) => sum + p.draftCount, 0), limitations: ['All pages processed; text-layer processing does not establish complete product extraction', 'Image-only product text/prices and promotions without standalone amounts may be missed', 'Draft price anchors are not unique products or verified offers'], pages: result };
}

export async function extractLeafletCatalogue(captureDir, output, { pythonExecutable = '/tmp/basketwise-pdf-env/bin/python' } = {}) {
  const directory = await realpath(resolve(root, captureDir));
  const localRoot = await realpath(local);
  const target = resolve(root, output);
  const parent = await realpath(resolve(target, '..'));
  if (!directory.startsWith(localRoot + sep) || !parent.startsWith(localRoot + sep) && parent !== localRoot) throw new Error('Capture/output must remain in private local-data');
  const manifestBytes = await readFile(resolve(directory, 'manifest.json'));
  if (manifestBytes.length > 1024 * 1024) throw new Error('Manifest too large');
  const manifest = JSON.parse(manifestBytes);
  const source = manifest.sources?.find(s => s.filename === 'leaflet.pdf');
  if (manifest.retailerCaptureVersion !== 1 || !source || !/^[a-f0-9]{64}$/.test(source.sha256)) throw new Error('Invalid source manifest');
  const pdfPath = await realpath(resolve(directory, 'leaflet.pdf'));
  if (!pdfPath.startsWith(directory + sep)) throw new Error('PDF escapes capture');
  if ((await stat(pdfPath)).size > 20 * 1024 * 1024) throw new Error('PDF too large');
  const pdf = await readFile(pdfPath);
  if (hash(pdf) !== source.sha256 || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('PDF hash/content mismatch');
  const extracted = spawnSync(pythonExecutable, ['-c', python, pdfPath], { encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024 });
  if (extracted.error || extracted.status !== 0) throw new Error('PDF extraction failed; use an isolated Python environment with PyMuPDF');
  const report = draftPublication(JSON.parse(extracted.stdout), { storeId: manifest.storeId, leafletId: manifest.leafletId ?? 'supplement', sourceUrl: source.url, sourceSha256: source.sha256, manifestSha256: hash(manifestBytes), retrievedAt: source.retrievedAt, recordedAdvertisedWindow: manifest.pageAdvertisedWindow, extractionMethod: 'PyMuPDF text words; large-amount geometric anchors v1', sourceDataLicence: manifest.sourceDataLicence });
  await writeFile(target, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { pageCount: report.pageCount, pagesWithText: report.pagesWithText, priceAnchorCount: report.priceAnchorCount, perPage: report.pages.map(p => ({ page: p.page, anchors: p.draftCount })) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--capture' || args[2] !== '--out') { console.error('Usage: node scripts/extract-leaflet-catalogue.mjs --capture local-data/CAPTURE --out local-data/NEW-DRAFT.json'); process.exitCode = 1; }
  else try { console.log(JSON.stringify(await extractLeafletCatalogue(args[1], args[3]), null, 2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
