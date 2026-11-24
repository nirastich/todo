<?php

declare(strict_types=1);

/*
 * Web Push backend for reminders and the daily summary.
 *
 * The server only ever sees: push subscriptions, due timestamps and opaque
 * ciphertexts. Notification texts are encrypted on the device with a key the
 * server never receives and are decrypted by the service worker on arrival.
 *
 * A "channel" is one schedule plus the devices subscribed to it. Its id and
 * write token are derived on the client (from the sync key, or random for a
 * device that does not sync), mirroring how sync.php identifies its blobs.
 *
 * Sending is triggered from outside, once per minute:
 *   - HTTP:  GET push.php  with header "X-Cron-Key: <cronKey>"
 *            (or push.php?cron=<cronKey> if the caller cannot set headers)
 *   - CLI:   php push.php cron
 * The cron key is generated on first use, see push_data/config.php.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const MAX_BODY       = 262144;        // bytes per request
const MAX_ENTRIES    = 600;           // scheduled notifications per channel
const MAX_CIPHERTEXT = 3000;          // base64 chars per notification
const MAX_CFG        = 2000;          // base64 chars of encrypted settings
const MAX_SUBS       = 10;            // devices per channel
const MAX_MUTE       = 200;           // muted folder tags per device
const MAX_FILES      = 20000;         // channels
const MAX_BYTES      = 200 * 1024 * 1024;
const CHANNEL_TTL    = 7776000;       // 90 days without a schedule upload
const MAX_HORIZON    = 34560000;      // 400 days into the future
const MAX_LATE       = 86400;         // drop notifications that are more than a day late
const MAX_ATTEMPTS   = 5;             // delivery attempts per notification
const SENT_MEMORY    = 172800;        // remember delivered ids for 2 days
const RUN_BUDGET     = 20.0;          // seconds one cron run may spend sending
const MAX_PER_RUN    = 25;            // notifications per channel and run, so one channel cannot starve the others
const TEST_INTERVAL  = 10;            // seconds between test pushes per channel
const FILE_GUARD     = "<?php http_response_code(404); exit; ?>\n";

const DEFAULT_PUSH_HOSTS = [
    'fcm.googleapis.com',             // Chrome, Edge (Android), Brave, Opera, Samsung Internet
    '.push.services.mozilla.com',     // Firefox
    '.notify.windows.com',            // Edge (Windows)
    '.push.apple.com',                // Safari, iOS/iPadOS Home Screen web apps
];

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function ensureDir(string $dir): void {
    if (is_dir($dir)) return;
    if (!mkdir($dir, 0700, true) && !is_dir($dir)) {
        respond(500, ['error' => 'storage unavailable']);
    }
}

function sanitizeHex(string $s): string {
    return preg_replace('/[^a-f0-9]/', '', strtolower($s));
}

function b64uEncode(string $bin): string {
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function b64uDecode(string $s): ?string {
    if ($s === '' || !preg_match('/^[A-Za-z0-9_\-+\/]+=*$/', $s)) return null;
    $s = rtrim(strtr($s, '-_', '+/'), '=');
    $bin = base64_decode($s . str_repeat('=', (4 - strlen($s) % 4) % 4), true);
    return $bin === false ? null : $bin;
}

function isBase64(mixed $s, int $maxLen): bool {
    return is_string($s) && $s !== '' && strlen($s) <= $maxLen && preg_match('/^[A-Za-z0-9+\/]+=*$/', $s) === 1;
}

/* ---------- Configuration (VAPID keys, cron key) ---------- */

function generateEcKey(): ?array {
    $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    if (!$key) return null;
    $details = openssl_pkey_get_details($key);
    if (!is_array($details) || !isset($details['ec']['x'], $details['ec']['y'])) return null;
    $public = "\x04"
        . str_pad($details['ec']['x'], 32, "\0", STR_PAD_LEFT)
        . str_pad($details['ec']['y'], 32, "\0", STR_PAD_LEFT);
    return ['key' => $key, 'public' => $public];
}

function readConfig(string $file): ?array {
    if (!is_file($file)) return null;
    $cfg = require $file;
    if (!is_array($cfg) || empty($cfg['vapidPublic']) || empty($cfg['vapidPrivate']) || empty($cfg['cronKey'])) return null;
    $cfg['subject'] = is_string($cfg['subject'] ?? null) ? $cfg['subject'] : '';
    $cfg['allowedHosts'] = is_array($cfg['allowedHosts'] ?? null) ? $cfg['allowedHosts'] : DEFAULT_PUSH_HOSTS;
    return $cfg;
}

