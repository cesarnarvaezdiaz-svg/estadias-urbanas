<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/oauth_config.php';
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

security_send_common_headers();
security_no_store();
security_start_session();
security_rate_limit('oauth_callback', 30, 300);

function oauth_redirect_error(string $code): void {
    header('Location: /index.html?auth_error=' . rawurlencode($code));
    exit;
}


function oauth_get_db_connection(): ?PDO {
    $host = oauth_env('DB_HOST', defined('DB_HOST') ? DB_HOST : 'localhost');
    $dbname = oauth_env('DB_NAME', defined('DB_NAME') ? DB_NAME : '');
    $username = oauth_env('DB_USER', defined('DB_USER') ? DB_USER : '');
    $password = oauth_env('DB_PASS', defined('DB_PASS') ? DB_PASS : '');

    if ($dbname === '' || $username === '' || $password === '' || $username === 'TU_USUARIO' || $password === 'TU_PASSWORD') {
        error_log('oauth_db_config_missing');
        return null;
    }

    try {
        return new PDO(
            "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (PDOException $e) {
        error_log('oauth_db_connection_error: ' . $e->getMessage());
        return null;
    }
}

function oauth_bootstrap_users_table(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        email VARCHAR(190) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(60) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    foreach ([
        "ALTER TABLE `users` ADD COLUMN phone VARCHAR(60) NOT NULL DEFAULT '' AFTER password_hash",
        "ALTER TABLE `users` ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER phone",
        "ALTER TABLE `users` ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
        "ALTER TABLE `users` ADD UNIQUE KEY uniq_users_email (email)",
    ] as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            // HostGator tables may already have this column/key.
        }
    }
}

function oauth_http_post(string $url, array $fields): ?array {
    if (!function_exists('curl_init')) return null;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($fields),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($body === false || $status < 200 || $status >= 300) return null;
    $json = json_decode($body, true);
    return is_array($json) ? $json : null;
}

function oauth_http_get_json(string $url, string $accessToken): ?array {
    if (!function_exists('curl_init')) return null;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Authorization: Bearer ' . $accessToken,
        ],
    ]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($body === false || $status < 200 || $status >= 300) return null;
    $json = json_decode($body, true);
    return is_array($json) ? $json : null;
}

function oauth_jwt_payload(string $jwt): array {
    $parts = explode('.', $jwt);
    if (count($parts) < 2) return [];
    $payload = strtr($parts[1], '-_', '+/');
    $payload .= str_repeat('=', (4 - strlen($payload) % 4) % 4);
    $decoded = json_decode(base64_decode($payload) ?: '', true);
    return is_array($decoded) ? $decoded : [];
}

$provider = strtolower(trim($_SESSION['oauth_provider'] ?? $_GET['provider'] ?? ''));
$expectedState = $_SESSION['oauth_state'] ?? '';
$state = $_POST['state'] ?? $_GET['state'] ?? '';
$code = $_POST['code'] ?? $_GET['code'] ?? '';

unset($_SESSION['oauth_provider'], $_SESSION['oauth_state']);

if ($expectedState === '' || !hash_equals($expectedState, (string)$state)) {
    oauth_redirect_error('oauth_state');
}

$config = oauth_provider_config($provider);
if (!$config || $config['client_id'] === '' || $config['client_secret'] === '' || $code === '') {
    oauth_redirect_error('oauth_config');
}

$token = oauth_http_post($config['token_url'], [
    'client_id' => $config['client_id'],
    'client_secret' => $config['client_secret'],
    'code' => $code,
    'grant_type' => 'authorization_code',
    'redirect_uri' => $config['redirect_uri'],
]);

if (!$token || empty($token['access_token']) && empty($token['id_token'])) {
    oauth_redirect_error('oauth_token');
}

$profile = [];
if ($provider === 'google') {
    $profile = oauth_http_get_json($config['userinfo_url'], $token['access_token'] ?? '') ?? [];
    if (($profile['email_verified'] ?? true) === false) oauth_redirect_error('oauth_email');
} elseif ($provider === 'facebook') {
    $profile = oauth_http_get_json($config['userinfo_url'], $token['access_token'] ?? '') ?? [];
} elseif ($provider === 'apple') {
    $profile = oauth_jwt_payload((string)($token['id_token'] ?? ''));
}

$email = filter_var($profile['email'] ?? '', FILTER_VALIDATE_EMAIL);
$name = trim((string)($profile['name'] ?? $profile['given_name'] ?? 'Huésped'));

if (!$email) {
    oauth_redirect_error('oauth_email');
}

if ($name === '') $name = explode('@', $email)[0];

$pdo = oauth_get_db_connection();
if (!$pdo) {
    oauth_redirect_error('oauth_db');
}

try {
    oauth_bootstrap_users_table($pdo);
    $usersTable = "`users`";
    $stmt = $pdo->prepare("SELECT id, name, email FROM $usersTable WHERE email = :email LIMIT 1");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $passwordHash = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
        $insert = $pdo->prepare("INSERT INTO $usersTable (name, email, password_hash, phone) VALUES (:name, :email, :password_hash, '')");
        $insert->execute([
            ':name' => $name,
            ':email' => $email,
            ':password_hash' => $passwordHash,
        ]);
        $user = ['id' => $pdo->lastInsertId(), 'name' => $name, 'email' => $email];
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_name'] = $user['name'] ?: $name;

    header('Location: /index.html?auth=success');
    exit;
} catch (PDOException $e) {
    error_log('oauth_callback_error: ' . $e->getMessage());
    oauth_redirect_error('oauth_db');
}
?>
