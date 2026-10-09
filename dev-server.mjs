import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadLocalAppReports } from './src/local-app-data.mjs';
const assets = new Map([
  ['/', ['app.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ...['app.html', 'app.css', 'app.webmanifest', 'app-sw.mjs', 'app-icon-192.png', 'app-icon-512.png'].map(name => ['/' + name, [name, name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : name.endsWith('.webmanifest') ? 'application/manifest+json' : name.endsWith('.png') ? 'image/png' : 'text/javascript; charset=utf-8']]),
  ['/offers.html', ['offers.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ...['app', 'contracts', 'demo-data', 'optimizer', 'open-prices', 'coverage', 'audit-view', 'offer-view', 'offers-app', 'retailer-source', 'shopping-list', 'mobile-app', 'product-picker', 'food-icons', 'native-app-data'].map(name =>
    ['/src/' + name + '.mjs', ['src/' + name + '.mjs', 'text/javascript; charset=utf-8']])
]);
const port = Number(process.env.PORT ?? 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1–65535.');
const root = fileURLToPath(new URL('./', import.meta.url));
const localReports = await loadLocalAppReports(root, process.env.BASKETWISE_REPORTS ?? '');
createServer(async (request, response) => {
  const host = request.headers.host;
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) { response.writeHead(421); response.end('Unsupported host'); return; }
  if (new URL(request.url, 'http://localhost').pathname === '/api/catalogue') {
    if (!['GET', 'HEAD'].includes(request.method) || (request.headers.origin && request.headers.origin !== `http://${host}`) || request.headers['sec-fetch-site'] === 'cross-site') { response.writeHead(403); response.end('Unsupported request'); return; }
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ reports: localReports })); return;
  }
  const asset = assets.get(new URL(request.url, 'http://localhost').pathname);
  if (!asset || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404); response.end('Not found'); return;
  }
  try {
    const body = await readFile(fileURLToPath(new URL(asset[0], import.meta.url)));
    response.writeHead(200, {
      'Content-Type': asset[1],
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(500); response.end('Asset unavailable');
  }
}).listen(port, '127.0.0.1', () => {
  console.log('Basketwise app: http://127.0.0.1:' + port);
});
