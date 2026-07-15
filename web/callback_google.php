<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/oauth_config.php';
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}
require_once __DIR__ . '/oauth_db.php';

security_send_common_headers();
security_no_store();
security_start_session();
security_rate_limit('google_legacy_callback', 30, 300);

function google_legacy_redirect_error(string $code): void {
    header('Location: /index.html?auth_error=' . rawurlencode($code));
    exit;
}

$code = trim((string)($_GET['code'] ?? ''));
if ($code === '') {
    google_legacy_redirect_error('oauth_token');
}

$clientId = oauth_env('GOOGLE_CLIENT_ID', '211056906904-j0fo6gmarci60n9g73f4ksrccua3ub23.apps.googleusercontent.com');
$clientSecret = oauth_env('GOOGLE_CLIENT_SECRET');
$publicBase = oauth_env('PUBLIC_BASE_URL', oauth_env('OAUTH_BASE_URL', 'https://www.estadiasurbanas.com'));
$redirectUri = rtrim($publicBase, '/') . '/callback_google.php';

if ($clientId === '' || $clientSecret === '') {
    error_log('google_legacy_config_missing');
    google_legacy_redirect_error('oauth_config');
}

$tokenCurl = curl_init('https://oauth2.googleapis.com/token');
curl_setopt_array($tokenCurl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query([
        'code' => $code,
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'redirect_uri' => $redirectUri,
        'grant_type' => 'authorization_code',
    ]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
]);
$tokenResponse = curl_exec($tokenCurl);
$tokenStatus = (int)curl_getinfo($tokenCurl, CURLINFO_RESPONSE_CODE);
curl_close($tokenCurl);
$token = json_decode((string)$tokenResponse, true);

if (!is_array($token) || $tokenStatus < 200 || $tokenStatus >= 300 || empty($token['access_token'])) {
    error_log('google_legacy_token_error: HTTP ' . $tokenStatus . ' ' . substr((string)$tokenResponse, 0, 300));
    google_legacy_redirect_error('oauth_token');
}

$profileCurl = curl_init('https://www.googleapis.com/oauth2/v3/userinfo');
curl_setopt_array($profileCurl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'Authorization: Bearer ' . $token['access_token'],
    ],
]);
$profileResponse = curl_exec($profileCurl);
$profileStatus = (int)curl_getinfo($profileCurl, CURLINFO_RESPONSE_CODE);
curl_close($profileCurl);
$profile = json_decode((string)$profileResponse, true);

if (!is_array($profile) || $profileStatus < 200 || $profileStatus >= 300 || ($profile['email_verified'] ?? true) === false) {
    google_legacy_redirect_error('oauth_email');
}

$email = filter_var($profile['email'] ?? '', FILTER_VALIDATE_EMAIL);
$name = trim((string)($profile['name'] ?? $profile['given_name'] ?? 'Huésped'));
if (!$email) {
    google_legacy_redirect_error('oauth_email');
}
if ($name === '') {
    $name = explode('@', $email)[0];
}

$pdo = oauth_get_db_connection();
if (!$pdo) {
    google_legacy_redirect_error('oauth_db');
}

try {
    oauth_bootstrap_users_table($pdo);
    $stmt = $pdo->prepare('SELECT id, name, email FROM `users` WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $passwordHash = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
        $insert = $pdo->prepare("INSERT INTO `users` (name, email, password_hash, phone) VALUES (:name, :email, :password_hash, '')");
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
    error_log('google_legacy_db_error: ' . $e->getMessage());
    google_legacy_redirect_error('oauth_db');
}
?>
