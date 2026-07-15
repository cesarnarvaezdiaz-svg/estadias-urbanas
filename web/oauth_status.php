<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/oauth_config.php';

security_send_common_headers();
header('Content-Type: application/json; charset=UTF-8');
security_send_cors_headers('GET, OPTIONS');
security_no_store();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    security_json_error('Método no permitido.', 405);
}

$providers = [];
foreach (['google', 'apple', 'facebook'] as $provider) {
    $config = oauth_provider_config($provider);
    $providers[$provider] = [
        'name' => $config['name'] ?? ucfirst($provider),
        'configured' => !empty($config['client_id']) && !empty($config['client_secret']),
        'has_client_id' => !empty($config['client_id']),
        'has_client_secret' => !empty($config['client_secret']),
        'redirect_uri' => $config['redirect_uri'] ?? oauth_redirect_uri(),
    ];
}

echo json_encode([
    'status' => 'success',
    'base_url' => oauth_base_url(),
    'redirect_uri' => oauth_redirect_uri(),
    'providers' => $providers,
], JSON_UNESCAPED_UNICODE);
exit;
?>
