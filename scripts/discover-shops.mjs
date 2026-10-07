import { lstat, realpath, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { normalizeShopDiscovery } from '../src/shop-discovery.mjs';
import { validateCaptureOutput } from './capture-retailer-source.mjs';

export const PUBLIC_MUENSTER_CENTRE = Object.freeze({ lat: 51.96236, lon: 7.62571 });
const endpoints = new Set(['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']);
export function shopDiscoveryQuery(radiusKm) {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 25) throw new Error('Unsupported radius.');
  return `[out:json][timeout:25];nwr["shop"~"^(supermarket|convenience|grocery|greengrocer|health_food)$"](around:${radiusKm * 1000},${PUBLIC_MUENSTER_CENTRE.lat},${PUBLIC_MUENSTER_CENTRE.lon});out tags center;`;
}
export async function discoverShops(radiusKm, outputPath, { endpoint = 'https://overpass-api.de/api/interpreter', fetchImpl = fetch } = {}) {
  const query = shopDiscoveryQuery(radiusKm), output = validateCaptureOutput(outputPath);
  if (!endpoints.has(endpoint)) throw new Error('Unsupported discovery endpoint.');
  const root = fileURLToPath(new URL('../local-data/', import.meta.url));
  if (await realpath(root) !== resolve(root)) throw new Error('Unsupported local output root.');
  try { await lstat(output); throw new Error('Output exists.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const response = await fetchImpl(endpoint + '?' + new URLSearchParams({ data: query }), {
    redirect: 'error', signal: AbortSignal.timeout(40000),
    headers: { 'User-Agent': 'Basketwise-Muenster-prototype/0.1 https://github.com/Fiam-ian/basketwise-muenster' }
  });
  if (response.status !== 200 || !response.body) throw new Error('Discovery service unavailable.');
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > 2 * 1024 * 1024) throw new Error('Discovery size bound exceeded.');
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks), raw = JSON.parse(bytes.toString('utf8'));
  if (raw.remark) throw new Error('Partial discovery response.');
  const discovery = normalizeShopDiscovery(raw, { origin: PUBLIC_MUENSTER_CENTRE, radiusKm,
    fetchedAt: new Date().toISOString(), sourceUrl: endpoint });
  const report = { ...discovery, query, responseSha256: createHash('sha256').update(bytes).digest('hex'),
    osmBaseTimestamp: typeof raw.osm3s?.timestamp_osm_base === 'string' ? raw.osm3s.timestamp_osm_base : null };
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { mappedCandidates: discovery.shops.length,
    candidatesWithinRadius: discovery.shops.filter(shop => shop.withinRadius).length,
    radiusKm, discoveryComplete: false, inventoryAvailable: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') console.log('Public Münster centre discovery: --radius-km NUMBER --out NEW_LOCAL_DATA_JSON [--endpoint ALLOWLISTED_OVERPASS_URL]');
  else if (![4, 6].includes(args.length) || args[0] !== '--radius-km' || args[2] !== '--out' || (args.length === 6 && args[4] !== '--endpoint')) {
    console.error('Use --radius-km NUMBER --out NEW_LOCAL_DATA_JSON'); process.exitCode = 1;
  } else try { console.log(JSON.stringify(await discoverShops(Number(args[1]), args[3], args.length === 6 ? { endpoint: args[5] } : {}))); }
  catch { console.error('Shop discovery unavailable; no successful or complete result recorded.'); process.exitCode = 1; }
}
