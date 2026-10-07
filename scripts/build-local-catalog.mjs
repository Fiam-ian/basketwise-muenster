import { readFile, stat, mkdir, open, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { parseAuditReport, AUDIT_MAX_BYTES } from '../src/audit-view.mjs';
import { validateProductCatalog } from '../src/product-catalog.mjs';

const attributes = ['milkSource', 'fatBasisPoints', 'processing', 'organic', 'lactoseFree'];
const boundedText = (value, max) => typeof value === 'string' && value.trim() && value.length <= max ? value : null;
const positive = value => Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER ? value : null;
const id = value => Number.isSafeInteger(value) && value > 0 ? value : null;
const decimal = value => /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(String(value)) && String(value).length <= 64 ? String(value) : null;

/** Offline projection only. No review status, branch mapping or price eligibility is inferred. */
export async function buildLocalCatalog(reportPath, outputPath) {
  const info = await stat(reportPath);
  if (!info.isFile() || info.size > AUDIT_MAX_BYTES) throw new Error('Invalid input size.');
  const bytes = await readFile(reportPath);
  if (bytes.length > AUDIT_MAX_BYTES) throw new Error('Invalid input size.');
  parseAuditReport(bytes.toString('utf8'));
  const report = JSON.parse(bytes.toString('utf8'));
  const sha = createHash('sha256').update(bytes).digest('hex');
  const rows = [], seen = new Set();
  for (const observation of report.observations) {
    const raw = observation.raw, metadata = raw.product ?? {};
    const recordId = String(observation.providerRecordId);
    if (seen.has(recordId)) throw new Error('Duplicate source identity.');
    seen.add(recordId);
    if ((raw.product_code != null && metadata.code != null && raw.product_code !== metadata.code) ||
        (raw.location_id != null && raw.location?.id != null && raw.location_id !== raw.location.id))
      throw new Error('Conflicting source identity.');
    const code = boundedText(raw.product_code ?? metadata.code, 128);
    const productId = code ? 'op-' + createHash('sha256').update(code).digest('hex')
      : 'unidentified-' + recordId;
    const product = {
      id: productId, name: boundedText(metadata.product_name, 160),
      category: null, brand: boundedText(metadata.brands, 300),
      pack: { quantity: positive(metadata.product_quantity),
        unit: ['g', 'ml', 'count'].includes(metadata.product_quantity_unit) ? metadata.product_quantity_unit : null,
        basis: null },
      attributes: Object.fromEntries(attributes.map(key => [key, null])),
      attributeReview: Object.fromEntries(attributes.map(key => [key, false])),
      metadataReviewed: false,
      source: { provider: 'open-prices', sourceUrl: observation.sourceUrl,
        retrievedAt: observation.capturedAt, licence: report.license }
    };
    validateProductCatalog({ catalogVersion: 1, products: [product] });
    rows.push({ observation, raw, product, code, recordId });
  }
  const output = resolve(outputPath);
  await mkdir(dirname(output), { recursive: true });
  // Exclusive creation protects existing databases and source files, including symlinks.
  const handle = await open(output, 'wx', 0o600);
  await handle.close();
  let db;
  try {
    db = new DatabaseSync(output);
    db.exec(await readFile(new URL('../data/catalog-schema.sql', import.meta.url), 'utf8'));
    db.exec('BEGIN');
    db.prepare('INSERT INTO reports(sha256,retrieved_at,attribution,licence) VALUES(?,?,?,?)')
      .run(sha, report.generatedAt, report.attribution, report.license);
    for (const { observation: o, raw: r, product: p, code, recordId } of rows) {
      db.prepare('INSERT OR IGNORE INTO products VALUES(?,?,?)').run(p.id, 'open-prices', code);
      const location = id(r.location_id ?? r.location?.id);
      if (location !== null) db.prepare('INSERT OR IGNORE INTO locations(id) VALUES(?)').run(location);
      db.prepare('INSERT INTO product_snapshots VALUES(?,?,?,?)').run(sha, recordId, p.id, JSON.stringify(p));
      db.prepare(`INSERT INTO observations(report_sha256,record_id,product_id,location_id,observed_on,
        retrieved_at,source_url,price_decimal,currency,price_per,discounted,discount_type)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(sha, recordId, p.id, location, o.observedOn,
          o.capturedAt, o.sourceUrl, decimal(r.price), boundedText(r.currency, 8), boundedText(r.price_per, 32),
          typeof r.price_is_discounted === 'boolean' ? Number(r.price_is_discounted) : null,
          boundedText(r.discount_type, 64));
    }
    db.exec('COMMIT');
    const summary = { observations: rows.length,
      products: db.prepare('SELECT count(*) AS n FROM products').get().n,
      locations: db.prepare('SELECT count(*) AS n FROM locations').get().n,
      reviewedProducts: 0, rankingEnabled: false, inventoryComplete: false };
    db.close(); db = null;
    return summary;
  } catch (error) {
    db?.close();
    await unlink(output);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('Offline: --report LOCAL_AUDIT.json --out NEW_LOCAL_DATABASE.sqlite');
  } else if (args.length !== 4 || args[0] !== '--report' || args[2] !== '--out') {
    console.error('Use --report LOCAL_AUDIT.json --out NEW_LOCAL_DATABASE.sqlite'); process.exitCode = 1;
  } else {
    try { console.log(JSON.stringify(await buildLocalCatalog(args[1], args[3]))); }
    catch { console.error('Local catalogue build failed; validate input and choose a new output path.'); process.exitCode = 1; }
  }
}
