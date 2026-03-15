const CACHE_NAME = 'v1'; // Edit this to push changes, this also displays in the settings.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/qr.js',
  '/lz.js',
  '/i18n/langs.json',
  '/i18n/en.js',
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
  if (url.pathname.includes('sync.php')) return;
  if (url.pathname.startsWith('/i18n/editor')) return;
  
  const isNavigation = req.mode === 'navigate' || req.destination === 'document';
  const cacheKey = isNavigation ? '/index.html' : req;

  e.respondWith((async () => {
    const cached = await caches.match(cacheKey);
    const fetchPromise = fetch(req, { cache: 'no-store' }).then(res => {
      if (res && res.ok) {
        caches.open(CACHE_NAME).then(c => c.put(cacheKey, res.clone()));
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
