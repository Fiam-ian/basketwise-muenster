import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ...['app', 'contracts', 'demo-data', 'optimizer', 'open-prices', 'coverage', 'audit-view'].map(name =>
    ['/src/' + name + '.mjs', ['src/' + name + '.mjs', 'text/javascript; charset=utf-8']])
]);
const port = Number(process.env.PORT ?? 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1–65535.');
createServer(async (request, response) => {
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
  console.log('Münster grocery planner demo: http://127.0.0.1:' + port);
});
