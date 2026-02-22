# todo.73.nu

A privacy-focused, offline-capable todo app with end-to-end encrypted sync across devices. No accounts, no tracking, no ads.

**Live:** [todo.73.nu](https://todo.73.nu)

---

## Features

- **Single, range, and recurring todos** (daily, weekly, biweekly, monthly, yearly, with span mode for flexible windows, e.g. Friday to Sunday)
- **Folders** with colors, per-device hide/isolate options, and the ability to exclude folders from sync
- **Drag & drop reordering** for mouse and touch
- **End-to-end encrypted sync** using AES-256-GCM, key derived with PBKDF2 (100,000 iterations). The server never sees your data
- **Shared folders** to share individual folders with others via a separate sync key
- **Offline-first PWA** that is installable, works without internet, and syncs when back online
- **Bilingual** support for English and German
- **Dark/light theme** with customizable accent color
- **Import/export** as JSON
- **Clean Up tool** to remove past todos and trim old completion history
- **GDPR-friendly** with no analytics, no cookies, no user accounts

---

## How Sync Works

Sync is opt-in. When enabled:

1. Your todos are encrypted locally with AES-256-GCM before leaving your device
2. The encryption key is derived from your sync key using PBKDF2
3. Only the encrypted blob is sent to the server, never the key
4. A SHA-256 hash of your sync key is used as the server-side identifier
5. Conflict resolution merges completion dates from both sides and uses `_modified` timestamps for content conflicts

Anyone with your sync key has full access to the encrypted data. Treat it like a password.

---

## Self-Hosting

The app is a static frontend. You can host it on any web server, CDN, or even open `index.html` directly in a browser. PHP is only required if you want to use the sync feature.

### Without sync (static only)

1. Clone the repository
2. Serve the files from any static host (Nginx, Apache, GitHub Pages, Netlify, etc.)
3. Done. No server-side setup needed

All data is stored in `localStorage` on the device.

### With sync (requires PHP)

#### Requirements

- PHP 8.0+ with file write access
- A writable directory for `sync_data/`

#### Setup

1. Clone the repository
2. Point your web server at the project root
3. Ensure `sync.php` and the directory it lives in are writable by the web server process
4. No database or configuration file needed

`sync_data/` is created automatically on first use.

### Storage limits (sync.php defaults)

| Limit | Value |
|---|---|
| Max payload per push | 512 KB |
| Max stored files | 20,000 |
| Max total storage | 500 MB |
| Rate limit | 120 requests / 60 seconds per IP |
| Data TTL (inactive) | 90 days |

These can be adjusted at the top of `sync.php`.

### Security notes

- `sync_data/` should not be publicly browsable. Add a `.htaccess` deny rule or equivalent
- The sync endpoint does not require authentication beyond the write/delete tokens derived from your sync key
- Disabling sync in the app does **not** delete server data. Use the "Delete Server Data" button in Settings to remove it

---

## Service Worker & Offline Support

The app uses a service worker (`sw.js`) for offline capability and fast repeat loads.

**On install**, the following files are precached with `cache: 'reload'` to always fetch fresh copies:
`/`, `/index.html`, `/style.css`, `/script.js`, `/qr.js`, `/site.webmanifest`

**On activate**, all caches from previous versions are deleted. The cache is versioned (`CACHE_NAME = 'v9'`), so bumping this string causes old caches to be purged on the next visit.

**Fetch strategy:**

- `sync.php` requests bypass the service worker entirely, so sync always goes directly to the network
- Navigation requests (loading the app) try the network first, fall back to cached `index.html` if offline, and update the cache on success
- All other static assets use stale-while-revalidate: the cached version is served immediately for speed, while a background fetch updates the cache for next time. If there is no cache yet, it waits for the network

This means the app loads instantly on repeat visits and remains fully functional without an internet connection. Sync resumes automatically once the device is back online.

**When self-hosting:** if you add or rename static files, update `PRECACHE_URLS` in `sw.js` and increment `CACHE_NAME` to ensure all clients pick up the new cache on their next visit.

---

## Project Structure

```
/
├── index.html          # App shell
├── script.js           # All app logic (Store, Sync, UI)
├── style.css           # Styles
├── sync.php            # Sync backend
├── sw.js               # Service worker
├── qr.js               # QR code generator
└── manifest.json       # PWA manifest
```

---

## License

MIT, see [LICENSE](LICENSE)

---

*Built by [Christian Leroch](https://www.leroch.net) · [Support this project](https://ko-fi.com/nirastich)*
