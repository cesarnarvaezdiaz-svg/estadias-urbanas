<?php
declare(strict_types=1);

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/db.php';

security_send_common_headers();
security_no_store();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

security_limit_request_size();
security_rate_limit('mobile_api', 120, 60);

function mobile_json_error(string $message, int $status = 400): void {
    http_response_code($status);
    echo json_encode(['status' => 'error', 'message' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function mobile_json_success(array $payload = []): void {
    echo json_encode(['status' => 'success'] + $payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function mobile_input(): array {
    $input = json_decode((string)file_get_contents('php://input'), true);
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !is_array($input)) {
        mobile_json_error('Solicitud invalida.', 400);
    }
    return is_array($input) ? $input : [];
}

function mobile_bootstrap_tokens(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS mobile_access_tokens (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        device_name VARCHAR(120) NULL,
        last_used_at DATETIME NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_mobile_token_user (user_id),
        KEY idx_mobile_token_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function mobile_issue_token(PDO $pdo, array $user, string $deviceName = ''): array {
    mobile_bootstrap_tokens($pdo);
    $rawToken = bin2hex(random_bytes(32));
    $hash = hash('sha256', $rawToken);
    $expires = gmdate('Y-m-d H:i:s', time() + 60 * 60 * 24 * 90);
    $stmt = $pdo->prepare("INSERT INTO mobile_access_tokens (user_id, token_hash, device_name, expires_at)
        VALUES (:user_id, :token_hash, :device_name, :expires_at)");
    $stmt->execute([
        ':user_id' => $user['id'],
        ':token_hash' => $hash,
        ':device_name' => substr(trim($deviceName), 0, 120) ?: null,
        ':expires_at' => $expires,
    ]);
    return ['token' => $rawToken, 'expires_at' => gmdate('c', strtotime($expires . ' UTC'))];
}

function mobile_bearer_token(): string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (!preg_match('/^Bearer\s+([A-Fa-f0-9]{64})$/', trim((string)$header), $matches)) return '';
    return strtolower($matches[1]);
}

function mobile_require_user(PDO $pdo): array {
    $token = mobile_bearer_token();
    if ($token === '') mobile_json_error('Sesion requerida.', 401);
    mobile_bootstrap_tokens($pdo);
    $stmt = $pdo->prepare("SELECT u.id, u.name, u.email, t.id AS token_id
        FROM mobile_access_tokens t
        INNER JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = :hash AND t.expires_at > UTC_TIMESTAMP()
        LIMIT 1");
    $stmt->execute([':hash' => hash('sha256', $token)]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) mobile_json_error('La sesion vencio. Inicia sesion nuevamente.', 401);
    $pdo->prepare('UPDATE mobile_access_tokens SET last_used_at = UTC_TIMESTAMP() WHERE id = :id')->execute([':id' => $user['token_id']]);
    unset($user['token_id']);
    return $user;
}

function mobile_user_payload(array $user): array {
    return [
        'id' => (int)$user['id'],
        'name' => (string)($user['name'] ?? 'Huésped'),
        'email' => (string)$user['email'],
    ];
}

function mobile_find_or_create_oauth_user(PDO $pdo, string $email, string $name): array {
    $email = strtolower(trim($email));
    $name = trim($name) ?: explode('@', $email)[0];
    $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user) return $user;
    $insert = $pdo->prepare("INSERT INTO users (name, email, password_hash, phone) VALUES (:name, :email, :password_hash, '')");
    $insert->execute([
        ':name' => $name,
        ':email' => $email,
        ':password_hash' => password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT),
    ]);
    return ['id' => (int)$pdo->lastInsertId(), 'name' => $name, 'email' => $email];
}

function mobile_http_post(string $url, array $fields): ?array {
    if (!function_exists('curl_init')) return null;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($fields),
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($body === false || $status < 200 || $status >= 300) return null;
    $decoded = json_decode((string)$body, true);
    return is_array($decoded) ? $decoded : null;
}

function mobile_http_get(string $url, string $accessToken): ?array {
    if (!function_exists('curl_init')) return null;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'Authorization: Bearer ' . $accessToken],
    ]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($body === false || $status < 200 || $status >= 300) return null;
    $decoded = json_decode((string)$body, true);
    return is_array($decoded) ? $decoded : null;
}

function mobile_http_get_json(string $url): ?array {
    if (!function_exists('curl_init')) return null;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($body === false || $status < 200 || $status >= 300) return null;
    $decoded = json_decode((string)$body, true);
    return is_array($decoded) ? $decoded : null;
}

function mobile_jwt_payload(string $jwt): array {
    $parts = explode('.', $jwt);
    if (count($parts) < 2) return [];
    $payload = strtr($parts[1], '-_', '+/');
    $payload .= str_repeat('=', (4 - strlen($payload) % 4) % 4);
    $decoded = json_decode((string)base64_decode($payload), true);
    return is_array($decoded) ? $decoded : [];
}
?>
