<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function ensureDir(string $dir): void {
    if (is_dir($dir)) return;
    if (!mkdir($dir, 0755, true) && !is_dir($dir)) {
        respond(500, ['error' => 'storage unavailable']);
    }
}

function sanitizeHex(string $s): string {
    return preg_replace('/[^a-f0-9]/', '', strtolower($s));
}

function readDataLocked(string $file): ?array {
    if (!file_exists($file)) {
        return [
            'version' => 0,
            'encrypted' => '',
            'updated' => 0,
            'deleteToken' => '',
            'writeToken' => '',
        ];
    }

    $fp = fopen($file, 'rb');
    if (!$fp) return null;

    if (!flock($fp, LOCK_SH)) {
        fclose($fp);
        return null;
    }

    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    if ($raw === false || $raw === '') {
        return [
            'version' => 0,
            'encrypted' => '',
            'updated' => 0,
            'deleteToken' => '',
            'writeToken' => '',
        ];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) return null;

    return [
        'version' => (int)($data['version'] ?? 0),
        'encrypted' => is_string($data['encrypted'] ?? null) ? (string)$data['encrypted'] : '',
        'updated' => (int)($data['updated'] ?? 0),
        'deleteToken' => is_string($data['deleteToken'] ?? null) ? (string)$data['deleteToken'] : '',
        'writeToken' => is_string($data['writeToken'] ?? null) ? (string)$data['writeToken'] : '',
    ];
}

function listDataFiles(string $dataDir): array {
    $files = glob($dataDir . '/*.json');
    if (!is_array($files)) return [];
    return $files;
}

function isStorageAvailable(string $dataDir, int $maxFiles, int $maxBytes): bool {
    $files = listDataFiles($dataDir);
    $count = count($files);
    $total = 0;
    foreach ($files as $f) {
        $sz = @filesize($f);
        if ($sz !== false) $total += (int)$sz;
    }
    return $count < $maxFiles && $total < $maxBytes;
}

$dataDir = __DIR__ . '/sync_data';
ensureDir($dataDir);

$rateDir = $dataDir . '/rate';
ensureDir($rateDir);

$rawInput = file_get_contents('php://input');
if ($rawInput === false) {
    respond(400, ['error' => 'invalid request']);
}

$input = json_decode($rawInput, true);
if (!is_array($input)) {
    respond(400, ['error' => 'invalid json']);
}

if (!isset($input['op'], $input['id']) || !is_string($input['op']) || !is_string($input['id'])) {
    respond(400, ['error' => 'missing op or id']);
}

$op = $input['op'];

$id = sanitizeHex($input['id']);
if (strlen($id) !== 64 && strlen($id) !== 32) {
    respond(400, ['error' => 'invalid id']);
}

$file = $dataDir . '/' . $id . '.json';

$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = $rateDir . '/' . md5($clientIp) . '.json';
$now = time();

$rateFp = fopen($rateFile, 'c+');
if ($rateFp) {
    if (flock($rateFp, LOCK_EX)) {
        fseek($rateFp, 0);
        $rateRaw = stream_get_contents($rateFp);
        $rateData = $rateRaw ? json_decode($rateRaw, true) : null;

        $window = is_array($rateData) ? (int)($rateData['window'] ?? 0) : 0;
        $count = is_array($rateData) ? (int)($rateData['count'] ?? 0) : 0;

        if ($window <= 0 || ($now - $window) >= 60) {
            $window = $now;
            $count = 1;
        } else {
            $count++;
        }

        if ($count > 120 && ($now - $window) < 60) {
            flock($rateFp, LOCK_UN);
            fclose($rateFp);
            respond(429, ['error' => 'rate limited']);
        }

        fseek($rateFp, 0);
        ftruncate($rateFp, 0);
        fwrite($rateFp, json_encode(['count' => $count, 'window' => $window], JSON_UNESCAPED_SLASHES));
        fflush($rateFp);

        flock($rateFp, LOCK_UN);
    }
    fclose($rateFp);
}

if (mt_rand(1, 100) === 1) {
    // Clean up stale rate files
    foreach (glob($rateDir . '/*.json') as $rf) {
        $mt = @filemtime($rf);
        if ($mt !== false && $mt < $now - 3600) @unlink($rf);
    }
}

if (mt_rand(1, 200) === 1) {
    foreach (listDataFiles($dataDir) as $df) {
        $mt = @filemtime($df);
        if ($mt !== false && $mt < $now - 7776000) @unlink($df);
    }
}

$MAX_PAYLOAD = 512 * 1024;
$MAX_FILES = 20000;
$MAX_BYTES = 500 * 1024 * 1024;

