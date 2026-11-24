# todo.73.nu

A privacy-focused, offline-capable todo app with end-to-end encrypted sync across devices and optional push reminders. No accounts, no tracking, no ads.

**Live:** [todo.73.nu](https://todo.73.nu)

---

## Features

- **Single, range, and recurring todos** (daily, weekly, biweekly, monthly, yearly, with span mode for flexible windows, e.g. Friday to Sunday)
- **Tags** with built-in presets (Urgent, Reminder, Low priority) and custom tags. Filter the day view by one or more tags at once, including across isolated folders
- **Folders** with colors, per-device hide/isolate options, and the ability to exclude folders from sync
- **Drag & drop reordering** for mouse and touch
- **End-to-end encrypted sync** using AES-256-GCM, key derived with PBKDF2 (100,000 iterations). The server never sees your data
- **Shared folders** to share individual folders with others via a separate sync key
- **Offline-first PWA** that is installable, works without internet, and syncs when back online
- **Reminders** as push notifications for todos with a time, even while the app is closed. Opt-in per device, end-to-end encrypted like sync, with a default lead time and a choice per todo (own lead time or no reminder)
- **Daily summary** of open and overdue todos as a notification, up to four times a day. It stays silent once nothing is open
- **Notifications per folder** that can be switched off on each device
- **Overdue list** on top of today with everything missed in the last 30 days, plus an optional counter on the app icon
- **Bilingual** base-support for English and German
- **Dark/light theme** with customizable accent color
- **Import/export** as JSON
- **Clean Up tool** to remove past todos and trim old completion history
- **GDPR-friendly** with no analytics, no cookies, no user accounts
- **Community translations** via a built-in [translation editor](https://todo.73.nu/i18n/editor). Contributors are credited by name with an optional link

---

## How Sync Works

Sync is opt-in. When enabled:

1. Your todos are encrypted locally with AES-256-GCM before leaving your device
2. The encryption key is derived from your sync key using PBKDF2
3. Only the encrypted blob is sent to the server, never the key
4. A SHA-256 hash of your sync key is used as the server-side identifier
5. Conflict resolution merges completion dates from both sides and uses `_modified` timestamps for content conflicts. Schedule fields (date, recurrence, etc.) participate fully in conflict detection

Anyone with your sync key has full access to the encrypted data. Treat it like a password.

---

## Overdue List and App Badge

Above today's todos, the app lists what was missed in the last 30 days.

- A todo is overdue if the last day it was scheduled for, before today, is neither done nor skipped. A range todo counts once its end date has passed
- A recurring todo that is due again today is not listed: today's occurrence replaces the missed one
- Checking an overdue todo completes it for the missed day. "Move to today" reschedules a single todo, "Dismiss" skips the missed day of a recurring or range todo
- The list follows the active folder and tag filters and can be turned off in Settings
- Where the browser supports it (installed apps), the app icon shows a counter of open todos for today plus overdue ones. This can be turned off in Settings as well

Both work without a server.

---

## How Notifications Work

Notifications are opt-in per device (Settings, "Notifications"). A browser can only wake a closed web app through Web Push, so this part needs the server.

1. The device works out the upcoming reminders and summaries for the next 30 days
2. Each notification text is encrypted on the device with AES-256-GCM. The server gets the due time and the ciphertext, not the text
3. A scheduler calls `push.php` once a minute. It sends whatever is due through the push service of the browser vendor (Google, Apple, Mozilla, Microsoft)
4. The service worker decrypts the message on the device and shows it

### What gets sent

- **Reminders** for todos that have a time. Todos without a time only appear in the daily summary. The built-in "Reminder" tag is a label and does not trigger a notification
- **Daily summary** with the number of open and overdue todos and the first titles
- **A renewal notice** when the planned 30 days are about to run out because the app was not opened on any device

### Where to set it up

| Setting | Where | Applies to |
|---|---|---|
| Reminders on this device | Settings, "Notifications" | This device |
| Default reminder (at the set time, or 5 to 60 minutes before) | Settings, "Notifications" | All devices with the sync key |
| Daily summary on/off and its times (up to four a day) | Settings, "Notifications" | All devices with the sync key |
| Reminder for one todo (default, none, or its own lead time) | The todo's edit form, below the time | That todo, on all devices |
| Notifications for one folder | Folder settings | This device |
| Test notification | Settings, "Notifications" | This device |

A summary is only sent while something is open, so a second one in the evening stays silent once everything is done. Hidden folders never notify.

### With sync

The schedule belongs to the sync key: a todo added on your desktop reminds you on your phone, without the phone having to open the app first. Every device with the key keeps the schedule current, including devices that have notifications turned off. To do that, they ask the server on start whether reminders are active for the key. Todos in folders that are excluded from sync are scheduled for the device they live on only, and are not counted in the daily summary.

### Privacy

**What the server can see:** push addresses of subscribed browsers, due times, whether an entry is a reminder or a summary, and a pseudonymous tag per folder (so a device can mute folders). It cannot see titles, notes, tags or folder names, and it never receives the sync key or the notification key.

**What others can see:** the push service of the browser vendor relays the encrypted message and therefore knows when a device receives something from this server. On the device, the notification shows the todo title, depending on the system settings also on the lock screen.

Turning notifications off removes the device's push address from the server. Once no device is registered, the schedule is deleted as well.

### What to expect

- Push delivery is best effort. Browsers, operating systems and push services may delay or drop a message, for example while a phone is offline for long or in a strict battery-saving mode. The overdue list, the app icon counter and the daily summary exist so that a missed push does not mean a missed todo
- iPhone and iPad only deliver notifications to the installed app (Share, "Add to Home Screen"), iOS/iPadOS 16.4 or later
- The "Test notification" button checks the whole chain. If it shows a generic "You have todos due" instead of the test text, the message arrived but could not be decrypted on the device
- Times follow the clock and time zone of the device that last updated the schedule
- A reminder that could not be sent on time is sent late, up to 24 hours

---

## Self-Hosting

The app is a static frontend. You can host it on any web server, CDN, or even open `index.html` directly in a browser. PHP is only required for sync and notifications.

### Without sync (static only)

1. Clone the repository
2. Serve the files from any static host (Nginx, Apache, GitHub Pages, Netlify, etc.)
3. Done. No server-side setup needed

All data is stored in `localStorage` on the device. The overdue list and the app icon counter work here too, notifications do not.

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

### With notifications (requires PHP and a scheduler)

#### Requirements

- PHP 8.0+ with the `openssl` and `curl` extensions
- Outgoing HTTPS connections from PHP to the push services
- Something that calls `push.php` once a minute

#### Setup

1. Deploy `push.php` next to `sync.php` and make sure the directory is writable. `push_data/` is created on first use
2. Open the app once and open Settings. This creates `push_data/config.php` with the server keys and a `cronKey`
3. Set up the minutely trigger, one of:
   - **Cron on the server:** `* * * * * php /path/to/push.php cron`
   - **No cron available:** let an external scheduler (for example cron-job.org) request `https://your.domain/push.php` every minute with the header `X-Cron-Key: <cronKey>`. If the service cannot send headers, use `https://your.domain/push.php?cron=<cronKey>` instead; the key will then show up in access logs
4. Enable notifications in the app and use "Test notification"

If the trigger stops, nothing is lost: the next run sends everything that became due in the meantime (up to 24 hours late). A second, independent trigger is a cheap safety net, overlapping runs are detected. The app shows a warning in Settings when the server has not run for 10 minutes.

`config.php` also holds `subject` (contact URL sent to the push services, defaults to your host name) and `allowedHosts` (the push services the server is allowed to contact).

| Limit (push.php defaults) | Value |
|---|---|
| Scheduled notifications per sync key or device | 600 |
| Devices per sync key | 10 |
| Max request size | 256 KB |
| Max schedules | 20,000 |
| Rate limit | 120 requests / 60 seconds per IP |
| Schedule TTL (inactive) | 90 days |

These can be adjusted at the top of `push.php`.

### Storage limits (sync.php defaults)

| Limit | Value |
|---|---|
| Max payload per push | 512 KB |
| Max stored files | 20,000 |
| Max total storage | 500 MB |
| Rate limit | 120 requests / 60 seconds per IP |
| Data TTL (inactive) | 90 days |

These can be adjusted inside `sync.php`.

### Security notes

- `sync_data/` should not be publicly browsable. Add a `.htaccess` deny rule or equivalent
- `push_data/` holds the server's private push key and the cron key. It gets a `.htaccess` deny rule automatically, and its files are written so that PHP answers with an empty 404 if they are requested. On Nginx, add a `location ^~ /push_data/ { deny all; }` rule anyway
- `push.php` only ever contacts the push service hosts listed in `allowedHosts`, over HTTPS and without following redirects
- Like the sync endpoint, the push endpoint is open: anyone can register their own browser and a schedule for it. A browser subscription is bound to this server's key and this site, so the endpoint cannot be used to notify anyone else
- Turning notifications off on the last device deletes the schedule from the server, and so does "Delete Server Data"
- Todos and folders that arrive through sync, shared folders or an import file are normalized before use, and user text is escaped when it is rendered. A shared folder or a prepared import file cannot inject markup or scripts
- The sync endpoint does not require authentication beyond the write/delete tokens derived from your sync key
- Disabling sync in the app does **not** delete server data. Use the "Delete Server Data" button in Settings to remove it

---

## Service Worker & Offline Support

The app uses a service worker (`sw.js`) for offline capability, fast repeat loads and push notifications.

**On install**, these files are precached with `cache: 'reload'` to always fetch fresh copies:
`/index.html`, `/style.css`, `/script.js`, `/qr.js`, `/lz.js`, `/i18n/langs.json`, `/i18n/en.js`, `/site.webmanifest`, followed by every language file listed in `langs.json` and the icons from the manifest.

**On activate**, caches from previous versions are deleted. The cache is versioned through `CACHE_NAME` in `sw.js`, which is also the version shown in Settings.

**Fetch strategy:**

- Requests to `sync.php`, `push.php`, `/sw.js` and the translation editor bypass the service worker, so they always go directly to the network
- Everything else is served cache-first. Loading the app returns the cached `index.html`, other files come from the cache if present
- What is not cached yet is fetched from the network (6 second timeout) and kept in a runtime cache for next time

This means the app loads instantly on repeat visits and remains fully functional without an internet connection. Sync resumes automatically once the device is back online.

**How updates reach users:** the browser checks `sw.js` whenever the app is opened. If the file changed, the new worker installs, downloads the precached files again and takes over. The new version is visible the next time the app is opened after that. Changing another file alone does not trigger this, so:

**When self-hosting:** after changing any app file, increment `CACHE_NAME` in `sw.js`. If you add or rename static files, also update `PRECACHE_URLS`.

**Push:** the service worker receives push messages, decrypts them with a key the page stored in IndexedDB, shows the notification and opens the matching day and todo when it is tapped. A message it cannot decrypt is still shown, with a generic text, because browsers revoke a subscription that receives pushes without showing anything.

---

## Translations (i18n)

Language files live in `/i18n/` as separate `.js` files loaded and cached on demand. English and German are built-in, community translations are managed through a [translation editor](https://todo.73.nu/i18n/editor).

### How it works

- Anyone can pick a language, translate keys, save a draft link, and submit for review
- Submissions go to a pending queue. The admin reviews a diff of changed keys before approving
- Approved translations are published as a new `.js` file and appear in the app's language selector
- Contributors are credited by name (with optional URL) in the app when their language is active
- Keys a translation does not have yet are shown in English

---

## Project Structure
```
/
├── index.html          # App shell
├── script.js           # All app logic (Store, Sync, Push, UI)
├── style.css           # Styles
├── sync.php            # Sync backend
├── push.php            # Notification backend (schedules, Web Push sender)
├── sw.js               # Service worker (offline cache, push)
├── qr.js               # QR code generator
├── lz.js               # LZ-Compression library
├── site.webmanifest    # PWA manifest
└── i18n/               # Translations
    ├── en.js           # English (built-in)
    ├── de.js           # German (built-in)
    ├── langs.json      # Language registry

Created on the server at runtime:
├── sync_data/          # Encrypted sync blobs
└── push_data/          # Push keys (config.php) and encrypted schedules
```

---

## License

MIT, see [LICENSE](LICENSE)

---

*Built by [Christian Leroch](https://www.leroch.net) · [Support this project](https://ko-fi.com/nirastich)*
