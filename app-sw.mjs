// Cache public application code only. Never intercept retailer data or private basket state.
const CACHE = 'basketwise-app-shell-v3';
const ASSETS = ['/app.html', '/app.css', '/app.webmanifest', '/favicon.svg', '/app-icon-192.png', '/app-icon-512.png', '/src/mobile-app.mjs', '/src/product-picker.mjs', '/src/native-app-data.mjs', '/src/food-icons.mjs', '/src/offer-view.mjs', '/src/retailer-source.mjs'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('basketwise-app-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !ASSETS.includes(url.pathname)) return;
  event.respondWith(fetch(event.request).then(response => { if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(url.pathname, copy))); } return response; }).catch(() => caches.match(url.pathname)));
});
