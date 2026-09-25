const CACHE_NAME = 'v1'; // Edit this to push changes, this also displays in the settings.
const RUNTIME = 'runtime';
const NET_TIMEOUT = 6000;

const PRECACHE_URLS = [
  '/index.html',
  '/style.css',
  '/script.js',
  '/qr.js',
  '/lz.js',
  '/i18n/langs.json',
  '/i18n/en.js',
  '/site.webmanifest'
];

const reload = (u) => new Request(u, { cache: 'reload' });

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS.map(reload));

    try {
      const langsRes = await cache.match('/i18n/langs.json');
      const langs = await langsRes.json();
      const urls = Object.keys(langs).filter((c) => c !== 'en').map((c) => `/i18n/${c}.js`);
      await Promise.allSettled(urls.map((u) => cache.add(reload(u))));
    } catch (_) {}

    try {
      const manRes = await cache.match('/site.webmanifest');
      const manifest = await manRes.json();
      const icons = (manifest.icons || [])
        .map((i) => new URL(i.src, self.location.origin))
        .filter((u) => u.origin === self.location.origin)
        .map((u) => u.pathname);
      await Promise.allSettled([...new Set([...icons, '/favicon.ico'])].map((u) => cache.add(reload(u))));
    } catch (_) {}

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_NAME && k !== RUNTIME).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

function fetchWithTimeout(req, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(req, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('sync.php')) return;
  if (url.pathname.startsWith('/i18n/editor')) return;
  if (url.pathname === '/sw.js') return;

  const isNav = req.mode === 'navigate';
  const key = isNav ? '/index.html' : req;

  e.respondWith((async () => {
    const cached = await caches.match(key, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const res = await fetchWithTimeout(req, NET_TIMEOUT);
      if (res && res.ok && !isNav) {
        const copy = res.clone();
        e.waitUntil(caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {}));
      }
      return res;
    } catch (_) {
      return Response.error();
    }
  })());
});
