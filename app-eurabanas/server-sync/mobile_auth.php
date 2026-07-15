<?php
declare(strict_types=1);

require_once __DIR__ . '/mobile_bootstrap.php';

$action = strtolower(trim((string)($_GET['action'] ?? '')));

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action !== 'me') mobile_json_error('Accion no permitida.', 405);
    $user = mobile_require_user($pdo);
    mobile_json_success(['user' => mobile_user_payload($user)]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') mobile_json_error('Metodo no permitido.', 405);
$input = mobile_input();
$action = strtolower(trim((string)($input['action'] ?? $action)));
$deviceName = (string)($input['device_name'] ?? 'Estadías Urbanas App');

if ($action === 'login') {
    security_rate_limit('mobile_login', 12, 900);
    $email = filter_var(strtolower(trim((string)($input['email'] ?? ''))), FILTER_VALIDATE_EMAIL);
    $password = (string)($input['password'] ?? '');
    if (!$email || $password === '') mobile_json_error('Ingresa correo y contraseña.');
    $stmt = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || !password_verify($password, (string)($user['password_hash'] ?? ''))) {
        mobile_json_error('Correo o contraseña incorrectos.', 401);
    }
    $session = mobile_issue_token($pdo, $user, $deviceName);
    mobile_json_success($session + ['user' => mobile_user_payload($user)]);
}

if ($action === 'register') {
    security_rate_limit('mobile_register', 8, 900);
    $name = trim((string)($input['name'] ?? ''));
    $email = filter_var(strtolower(trim((string)($input['email'] ?? ''))), FILTER_VALIDATE_EMAIL);
    $phone = substr(trim((string)($input['phone'] ?? '')), 0, 40);
    $password = (string)($input['password'] ?? '');
    if (!$email || strlen($name) < 2) mobile_json_error('Ingresa nombre y correo validos.');
    $passwordError = security_password_policy($password);
    if ($passwordError) mobile_json_error($passwordError);
    $exists = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
    $exists->execute([':email' => $email]);
    if ($exists->fetchColumn()) mobile_json_error('Este correo ya esta registrado.', 409);
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, phone) VALUES (:name, :email, :password_hash, :phone)');
    $stmt->execute([
        ':name' => substr($name, 0, 120),
        ':email' => $email,
        ':password_hash' => password_hash($password, PASSWORD_DEFAULT),
        ':phone' => $phone,
    ]);
    $user = ['id' => (int)$pdo->lastInsertId(), 'name' => $name, 'email' => $email];
    $session = mobile_issue_token($pdo, $user, $deviceName);
    mobile_json_success($session + ['user' => mobile_user_payload($user)]);
}

if ($action === 'logout') {
    $user = mobile_require_user($pdo);
    $token = mobile_bearer_token();
    $pdo->prepare('DELETE FROM mobile_access_tokens WHERE user_id = :user_id AND token_hash = :hash')
        ->execute([':user_id' => $user['id'], ':hash' => hash('sha256', $token)]);
    mobile_json_success();
}

