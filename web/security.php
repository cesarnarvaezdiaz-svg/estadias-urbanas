<?php
function security_send_common_headers(): void {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(self)');
    header('Cross-Origin-Resource-Policy: same-origin');
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://www.estadiasurbanas.com https://api.mercadopago.com; frame-src 'self' https://www.mercadopago.com https://*.mercadopago.com; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; upgrade-insecure-requests");

    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

function security_allowed_origin(?string $origin): bool {
    if (!$origin) return true;

    $host = strtolower((string)parse_url($origin, PHP_URL_HOST));
    $currentHost = strtolower($_SERVER['HTTP_HOST'] ?? '');
    $currentHost = preg_replace('/:\d+$/', '', $currentHost);

    $allowedHosts = array_filter([
        $currentHost,
        'estadiasurbanas.com',
        'www.estadiasurbanas.com',
        '127.0.0.1',
        'localhost',
    ]);

    return in_array($host, $allowedHosts, true);
}

function security_send_cors_headers(string $methods = 'POST, OPTIONS'): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        if (!security_allowed_origin($origin)) {
            http_response_code(403);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['status' => 'error', 'message' => 'Origen no permitido.']);
            exit;
        }

        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    header('Access-Control-Allow-Methods: ' . $methods);
}

function security_limit_request_size(int $maxBytes = 1048576): void {
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > $maxBytes) {
        http_response_code(413);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['status' => 'error', 'message' => 'Solicitud demasiado grande.']);
        exit;
    }
}

function security_rate_limit(string $bucket, int $maxRequests = 30, int $windowSeconds = 60): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = preg_replace('/[^a-zA-Z0-9_.-]/', '_', $bucket . '_' . hash('sha256', $ip));
    $file = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'estadias_rate_' . $key . '.json';
    $now = time();

    $state = ['start' => $now, 'count' => 0];
    if (is_readable($file)) {
        $decoded = json_decode((string)file_get_contents($file), true);
        if (is_array($decoded)) $state = array_merge($state, $decoded);
    }

    if (($now - (int)$state['start']) >= $windowSeconds) {
        $state = ['start' => $now, 'count' => 0];
    }

    $state['count'] = (int)$state['count'] + 1;
    @file_put_contents($file, json_encode($state), LOCK_EX);

    if ($state['count'] > $maxRequests) {
        http_response_code(429);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['status' => 'error', 'message' => 'Demasiados intentos. Intenta nuevamente en unos minutos.']);
        exit;
    }
}

function security_start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;

    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();

    $now = time();
    $maxIdle = 1800;
    if (!empty($_SESSION['last_seen']) && ($now - (int)$_SESSION['last_seen']) > $maxIdle) {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
        }
        session_destroy();
        session_start();
    }
    $_SESSION['last_seen'] = $now;
}

function security_no_store(): void {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
}

function security_json_error(string $message, int $statusCode = 400): void {
    http_response_code($statusCode);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

function security_require_json_content_type(): void {
    $contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $contentType !== '' && strpos($contentType, 'application/json') === false) {
        security_json_error('Content-Type no permitido.', 415);
    }
}

function security_password_policy(?string $password): ?string {
    $password = (string)$password;
    if (strlen($password) < 10) return 'La contraseña debe tener al menos 10 caracteres.';
    if (!preg_match('/[A-Z]/', $password)) return 'Agrega al menos una mayuscula.';
    if (!preg_match('/[a-z]/', $password)) return 'Agrega al menos una minuscula.';
    if (!preg_match('/[0-9]/', $password)) return 'Agrega al menos un número.';
    if (!preg_match('/[^A-Za-z0-9]/', $password)) return 'Agrega al menos un símbolo.';
    return null;
}

function security_csrf_token(): string {
    security_start_session();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function security_verify_csrf(?string $token): void {
    security_start_session();
    $expected = $_SESSION['csrf_token'] ?? '';
    if (!$expected || !$token || !hash_equals($expected, (string)$token)) {
        http_response_code(403);
        exit('Solicitud no autorizada.');
    }
}

function security_bootstrap_json_api(string $bucket, int $maxRequests = 30): void {
    security_send_common_headers();
    header('Content-Type: application/json; charset=utf-8');
    security_send_cors_headers();

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Metodo no permitido.']);
        exit;
    }

    security_limit_request_size();
    security_require_json_content_type();
    security_rate_limit($bucket, $maxRequests);
}

function security_bootstrap_admin(): void {
    security_send_common_headers();
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');

    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}
?>