switch ($op) {
    case 'push': {
        $clientVersion = isset($input['version']) ? (int)$input['version'] : 0;

        $encrypted = $input['encrypted'] ?? '';
        if (!is_string($encrypted)) {
            respond(400, ['error' => 'invalid encrypted']);
        }
        if (strlen($encrypted) > $MAX_PAYLOAD) {
            respond(413, ['error' => 'payload too large']);
        }

        $incomingDeleteToken = '';
        if (isset($input['deleteToken'])) {
            if (!is_string($input['deleteToken'])) respond(400, ['error' => 'invalid deleteToken']);
            $dt = sanitizeHex($input['deleteToken']);
            if (strlen($dt) !== 64) respond(400, ['error' => 'invalid deleteToken']);
            $incomingDeleteToken = $dt;
        }

        $incomingWriteToken = '';
        if (isset($input['writeToken'])) {
            if (!is_string($input['writeToken'])) respond(400, ['error' => 'invalid writeToken']);
            $wt = sanitizeHex($input['writeToken']);
            if (strlen($wt) !== 64) respond(400, ['error' => 'invalid writeToken']);
            $incomingWriteToken = $wt;
        }

        if (!file_exists($file) && !isStorageAvailable($dataDir, $MAX_FILES, $MAX_BYTES)) {
            respond(507, ['error' => 'storage full']);
        }

        $fp = fopen($file, 'c+');
        if (!$fp) respond(500, ['error' => 'io']);
        if (!flock($fp, LOCK_EX)) {
            fclose($fp);
            respond(500, ['error' => 'io']);
        }

        fseek($fp, 0);
        $raw = stream_get_contents($fp);
        $current = $raw ? json_decode($raw, true) : null;
        if (!is_array($current)) $current = ['version' => 0];

        $serverVersion = (int)($current['version'] ?? 0);
        $currentEncrypted = is_string($current['encrypted'] ?? null) ? (string)$current['encrypted'] : '';
        $currentDeleteToken = is_string($current['deleteToken'] ?? null) ? (string)$current['deleteToken'] : '';
        $currentWriteToken = is_string($current['writeToken'] ?? null) ? (string)$current['writeToken'] : '';

        if ($clientVersion < $serverVersion) {
            flock($fp, LOCK_UN);
            fclose($fp);
            echo json_encode([
                'ok' => false,
                'conflict' => true,
                'version' => $serverVersion,
                'encrypted' => $currentEncrypted,
            ], JSON_UNESCAPED_SLASHES);
            exit;
        }

        if ($serverVersion > 0 || $currentEncrypted !== '') {
            if ($currentWriteToken === '' || $incomingWriteToken === '' || !hash_equals($currentWriteToken, $incomingWriteToken)) {
                flock($fp, LOCK_UN);
                fclose($fp);
                respond(403, ['error' => 'unauthorized']);
            }
        }

        $storedDeleteToken = $currentDeleteToken;
        if ($storedDeleteToken === '' && $incomingDeleteToken !== '') {
            $storedDeleteToken = $incomingDeleteToken;
        }

        $storedWriteToken = $currentWriteToken;
        if ($storedWriteToken === '' && $incomingWriteToken !== '') {
            $storedWriteToken = $incomingWriteToken;
        }

        $newVersion = $serverVersion + 1;
        $data = [
            'version' => $newVersion,
            'encrypted' => $encrypted,
            'updated' => $now,
            'deleteToken' => $storedDeleteToken,
            'writeToken' => $storedWriteToken,
        ];

        fseek($fp, 0);
        ftruncate($fp, 0);
        fwrite($fp, json_encode($data, JSON_UNESCAPED_SLASHES));
        fflush($fp);

        flock($fp, LOCK_UN);
        fclose($fp);

        echo json_encode(['ok' => true, 'version' => $newVersion], JSON_UNESCAPED_SLASHES);
        exit;
    }

    case 'pull': {
        $data = readDataLocked($file);
        if ($data === null) respond(500, ['error' => 'corrupt data']);
        echo json_encode([
            'ok' => true,
            'version' => (int)$data['version'],
            'encrypted' => (string)$data['encrypted'],
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    case 'poll': {
        $since = isset($input['since']) ? (int)$input['since'] : 0;
        $data = readDataLocked($file);
        if ($data === null) respond(500, ['error' => 'corrupt data']);

        $changed = ((int)$data['version'] > $since);
        echo json_encode([
            'ok' => true,
            'changed' => $changed,
            'version' => (int)$data['version'],
            'encrypted' => $changed ? (string)$data['encrypted'] : '',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    case 'delete': {
        if (!file_exists($file)) {
            echo json_encode(['ok' => true], JSON_UNESCAPED_SLASHES);
            exit;
        }

        $fp = fopen($file, 'c+');
        if (!$fp) respond(500, ['error' => 'io']);
        if (!flock($fp, LOCK_EX)) {
            fclose($fp);
            respond(500, ['error' => 'io']);
        }

        fseek($fp, 0);
        $raw = stream_get_contents($fp);
        $current = $raw ? json_decode($raw, true) : null;

        $token = '';
        if (isset($input['deleteToken']) && is_string($input['deleteToken'])) {
            $token = sanitizeHex($input['deleteToken']);
        }

        $stored = is_array($current) && is_string($current['deleteToken'] ?? null) ? (string)$current['deleteToken'] : '';
        if ($stored === '' || $token === '' || !hash_equals($stored, $token)) {
            flock($fp, LOCK_UN);
            fclose($fp);
            respond(403, ['error' => 'unauthorized']);
        }

        flock($fp, LOCK_UN);
        fclose($fp);

        if (!unlink($file)) {
            respond(500, ['error' => 'io']);
        }

        echo json_encode(['ok' => true], JSON_UNESCAPED_SLASHES);
        exit;
    }

    default:
        respond(400, ['error' => 'unknown op']);
}