if ($action === 'oauth_google') {
    require_once __DIR__ . '/oauth_config.php';
    $identityToken = trim((string)($input['identity_token'] ?? ''));
    $code = trim((string)($input['code'] ?? ''));
    $verifier = trim((string)($input['code_verifier'] ?? ''));
    $redirectUri = trim((string)($input['redirect_uri'] ?? ''));
    $config = oauth_provider_config('google');
    if (!$config || $config['client_id'] === '') mobile_json_error('Google no esta configurado en el servidor.', 503);
    if ($identityToken !== '') {
        $profile = mobile_http_get_json('https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($identityToken));
        $allowedAudiences = array_values(array_filter([
            (string)$config['client_id'],
            (string)(getenv('GOOGLE_IOS_CLIENT_ID') ?: ''),
            (string)(getenv('GOOGLE_ANDROID_CLIENT_ID') ?: ''),
            (string)(getenv('GOOGLE_WEB_CLIENT_ID') ?: ''),
        ]));
        if (!$profile || !in_array((string)($profile['aud'] ?? ''), $allowedAudiences, true)) {
            mobile_json_error('Google rechazo la identidad de la aplicacion.', 401);
        }
    } else {
        if ($config['client_secret'] === '' || $code === '' || $verifier === '' || $redirectUri === '') mobile_json_error('Google no entrego una autorizacion valida.');
        $token = mobile_http_post($config['token_url'], [
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'code' => $code,
            'code_verifier' => $verifier,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirectUri,
        ]);
        if (!$token || empty($token['access_token'])) mobile_json_error('Google rechazo la autorizacion.', 401);
        $profile = mobile_http_get($config['userinfo_url'], (string)$token['access_token']);
    }
    $email = filter_var($profile['email'] ?? '', FILTER_VALIDATE_EMAIL);
    if (!$email || ($profile['email_verified'] ?? true) === false) mobile_json_error('Google no entrego un correo verificado.', 401);
    $user = mobile_find_or_create_oauth_user($pdo, $email, (string)($profile['name'] ?? 'Huésped'));
    $session = mobile_issue_token($pdo, $user, $deviceName);
    mobile_json_success($session + ['user' => mobile_user_payload($user)]);
}


if ($action === 'oauth_facebook') {
    $accessToken = trim((string)($input['access_token'] ?? ''));
    $appId = (string)(getenv('FACEBOOK_APP_ID') ?: '');
    $appSecret = (string)(getenv('FACEBOOK_APP_SECRET') ?: '');
    if ($appId === '') mobile_json_error('Facebook no esta configurado en el servidor.', 503);
    if ($accessToken === '') mobile_json_error('Facebook no entrego una autorizacion valida.');

    $debugUrl = 'https://graph.facebook.com/debug_token?input_token=' . rawurlencode($accessToken) . '&access_token=' . rawurlencode($appSecret !== '' ? $appId . '|' . $appSecret : $accessToken);
    $debug = mobile_http_get_json($debugUrl);
    $debugData = is_array($debug['data'] ?? null) ? $debug['data'] : [];
    if (!$debugData || empty($debugData['is_valid']) || (string)($debugData['app_id'] ?? '') !== $appId) {
        mobile_json_error('Facebook rechazo la identidad de la aplicacion.', 401);
    }

    $profileUrl = 'https://graph.facebook.com/me?fields=id,name,email&access_token=' . rawurlencode($accessToken);
    if ($appSecret !== '') $profileUrl .= '&appsecret_proof=' . hash_hmac('sha256', $accessToken, $appSecret);
    $profile = mobile_http_get_json($profileUrl);
    $email = filter_var($profile['email'] ?? '', FILTER_VALIDATE_EMAIL);
    if (!$email) mobile_json_error('Facebook no entrego un correo valido. Revisa que la cuenta tenga email confirmado.', 401);
    $user = mobile_find_or_create_oauth_user($pdo, $email, (string)($profile['name'] ?? 'Huésped'));
    $session = mobile_issue_token($pdo, $user, $deviceName);
    mobile_json_success($session + ['user' => mobile_user_payload($user)]);
}

if ($action === 'oauth_apple') {
    require_once __DIR__ . '/oauth_config.php';
    $code = trim((string)($input['authorization_code'] ?? ''));
    $identityToken = trim((string)($input['identity_token'] ?? ''));
    $config = oauth_provider_config('apple');
    if (!$config || $config['client_id'] === '' || $config['client_secret'] === '') mobile_json_error('Apple no esta configurado en el servidor.', 503);
    if ($code === '' || $identityToken === '') mobile_json_error('Apple no entrego una autorizacion valida.');
    $exchange = mobile_http_post($config['token_url'], [
        'client_id' => $config['client_id'],
        'client_secret' => $config['client_secret'],
        'code' => $code,
        'grant_type' => 'authorization_code',
    ]);
    if (!$exchange || empty($exchange['id_token'])) mobile_json_error('Apple rechazo la autorizacion.', 401);
    $profile = mobile_jwt_payload((string)$exchange['id_token']);
    $email = filter_var($profile['email'] ?? '', FILTER_VALIDATE_EMAIL);
    if (!$email) mobile_json_error('Apple no entrego un correo valido.', 401);
    $name = trim((string)($input['name'] ?? '')) ?: explode('@', $email)[0];
    $user = mobile_find_or_create_oauth_user($pdo, $email, $name);
    $session = mobile_issue_token($pdo, $user, $deviceName);
    mobile_json_success($session + ['user' => mobile_user_payload($user)]);
}

mobile_json_error('Accion no reconocida.', 400);
?>
