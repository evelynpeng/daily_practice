// Offline cache. Online: always ask the server for the newest files (so a push shows up on the next open).
// Offline / server unreachable (e.g. GitHub blocked): fall back to the saved copy after 2.5 s, so the app always opens.
// Bump CACHE on every release (keep it in step with APP_VERSION in index.html).
const CACHE = 'daily-practice-v11';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request.url, { cache: 'no-cache' }).then(r => {
      if (!r.ok) return hit || r;
      cache.put(e.request, r.clone());
      return r;
    });
    if (!hit) return fresh;
    e.waitUntil(fresh.catch(() => {}));
    return Promise.race([fresh.catch(() => hit), new Promise(res => setTimeout(() => res(hit), 2500))]);
  })());
});
