const CACHE_NAME = 'v9';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/qr.js',
  '/site.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS.map((u) => new Request(u, { cache: 'reload' })))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  if (path.includes('sync.php')) return;

  const isNavigation = req.mode === 'navigate' || (req.destination === 'document');

  if (isNavigation) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('/index.html', res.clone());
        }
        return res;
      } catch {
        const cached = await caches.match('/index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchPromise = fetch(req, { cache: 'no-store' }).then(res => {
      if (res && res.ok) {
        const cache = caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
      }
      return res;
    }).catch(() => null);
    if (cached) {
      fetchPromise.catch(() => {});
      return cached;
    }
    const res = await fetchPromise;
    return res || Response.error();
  })());
});