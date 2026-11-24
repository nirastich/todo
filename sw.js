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
  if (url.pathname.includes('push.php')) return;
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

/* ---------- Push notifications ---------- */

// The page stores everything the worker needs in IndexedDB (a worker cannot read localStorage):
//   keys    { <channel prefix>: CryptoKey }  non-extractable AES-GCM keys
//   strings localized texts for the notifications
//   mute    folder tags hidden on this device (left out of the daily summary)
//   reg     what is needed to re-register after the browser rotated the subscription
const PUSH_DB = 'todo_push';
const ICON = '/android-chrome-192x192.png';

function pushStore(mode) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(PUSH_DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('kv', mode);
      tx.oncomplete = tx.onabort = () => open.result.close();
      resolve(tx.objectStore('kv'));
    };
  });
}

async function pushGet(key) {
  const store = await pushStore('readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function pushSet(key, value) {
  const store = await pushStore('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function fill(template, n) {
  return String(template || '').replace('{n}', n);
}

function formatTime(t, lang) {
  if (!/^\d\d:\d\d$/.test(t || '')) return '';
  if (lang === 'de') return t + ' Uhr';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

async function decryptPush(msg) {
  const keys = await pushGet('keys');
  const key = keys && keys[msg.ch];
  if (!key || typeof msg.c !== 'string') return null;
  const raw = Uint8Array.from(atob(msg.c), (ch) => ch.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: raw.slice(0, 12), additionalData: new TextEncoder().encode(msg.i + ':' + msg.k) },
    key,
    raw.slice(12)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

async function buildNotification(msg, s) {
  const data = await decryptPush(msg);
  if (!data) return null;

  if (data.t === 'r' && typeof data.ti === 'string') {
    return {
      title: data.ti,
      options: { body: formatTime(data.tm, s.lang), tag: 'r:' + data.id + ':' + data.d, data: { date: data.d, todo: data.id } }
    };
  }

  if (data.t === 'd') {
    const muted = new Set((await pushGet('mute')) || []);
    let open = 0, overdue = 0;
    Object.entries(data.c || {}).forEach(([tag, counts]) => {
      if (muted.has(tag)) return;
      open += Number(counts[0]) || 0;
      overdue += Number(counts[1]) || 0;
    });
    const titles = (data.it || []).filter((it) => !muted.has(it[1])).map((it) => it[0]);
    const title = open > 0 ? fill(open === 1 ? s.digestOne : s.digestMany, open)
      : overdue > 0 ? fill(s.digestOverdue, overdue)
      : s.digestNone;
    const parts = [];
    if (open > 0 && overdue > 0) parts.push(fill(s.digestOverdue, overdue));
    if (titles.length) parts.push(titles.slice(0, 3).join(', ') + (open > 3 ? ' …' : ''));
    return { title, options: { body: parts.join(' · '), tag: 'digest', data: { date: data.d } }, badge: open + overdue };
  }

  if (data.t === 'x') return { title: s.renewTitle, options: { body: s.renewBody, tag: 'renew', data: {} } };
  if (data.t === 't') return { title: s.testTitle, options: { body: s.testBody, tag: 'test', data: {} } };
  return null;
}

async function handlePush(event) {
  let s = {};
  let note = null;
  try {
    s = (await pushGet('strings')) || {};
    const msg = event.data ? event.data.json() : null;
    if (msg && msg.v === 1) note = await buildNotification(msg, s);
  } catch (_) {}

  // A push must always end in a visible notification, otherwise browsers revoke the subscription.
  if (!note || !note.title) {
    note = { title: s.fallbackTitle || 'TODO', options: { body: s.fallbackBody || '', tag: 'fallback', data: {} } };
  }
  if (typeof note.badge === 'number' && s.badge !== false && 'setAppBadge' in self.navigator) {
    try { await (note.badge > 0 ? self.navigator.setAppBadge(note.badge) : self.navigator.clearAppBadge()); } catch (_) {}
  }
  await self.registration.showNotification(note.title, { icon: ICON, lang: s.lang || 'en', ...note.options });
}

self.addEventListener('push', (e) => {
  e.waitUntil(handlePush(e));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  e.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = windows.find((c) => ['/', '/index.html'].includes(new URL(c.url).pathname));
    if (app) {
      try { await app.focus(); } catch (_) {}
      app.postMessage({ type: 'push-open', date: data.date || null, todo: data.todo || null });
      return;
    }
    const params = new URLSearchParams();
    if (data.date) params.set('date', data.date);
    if (data.todo) params.set('todo', data.todo);
    const query = params.toString();
    await self.clients.openWindow('/' + (query ? '?' + query : ''));
  })());
});

// The browser replaced the subscription while the app was closed: tell the server right away.
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil((async () => {
    const reg = await pushGet('reg');
    if (!reg || !reg.vapid || !Array.isArray(reg.channels)) return;
    let sub = e.newSubscription;
    if (!sub) {
      const pad = '='.repeat((4 - reg.vapid.length % 4) % 4);
      const key = Uint8Array.from(atob((reg.vapid + pad).replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0));
      sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    }
    const json = sub.toJSON();
    const replaces = (e.oldSubscription && e.oldSubscription.endpoint) || reg.endpoint || undefined;
    for (const ch of reg.channels) {
      await fetch('/push.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'subscribe', id: ch.id, token: ch.token, mute: ch.mute || [], replaces,
          sub: { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }
        })
      });
    }
    await pushSet('reg', { ...reg, endpoint: json.endpoint });
  })());
});