function loadConfig(string $dataDir): array {
    $file = $dataDir . '/config.php';
    $cfg = readConfig($file);
    if ($cfg !== null) return $cfg;

    if (!function_exists('openssl_pkey_derive') || !function_exists('curl_init')) {
        respond(503, ['error' => 'push unavailable']);
    }

    // First use: create the keys exactly once, even with concurrent requests.
    $lock = fopen($dataDir . '/config.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) respond(500, ['error' => 'io']);
    clearstatcache();
    $cfg = readConfig($file);
    if ($cfg === null) {
        $ec = generateEcKey();
        $pem = '';
        if ($ec === null || !openssl_pkey_export($ec['key'], $pem) || $pem === '') {
            respond(503, ['error' => 'push unavailable']);
        }
        $host = strtolower((string)($_SERVER['SERVER_NAME'] ?? ''));
        if (!preg_match('/^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/', $host)) $host = 'localhost';
        $new = [
            // Contact for the push services (https: or mailto: URL). Adjust if needed.
            'subject' => 'https://' . $host,
            'vapidPublic' => b64uEncode($ec['public']),
            'vapidPrivate' => $pem,
            // Secret for the cron trigger. Send it as "X-Cron-Key" header.
            'cronKey' => bin2hex(random_bytes(32)),
            // Push services this server may talk to. Entries starting with "." match subdomains.
            'allowedHosts' => DEFAULT_PUSH_HOSTS,
        ];
        $tmp = $file . '.' . bin2hex(random_bytes(6)) . '.tmp';
        $code = "<?php\n\n// Generated by push.php. Keep this file private.\nreturn " . var_export($new, true) . ";\n";
        if (file_put_contents($tmp, $code, LOCK_EX) === false) respond(500, ['error' => 'io']);
        @chmod($tmp, 0600);
        if (!rename($tmp, $file)) { @unlink($tmp); respond(500, ['error' => 'io']); }
        if (function_exists('opcache_invalidate')) @opcache_invalidate($file, true);
        $cfg = readConfig($file);
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    if ($cfg === null) respond(500, ['error' => 'io']);
    return $cfg;
}

/* ---------- Rate limiting (same scheme as sync.php) ---------- */

function rateLimit(string $rateDir, int $now): void {
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rateFile = $rateDir . '/' . hash('sha256', $clientIp) . '.json';

    $fp = fopen($rateFile, 'c+');
    if ($fp) {
        if (flock($fp, LOCK_EX)) {
            $raw = stream_get_contents($fp);
            $data = $raw ? json_decode($raw, true) : null;
            $window = is_array($data) ? (int)($data['window'] ?? 0) : 0;
            $count = is_array($data) ? (int)($data['count'] ?? 0) : 0;

            if ($window <= 0 || ($now - $window) >= 60) {
                $window = $now;
                $count = 1;
            } else {
                $count++;
            }

            if ($count > 120) {
                flock($fp, LOCK_UN);
                fclose($fp);
                respond(429, ['error' => 'rate limited']);
            }

            fseek($fp, 0);
            ftruncate($fp, 0);
            fwrite($fp, json_encode(['count' => $count, 'window' => $window]));
            fflush($fp);
            flock($fp, LOCK_UN);
        }
        fclose($fp);
    }

    if (mt_rand(1, 100) === 1) {
        foreach (glob($rateDir . '/*.json') ?: [] as $rf) {
            $mt = @filemtime($rf);
            if ($mt !== false && $mt < $now - 3600) @unlink($rf);
        }
    }
}

/* ---------- Channel storage ---------- */

function channelFile(string $chDir, string $id): string {
    return $chDir . '/' . $id . '.php';
}

function decodeChannel(string $raw): ?array {
    if (!str_starts_with($raw, FILE_GUARD)) return null;
    $ch = json_decode(substr($raw, strlen(FILE_GUARD)), true);
    if (!is_array($ch) || !is_string($ch['token'] ?? null)) return null;
    $ch['created'] = (int)($ch['created'] ?? 0);
    $ch['updated'] = (int)($ch['updated'] ?? 0);
    $ch['cfg'] = is_string($ch['cfg'] ?? null) ? $ch['cfg'] : '';
    $ch['cfgTs'] = (int)($ch['cfgTs'] ?? 0);
    $ch['subs'] = is_array($ch['subs'] ?? null) ? $ch['subs'] : [];
    $ch['entries'] = is_array($ch['entries'] ?? null) ? array_values($ch['entries']) : [];
    $ch['sent'] = is_array($ch['sent'] ?? null) ? $ch['sent'] : [];
    $ch['lastTest'] = (int)($ch['lastTest'] ?? 0);
    return $ch;
}

function entryDueAt(array $e): int {
    return max((int)$e['t'], (int)($e['n'] ?? 0));
}

/**
 * The file's mtime doubles as the "needs attention at" index for the cron run,
 * so a run only has to stat the channel files instead of reading all of them.
 */
function nextAttention(array $ch): int {
    if (!$ch['entries']) return $ch['updated'] + CHANNEL_TTL;
    $next = PHP_INT_MAX;
    foreach ($ch['entries'] as $e) $next = min($next, entryDueAt($e));
    return max(1, $next);
}

/**
 * Runs $fn on the channel under an exclusive lock.
 * $fn receives the channel (or null if there is none) and returns
 * [result, next] where next is: array = write, false = delete, null = leave as is.
 */
function withChannel(string $file, bool $create, callable $fn): mixed {
    for ($try = 0; $try < 3; $try++) {
        $fp = @fopen($file, $create ? 'c+' : 'r+');
        if (!$fp) {
            if (!$create && !file_exists($file)) return $fn(null)[0];
            respond(500, ['error' => 'io']);
        }
        if (!flock($fp, LOCK_EX)) {
            fclose($fp);
            respond(500, ['error' => 'io']);
        }
        // The file may have been deleted while we waited for the lock.
        $stat = fstat($fp);
        if (is_array($stat) && ($stat['nlink'] ?? 1) === 0) {
            flock($fp, LOCK_UN);
            fclose($fp);
            continue;
        }

        $raw = (string)stream_get_contents($fp);
        [$result, $next] = $fn(decodeChannel($raw));

        if (is_array($next)) {
            ksort($next);
            fseek($fp, 0);
            ftruncate($fp, 0);
            fwrite($fp, FILE_GUARD . json_encode($next, JSON_UNESCAPED_SLASHES));
            fflush($fp);
            touch($file, nextAttention($next));
        } elseif ($next === false || $raw === '') {
            @unlink($file);
        }
        flock($fp, LOCK_UN);
        fclose($fp);
        return $result;
    }
    respond(500, ['error' => 'io']);
}

function isStorageAvailable(string $chDir): bool {
    $files = glob($chDir . '/*.php') ?: [];
    if (count($files) >= MAX_FILES) return false;
    $total = 0;
    foreach ($files as $f) {
        $sz = @filesize($f);
        if ($sz !== false) $total += (int)$sz;
    }
    return $total < MAX_BYTES;
}

function tokenMatches(array $ch, string $token): bool {
    return $token !== '' && hash_equals($ch['token'], hash('sha256', $token));
}

/* ---------- Input validation ---------- */

function isAllowedEndpoint(mixed $url, array $allowedHosts): bool {
    if (!is_string($url) || strlen($url) > 1024) return false;
    if (!preg_match('#^https://[\x21-\x7e]+$#', $url) || preg_match('/[<>"\'\\\\`{}|^]/', $url)) return false;
    $p = parse_url($url);
    if (!is_array($p) || ($p['scheme'] ?? '') !== 'https' || empty($p['host'])) return false;
    if (isset($p['user']) || isset($p['pass']) || isset($p['fragment'])) return false;
    if (isset($p['port']) && (int)$p['port'] !== 443) return false;
    $host = strtolower($p['host']);
    foreach ($allowedHosts as $allowed) {
        if (!is_string($allowed) || $allowed === '') continue;
        $allowed = strtolower($allowed);
        if ($allowed[0] === '.' ? str_ends_with($host, $allowed) : $host === $allowed) return true;
    }
    return false;
}

function parseSubscription(mixed $sub, array $allowedHosts): ?array {
    if (!is_array($sub) || !isAllowedEndpoint($sub['endpoint'] ?? null, $allowedHosts)) return null;
    $p256dh = is_string($sub['p256dh'] ?? null) ? b64uDecode($sub['p256dh']) : null;
    $auth = is_string($sub['auth'] ?? null) ? b64uDecode($sub['auth']) : null;
    if ($p256dh === null || strlen($p256dh) !== 65 || $p256dh[0] !== "\x04") return null;
    if ($auth === null || strlen($auth) !== 16) return null;
    return ['endpoint' => $sub['endpoint'], 'p256dh' => b64uEncode($p256dh), 'auth' => b64uEncode($auth)];
}

function parseMute(mixed $mute): array {
    if (!is_array($mute)) return [];
    $out = [];
    foreach ($mute as $tag) {
        if (is_string($tag) && preg_match('/^[a-f0-9]{8}$/', $tag)) $out[$tag] = true;
        if (count($out) >= MAX_MUTE) break;
    }
    return array_keys($out);
}

function parseEntries(mixed $entries, int $now): ?array {
    if (!is_array($entries) || count($entries) > MAX_ENTRIES) return null;
    $out = [];
    foreach ($entries as $e) {
        if (!is_array($e)) return null;
        $i = $e['i'] ?? null;
        $t = $e['t'] ?? null;
        $k = $e['k'] ?? null;
        if (!is_string($i) || !preg_match('/^[a-f0-9]{16}$/', $i)) return null;
        if (!is_int($t) || $t < $now - MAX_LATE || $t > $now + MAX_HORIZON) return null;
        if (!in_array($k, ['r', 'd', 'x'], true)) return null;
        if (!isBase64($e['c'] ?? null, MAX_CIPHERTEXT)) return null;
        $entry = ['i' => $i, 't' => $t, 'k' => $k, 'c' => $e['c']];
        if (isset($e['g'])) {
            if (!is_string($e['g']) || !preg_match('/^[a-f0-9]{8}$/', $e['g'])) return null;
            $entry['g'] = $e['g'];
        }
        $out[$i] = $entry;
    }
    return array_values($out);
}

function subId(string $endpoint): string {
    return substr(hash('sha256', $endpoint), 0, 32);
}

/* ---------- Web Push (RFC 8030, RFC 8291, RFC 8292) ---------- */

function derSignatureToRaw(string $der): ?string {
    $len = strlen($der);
    if ($len < 8 || $der[0] !== "\x30") return null;
    $pos = 2;
    if (ord($der[1]) & 0x80) $pos += ord($der[1]) & 0x7f;
    $raw = '';
    for ($part = 0; $part < 2; $part++) {
        if ($pos + 2 > $len || $der[$pos] !== "\x02") return null;
        $l = ord($der[$pos + 1]);
        $int = ltrim(substr($der, $pos + 2, $l), "\0");
        if (strlen($int) > 32) return null;
        $raw .= str_pad($int, 32, "\0", STR_PAD_LEFT);
        $pos += 2 + $l;
    }
    return $raw;
}

/**
 * VAPID tokens are kept across runs. Push services expect them to be reused:
 * Apple asks not to issue a new one more often than once per hour.
 */
function jwtCacheId(array $config): string {
    return hash('sha256', $config['vapidPublic'] . '|' . $config['subject']);
}

function loadJwtCache(string $dataDir, array $config, int $now): array {
    $raw = (string)@file_get_contents($dataDir . '/jwt.php');
    $data = str_starts_with($raw, FILE_GUARD) ? json_decode(substr($raw, strlen(FILE_GUARD)), true) : null;
    $items = [];
    if (is_array($data) && ($data['id'] ?? '') === jwtCacheId($config) && is_array($data['items'] ?? null)) {
        foreach ($data['items'] as $aud => $item) {
            // Only reuse tokens that stay valid for at least another hour.
            if (is_string($aud) && is_array($item) && is_string($item['auth'] ?? null) && (int)($item['exp'] ?? 0) - $now > 3600) {
                $items[$aud] = ['auth' => $item['auth'], 'exp' => (int)$item['exp']];
            }
        }
    }
    return ['items' => $items, 'dirty' => false];
}

function saveJwtCache(string $dataDir, array $config, array $cache): void {
    if (!$cache['dirty']) return;
    $file = $dataDir . '/jwt.php';
    @file_put_contents($file, FILE_GUARD . json_encode(['id' => jwtCacheId($config), 'items' => $cache['items']], JSON_UNESCAPED_SLASHES), LOCK_EX);
    @chmod($file, 0600);
}

function vapidAuthorization(array $config, string $endpoint, array &$cache, int $now): ?string {
    $p = parse_url($endpoint);
    $aud = $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
    if (!isset($cache['items'][$aud])) {
        $header = b64uEncode('{"typ":"JWT","alg":"ES256"}');
        $claims = b64uEncode(json_encode(
            ['aud' => $aud, 'exp' => $now + 43200, 'sub' => $config['subject']],
            JSON_UNESCAPED_SLASHES
        ));
        $der = '';
        if (!openssl_sign($header . '.' . $claims, $der, $config['vapidPrivate'], OPENSSL_ALGO_SHA256)) return null;
        $sig = derSignatureToRaw($der);
        if ($sig === null) return null;
        $cache['items'][$aud] = [
            'auth' => 'vapid t=' . $header . '.' . $claims . '.' . b64uEncode($sig) . ', k=' . $config['vapidPublic'],
            'exp' => $now + 43200,
        ];
        $cache['dirty'] = true;
    }
    return $cache['items'][$aud]['auth'];
}

/** Encrypts a message for one subscription (aes128gcm content coding). */
function encryptForSubscription(string $plain, string $uaPublic, string $authSecret): ?string {
    if (strlen($plain) > 3900) return null;
    $local = generateEcKey();
    if ($local === null) return null;
    // SubjectPublicKeyInfo header for an uncompressed P-256 point.
    $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $uaPublic;
    $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
    $peer = openssl_pkey_get_public($pem);
    if (!$peer) return null;
    $shared = openssl_pkey_derive($peer, $local['key'], 32);
    if ($shared === false || $shared === '') return null;
    $shared = str_pad($shared, 32, "\0", STR_PAD_LEFT);

    $ikm = hash_hkdf('sha256', $shared, 32, "WebPush: info\0" . $uaPublic . $local['public'], $authSecret);
    $salt = random_bytes(16);
    $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
    $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);
    $tag = '';
    $cipher = openssl_encrypt($plain . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
    if ($cipher === false) return null;
    return $salt . pack('N', 4096) . chr(65) . $local['public'] . $cipher . $tag;
}

/**
 * Sends one message. Returns the HTTP status of the push service,
 * 0 for a network error, or -1 if the subscription itself is unusable.
 */
function sendPush(array $config, array $sub, string $message, string $kind, $curl, array &$jwtCache, int $now): int {
    $p256dh = b64uDecode((string)($sub['p256dh'] ?? ''));
    $auth = b64uDecode((string)($sub['auth'] ?? ''));
    $endpoint = $sub['endpoint'] ?? null;
    if ($p256dh === null || $auth === null || !isAllowedEndpoint($endpoint, $config['allowedHosts'])) return -1;
    $body = encryptForSubscription($message, $p256dh, $auth);
    if ($body === null) return -1;
    $authorization = vapidAuthorization($config, $endpoint, $jwtCache, $now);
    if ($authorization === null) return 0;

    $headers = [
        'Content-Type: application/octet-stream',
        'Content-Encoding: aes128gcm',
        'TTL: ' . ($kind === 'd' ? 43200 : 86400),
        'Authorization: ' . $authorization,
    ];
    // Reminders should wake the device. The summary uses the default urgency.
    if ($kind !== 'd') $headers[] = 'Urgency: high';

    curl_reset($curl);
    curl_setopt_array($curl, [
        CURLOPT_URL => $endpoint,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 8,
    ]);
    if (curl_exec($curl) === false) return 0;
    return (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
}

function pushMessage(string $channelId, array $entry): string {
    return json_encode(
        ['v' => 1, 'ch' => substr($channelId, 0, 8), 'i' => $entry['i'], 'k' => $entry['k'], 'c' => $entry['c']],
        JSON_UNESCAPED_SLASHES
    );
}

/* ---------- Cron run ---------- */

function processChannel(string $file, array $config, $curl, array &$jwtCache, float $deadline, array &$stats): void {
    $now = time();
    $channelId = basename($file, '.php');

    // Phase 1: tidy up and take a snapshot, without holding the lock while sending.
    $snapshot = withChannel($file, false, function (?array $ch) use ($now) {
        if ($ch === null) return [null, false];
        $ch['entries'] = array_values(array_filter($ch['entries'], fn($e) => (int)$e['t'] >= $now - MAX_LATE));
        $ch['sent'] = array_filter($ch['sent'], fn($t) => (int)$t >= $now - SENT_MEMORY);
        if (!$ch['entries'] && $ch['updated'] < $now - CHANNEL_TTL) return [null, false];
        return [$ch, $ch];
    });
    if ($snapshot === null) return;

    $due = array_values(array_filter($snapshot['entries'], fn($e) => entryDueAt($e) <= $now));
    if (!$due) return;
    usort($due, fn($a, $b) => $a['t'] <=> $b['t']);
    if (count($due) > MAX_PER_RUN) {
        $due = array_slice($due, 0, MAX_PER_RUN);
        $stats['deferred'] = true;
    }
    $stats['channels']++;

    $delivered = [];   // entry id => sub ids that are done with this entry
    $outcome = [];     // entry id => 'done' | 'retry' | 'defer'
    $gone = [];        // sub ids to remove
    foreach ($due as $e) {
        $state = 'done';
        foreach ($snapshot['subs'] as $sid => $sub) {
            $sid = (string)$sid;
            if (isset($gone[$sid]) || in_array($sid, $e['s'] ?? [], true)) continue;
            if (isset($e['g']) && in_array($e['g'], $sub['mute'] ?? [], true)) continue;
            if (microtime(true) > $deadline) { $state = 'defer'; break; }

            $status = sendPush($config, $sub, pushMessage($channelId, $e), $e['k'], $curl, $jwtCache, $now);
            if ($status >= 200 && $status < 300) {
                $delivered[$e['i']][] = $sid;
                $stats['sent']++;
            } elseif ($status === 404 || $status === 410 || $status === -1) {
                $gone[$sid] = true;
                $stats['gone']++;
            } elseif ($status === 413) {
                $delivered[$e['i']][] = $sid;
                $stats['failed']++;
            } else {
                $state = 'retry';
                $stats['failed']++;
            }
        }
        $outcome[$e['i'] . ':' . $e['t']] = $state;
        if ($state === 'defer') { $stats['deferred'] = true; break; }
    }

    // Phase 2: record the results. The schedule may have been replaced meanwhile.
    withChannel($file, false, function (?array $ch) use ($now, $delivered, $outcome, $gone) {
        if ($ch === null) return [null, null];
        foreach (array_keys($gone) as $sid) unset($ch['subs'][$sid]);
        if (!$ch['subs']) return [null, false];

        $entries = [];
        foreach ($ch['entries'] as $e) {
            $state = $outcome[$e['i'] . ':' . $e['t']] ?? null;
            if ($state === null) { $entries[] = $e; continue; }
            if (isset($delivered[$e['i']])) {
                $e['s'] = array_values(array_unique(array_merge($e['s'] ?? [], $delivered[$e['i']])));
            }
            if ($state === 'retry') {
                $e['a'] = (int)($e['a'] ?? 0) + 1;
                if ($e['a'] >= MAX_ATTEMPTS) { $ch['sent'][$e['i']] = $now; continue; }
                $e['n'] = $now + 60 * $e['a'];
            } elseif ($state === 'done') {
                $ch['sent'][$e['i']] = $now;
                continue;
            }
            $entries[] = $e;
        }
        $ch['entries'] = $entries;
        return [null, $ch];
    });
}

function runDue(string $dataDir, string $chDir, array $config): void {
    $lock = fopen($dataDir . '/run.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) respond(200, ['ok' => true, 'busy' => true]);
    ignore_user_abort(true);
    @set_time_limit(60);

    $started = time();
    $deadline = microtime(true) + RUN_BUDGET;
    clearstatcache();
    $due = [];
    foreach (glob($chDir . '/*.php') ?: [] as $file) {
        $mt = @filemtime($file);
        if ($mt !== false && $mt <= $started) $due[$file] = $mt;
    }
    asort($due);

    $stats = ['channels' => 0, 'sent' => 0, 'failed' => 0, 'gone' => 0, 'deferred' => false];
    $curl = curl_init();
    $jwtCache = loadJwtCache($dataDir, $config, $started);
    foreach (array_keys($due) as $file) {
        if (microtime(true) > $deadline) { $stats['deferred'] = true; break; }
        processChannel($file, $config, $curl, $jwtCache, $deadline, $stats);
    }
    curl_close($curl);
    saveJwtCache($dataDir, $config, $jwtCache);

    @file_put_contents($dataDir . '/state.json', json_encode(['lastRun' => $started] + $stats), LOCK_EX);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['ok' => true] + $stats);
}

/* ---------- Request handling ---------- */

// Lets a setup script reuse the functions above without handling a request.
if (defined('PUSH_PHP_LIBRARY')) return;

$dataDir = __DIR__ . '/push_data';
$chDir = $dataDir . '/ch';
$rateDir = $dataDir . '/rate';
ensureDir($dataDir);
ensureDir($chDir);
ensureDir($rateDir);
if (!file_exists($dataDir . '/.htaccess')) {
    @file_put_contents($dataDir . '/.htaccess', "Require all denied\n");
}

$now = time();
$isCli = PHP_SAPI === 'cli';
if (!$isCli) rateLimit($rateDir, $now);
$config = loadConfig($dataDir);

if ($isCli) {
    if (($argv[1] ?? '') !== 'cron') respond(400, ['error' => 'usage: php push.php cron']);
    runDue($dataDir, $chDir, $config);
}

$cronKey = $_SERVER['HTTP_X_CRON_KEY'] ?? $_GET['cron'] ?? null;
if ($cronKey !== null) {
    if (!is_string($cronKey) || !hash_equals($config['cronKey'], $cronKey)) respond(403, ['error' => 'unauthorized']);
    runDue($dataDir, $chDir, $config);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['error' => 'method not allowed']);

$rawInput = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($rawInput === false) respond(400, ['error' => 'invalid request']);
if (strlen($rawInput) > MAX_BODY) respond(413, ['error' => 'payload too large']);

$input = json_decode($rawInput, true);
if (!is_array($input)) respond(400, ['error' => 'invalid json']);
if (!isset($input['op']) || !is_string($input['op'])) respond(400, ['error' => 'missing op']);
$op = $input['op'];

if ($op === 'info') {
    $state = json_decode((string)@file_get_contents($dataDir . '/state.json'), true);
    $lastRun = is_array($state) ? (int)($state['lastRun'] ?? 0) : 0;
    respond(200, [
        'ok' => true,
        'key' => $config['vapidPublic'],
        // Lets the app warn when nothing triggers the sender.
        'cronOk' => $lastRun > 0 && $now - $lastRun < 600,
    ]);
}

if (!isset($input['id'], $input['token']) || !is_string($input['id']) || !is_string($input['token'])) {
    respond(400, ['error' => 'missing id or token']);
}
$id = sanitizeHex($input['id']);
$token = sanitizeHex($input['token']);
if (strlen($id) !== 64 || strlen($token) !== 64) respond(400, ['error' => 'invalid id or token']);
$file = channelFile($chDir, $id);

switch ($op) {
    case 'status': {
        $result = withChannel($file, false, function (?array $ch) use ($token) {
            if ($ch === null) return [['ok' => true, 'exists' => false], null];
            if (!tokenMatches($ch, $token)) return [403, null];
            return [['ok' => true, 'exists' => true, 'subs' => count($ch['subs']), 'cfg' => $ch['cfg']], null];
        });
        if ($result === 403) respond(403, ['error' => 'unauthorized']);
        respond(200, $result);
    }

    case 'subscribe': {
        $sub = parseSubscription($input['sub'] ?? null, $config['allowedHosts']);
        if ($sub === null) respond(400, ['error' => 'invalid subscription']);
        $sub['mute'] = parseMute($input['mute'] ?? null);
        $replaces = is_string($input['replaces'] ?? null) ? subId($input['replaces']) : null;

        if (!file_exists($file) && !isStorageAvailable($chDir)) respond(507, ['error' => 'storage full']);

        $result = withChannel($file, true, function (?array $ch) use ($token, $sub, $replaces, $now) {
            if ($ch === null) {
                $ch = [
                    'token' => hash('sha256', $token), 'created' => $now, 'updated' => $now,
                    'cfg' => '', 'cfgTs' => 0, 'subs' => [], 'entries' => [], 'sent' => [], 'lastTest' => 0,
                ];
            } elseif (!tokenMatches($ch, $token)) {
                return [403, null];
            }
            if ($replaces !== null) unset($ch['subs'][$replaces]);
            $sid = subId($sub['endpoint']);
            $sub['added'] = (int)($ch['subs'][$sid]['added'] ?? $now);
            $ch['subs'][$sid] = $sub;
            if (count($ch['subs']) > MAX_SUBS) {
                uasort($ch['subs'], fn($a, $b) => (int)($b['added'] ?? 0) <=> (int)($a['added'] ?? 0));
                $ch['subs'] = array_slice($ch['subs'], 0, MAX_SUBS, true);
            }
            return [['ok' => true, 'subs' => count($ch['subs']), 'cfg' => $ch['cfg']], $ch];
        });
        if ($result === 403) respond(403, ['error' => 'unauthorized']);
        respond(200, $result);
    }

    case 'unsubscribe': {
        $endpoint = $input['endpoint'] ?? null;
        if (!is_string($endpoint) || $endpoint === '') respond(400, ['error' => 'invalid endpoint']);
        $result = withChannel($file, false, function (?array $ch) use ($token, $endpoint) {
            if ($ch === null) return [['ok' => true], null];
            if (!tokenMatches($ch, $token)) return [403, null];
            unset($ch['subs'][subId($endpoint)]);
            // Nobody left to notify: drop the schedule as well.
            return [['ok' => true, 'subs' => count($ch['subs'])], $ch['subs'] ? $ch : false];
        });
        if ($result === 403) respond(403, ['error' => 'unauthorized']);
        respond(200, $result);
    }

    case 'schedule': {
        $entries = parseEntries($input['entries'] ?? null, $now);
        if ($entries === null) respond(400, ['error' => 'invalid entries']);
        // Shared reminder settings travel with the schedule. cfgTs is their change time;
        // a schedule built from older settings is rejected so the client can catch up first.
        $cfg = null;
        $cfgTs = 0;
        if (isset($input['cfg'])) {
            $cfgTs = $input['cfgTs'] ?? null;
            if (!isBase64($input['cfg'], MAX_CFG) || !is_int($cfgTs) || $cfgTs < 0) respond(400, ['error' => 'invalid cfg']);
            $cfg = $input['cfg'];
        }

        $result = withChannel($file, false, function (?array $ch) use ($token, $entries, $cfg, $cfgTs, $now) {
            if ($ch === null) return [404, null];
            if (!tokenMatches($ch, $token)) return [403, null];
            if ($cfg !== null && $cfgTs < $ch['cfgTs']) {
                return [['ok' => false, 'conflict' => true, 'cfg' => $ch['cfg'], 'cfgTs' => $ch['cfgTs']], null];
            }

            $previous = [];
            foreach ($ch['entries'] as $e) $previous[$e['i']] = $e;
            $next = [];
            foreach ($entries as $e) {
                if (isset($ch['sent'][$e['i']])) continue;            // already delivered
                if (isset($previous[$e['i']])) {                       // keep delivery progress
                    foreach (['s', 'a', 'n'] as $field) {
                        if (isset($previous[$e['i']][$field])) $e[$field] = $previous[$e['i']][$field];
                    }
                }
                $next[$e['i']] = $e;
            }
            // A notification that is already due stays queued until it has been sent.
            foreach ($previous as $i => $e) {
                if (!isset($next[$i]) && (int)$e['t'] <= $now) $next[$i] = $e;
            }
            $next = array_values($next);
            usort($next, fn($a, $b) => $a['t'] <=> $b['t']);
            $ch['entries'] = array_slice($next, 0, MAX_ENTRIES);
            $ch['updated'] = $now;
            if ($cfg !== null) {
                $ch['cfg'] = $cfg;
                $ch['cfgTs'] = $cfgTs;
            }
            return [['ok' => true, 'subs' => count($ch['subs']), 'count' => count($ch['entries'])], $ch];
        });
        if ($result === 404) respond(404, ['error' => 'unknown channel']);
        if ($result === 403) respond(403, ['error' => 'unauthorized']);
        respond(200, $result);
    }

    case 'test': {
        $endpoint = $input['endpoint'] ?? null;
        $entryId = $input['i'] ?? null;
        if (!is_string($endpoint) || !isBase64($input['c'] ?? null, MAX_CIPHERTEXT)
            || !is_string($entryId) || !preg_match('/^[a-f0-9]{16}$/', $entryId)) {
            respond(400, ['error' => 'invalid request']);
        }
        $c = $input['c'];
        $sub = withChannel($file, false, function (?array $ch) use ($token, $endpoint, $now) {
            if ($ch === null) return [404, null];
            if (!tokenMatches($ch, $token)) return [403, null];
            if ($now - $ch['lastTest'] < TEST_INTERVAL) return [429, null];
            $sub = $ch['subs'][subId($endpoint)] ?? null;
            if ($sub === null) return [404, null];
            $ch['lastTest'] = $now;
            return [$sub, $ch];
        });
        if ($sub === 404) respond(404, ['error' => 'unknown subscription']);
        if ($sub === 403) respond(403, ['error' => 'unauthorized']);
        if ($sub === 429) respond(429, ['error' => 'rate limited']);

        $curl = curl_init();
        $jwtCache = loadJwtCache($dataDir, $config, $now);
        $entry = ['i' => $entryId, 'k' => 'r', 'c' => $c];
        $status = sendPush($config, $sub, pushMessage($id, $entry), 'r', $curl, $jwtCache, $now);
        curl_close($curl);
        saveJwtCache($dataDir, $config, $jwtCache);
        respond(200, ['ok' => $status >= 200 && $status < 300, 'status' => $status]);
    }

    case 'delete': {
        $result = withChannel($file, false, function (?array $ch) use ($token) {
            if ($ch === null) return [['ok' => true], null];
            if (!tokenMatches($ch, $token)) return [403, null];
            return [['ok' => true], false];
        });
        if ($result === 403) respond(403, ['error' => 'unauthorized']);
        respond(200, $result);
    }

    default:
        respond(400, ['error' => 'unknown op']);
}
