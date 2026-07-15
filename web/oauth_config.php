<?php
function oauth_load_env_file(string $path): void {
    if (!is_readable($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
        [$name, $value] = array_map('trim', explode('=', $line, 2));
        if ($name !== '' && getenv($name) === false) {
            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
        }
    }
}

oauth_load_env_file(__DIR__ . '/.env');

function oauth_env(string $name, string $fallback = ''): string {
    $value = getenv($name);
    return $value === false ? $fallback : trim((string)$value);
}

function oauth_base_url(): string {
    $configured = oauth_env('PUBLIC_BASE_URL', oauth_env('OAUTH_BASE_URL'));
    if ($configured !== '') {
        return rtrim($configured, '/');
    }

    $host = $_SERVER['HTTP_HOST'] ?? 'www.estadiasurbanas.com';
    $host = preg_replace('/:\d+$/', '', $host);
    return 'https://' . $host;
}

function oauth_redirect_uri(): string {
    return oauth_base_url() . '/oauth_callback.php';
}

function oauth_base64url(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function oauth_asn1_length(string $data, int &$offset): int {
    $length = ord($data[$offset++]);
    if ($length < 0x80) return $length;
    $bytes = $length & 0x7f;
    $length = 0;
    for ($i = 0; $i < $bytes; $i++) {
        $length = ($length << 8) | ord($data[$offset++]);
    }
    return $length;
}

function oauth_der_signature_to_jose(string $der, int $partLength = 32): string {
    $offset = 0;
    if ($der === '' || ord($der[$offset++]) !== 0x30) return '';
    oauth_asn1_length($der, $offset);
    if (ord($der[$offset++]) !== 0x02) return '';
    $rLength = oauth_asn1_length($der, $offset);
    $r = substr($der, $offset, $rLength);
    $offset += $rLength;
    if (ord($der[$offset++]) !== 0x02) return '';
    $sLength = oauth_asn1_length($der, $offset);
    $s = substr($der, $offset, $sLength);

    $r = str_pad(ltrim($r, "\x00"), $partLength, "\x00", STR_PAD_LEFT);
    $s = str_pad(ltrim($s, "\x00"), $partLength, "\x00", STR_PAD_LEFT);
    return $r . $s;
}

function oauth_apple_private_key(): string {
    $key = oauth_env('APPLE_PRIVATE_KEY');
    if ($key !== '') {
        return str_replace('\n', "\n", $key);
    }

    $path = oauth_env('APPLE_PRIVATE_KEY_PATH');
    if ($path !== '' && is_readable($path)) {
        return (string)file_get_contents($path);
    }

    return '';
}

function oauth_apple_client_secret(string $clientId): string {
    $teamId = oauth_env('APPLE_TEAM_ID');
    $keyId = oauth_env('APPLE_KEY_ID');
    $privateKey = oauth_apple_private_key();

    if ($clientId === '' || $teamId === '' || $keyId === '' || $privateKey === '' || !function_exists('openssl_sign')) {
        return '';
    }

    $now = time();
    $header = ['alg' => 'ES256', 'kid' => $keyId];
    $payload = [
        'iss' => $teamId,
        'iat' => $now,
        'exp' => $now + 86400 * 150,
        'aud' => 'https://appleid.apple.com',
        'sub' => $clientId,
    ];

    $body = oauth_base64url(json_encode($header, JSON_UNESCAPED_SLASHES)) . '.' .
        oauth_base64url(json_encode($payload, JSON_UNESCAPED_SLASHES));

    $signature = '';
    if (!openssl_sign($body, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
        return '';
    }

    $joseSignature = oauth_der_signature_to_jose($signature);
    return $joseSignature === '' ? '' : $body . '.' . oauth_base64url($joseSignature);
}

function oauth_provider_config(string $provider): ?array {
    $redirect = oauth_redirect_uri();

    $providers = [
        'google' => [
            'name' => 'Google',
            'client_id' => oauth_env('GOOGLE_CLIENT_ID'),
            'client_secret' => oauth_env('GOOGLE_CLIENT_SECRET'),
            'auth_url' => 'https://accounts.google.com/o/oauth2/v2/auth',
            'token_url' => 'https://oauth2.googleapis.com/token',
            'userinfo_url' => 'https://www.googleapis.com/oauth2/v3/userinfo',
            'scope' => 'openid email profile',
            'redirect_uri' => $redirect,
        ],
        'facebook' => [
            'name' => 'Facebook',
            'client_id' => oauth_env('FACEBOOK_CLIENT_ID'),
            'client_secret' => oauth_env('FACEBOOK_CLIENT_SECRET'),
            'auth_url' => 'https://www.facebook.com/v22.0/dialog/oauth',
            'token_url' => 'https://graph.facebook.com/v22.0/oauth/access_token',
            'userinfo_url' => 'https://graph.facebook.com/v22.0/me?fields=id,name,email',
            'scope' => 'email,public_profile',
            'redirect_uri' => $redirect,
        ],
        'apple' => [
            'name' => 'Apple',
            'client_id' => oauth_env('APPLE_CLIENT_ID'),
            'client_secret' => oauth_env('APPLE_CLIENT_SECRET') ?: oauth_apple_client_secret(oauth_env('APPLE_CLIENT_ID')),
            'auth_url' => 'https://appleid.apple.com/auth/authorize',
            'token_url' => 'https://appleid.apple.com/auth/token',
            'scope' => 'name email',
            'redirect_uri' => $redirect,
        ],
    ];

    return $providers[$provider] ?? null;
}
?>
