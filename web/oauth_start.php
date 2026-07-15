<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/oauth_config.php';

security_send_common_headers();
security_no_store();
security_start_session();
security_rate_limit('oauth_start', 20, 300);

$provider = strtolower(trim($_GET['provider'] ?? ''));
$config = oauth_provider_config($provider);

if (!$config) {
    header('Location: /index.html?auth_error=oauth_provider');
    exit;
}

if ($config['client_id'] === '' || $config['client_secret'] === '') {
    header('Location: /index.html?auth_error=oauth_config');
    exit;
}

$state = bin2hex(random_bytes(32));
$_SESSION['oauth_state'] = $state;
$_SESSION['oauth_provider'] = $provider;

$params = [
    'client_id' => $config['client_id'],
    'redirect_uri' => $config['redirect_uri'],
    'response_type' => 'code',
    'scope' => $config['scope'],
    'state' => $state,
];

if ($provider === 'google') {
    $params['prompt'] = 'select_account';
}

if ($provider === 'apple') {
    $params['response_mode'] = 'form_post';
}

header('Location: ' . $config['auth_url'] . '?' . http_build_query($params));
exit;
?>
