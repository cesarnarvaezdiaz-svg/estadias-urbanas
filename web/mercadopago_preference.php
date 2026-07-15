<?php
require_once __DIR__ . '/security.php';
security_bootstrap_json_api('mercadopago_preference', 20);

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}
require_once __DIR__ . '/reservation_guard.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Solicitud invalida.']);
    exit;
}

$accessToken = getenv('MP_ACCESS_TOKEN') ?: (defined('MP_ACCESS_TOKEN') ? MP_ACCESS_TOKEN : '');
$mpMock = getenv('MP_MOCK') ?: '0';
if (!$accessToken && $mpMock !== '1') {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Mercado Pago no está configurado. Define MP_ACCESS_TOKEN en el servidor.'
    ]);
    exit;
}

$title = trim((string)($input['title'] ?? 'Reserva Estadias Urbanas'));
$property = trim((string)($input['property'] ?? 'Estadias Urbanas'));
$checkIn = trim((string)($input['check_in'] ?? ''));
$checkOut = trim((string)($input['check_out'] ?? ''));
$guests = (int)($input['guests'] ?? 1);
$nights = max(1, (int)($input['nights'] ?? 1));
$payerEmail = filter_var($input['payer_email'] ?? $input['email'] ?? '', FILTER_VALIDATE_EMAIL);
$payerName = trim((string)($input['payer_name'] ?? $input['name'] ?? ''));
$payerPhone = substr(trim((string)($input['payer_phone'] ?? $input['phone'] ?? '')), 0, 40);
$source = estadias_normalize_source($input['source'] ?? 'web');
$paymentSource = $source === 'app' ? 'app_mercadopago_checkout' : 'web_mercadopago_checkout';
$priceUsd = estadias_resolve_catalog_price($title, $property);

if ($priceUsd === null) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No pudimos validar el precio de esta propiedad desde el catálogo del servidor.']);
    exit;
}

if ($priceUsd <= 0 || $nights < 1 || $guests < 1) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Faltan datos de pago.']);
    exit;
}

$hold = estadias_create_booking_hold([
    'property' => $title ?: $property,
    'name' => $payerName,
    'email' => $payerEmail ?: '',
    'phone' => $payerPhone,
    'check_in' => $checkIn,
    'check_out' => $checkOut,
    'guests' => $guests,
], $paymentSource, 60, true);

if (!$hold['ok']) {
    http_response_code((int)($hold['http_code'] ?? 409));
    echo json_encode(['status' => 'error', 'message' => $hold['message']]);
    exit;
}

$nights = (int)$hold['nights'];

$currency = getenv('MP_CURRENCY') ?: (defined('MP_CURRENCY') ? MP_CURRENCY : 'CLP');
$usdToClp = (float)(getenv('MP_USD_TO_CLP') ?: (defined('MP_USD_TO_CLP') ? MP_USD_TO_CLP : 950));
$unitPrice = $priceUsd;
if ($currency === 'CLP') {
    $unitPrice = round($priceUsd * $usdToClp);
}

$grossUsd = round($priceUsd * $nights, 2);
$commissionRate = 0.11;
$ivaRate = 0.19;
$commissionUsd = round($grossUsd * $commissionRate, 2);
$commissionIvaUsd = round($commissionUsd * $ivaRate, 2);
$hostNetUsd = round($grossUsd - $commissionUsd - $commissionIvaUsd, 2);

$publicBaseUrl = trim((string)(getenv('PUBLIC_BASE_URL') ?: getenv('MP_PUBLIC_BASE_URL') ?: (defined('PUBLIC_BASE_URL') ? PUBLIC_BASE_URL : '')));
if ($publicBaseUrl !== '') {
    $baseUrl = rtrim($publicBaseUrl, '/');
} else {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $baseUrl = $scheme . '://' . $host . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/\\');
}
$backUrl = $baseUrl . '/index.html';
$webhookUrl = $baseUrl . '/mercadopago_webhook.php';


if ($mpMock === '1' || $accessToken === 'MOCK') {
    $fakeId = 'MOCK-' . bin2hex(random_bytes(6));
    $fakeInit = $baseUrl . '/mock-pay?pref_id=' . rawurlencode($fakeId);
    try {
        $pdo = estadias_get_db_connection();
        if ($pdo) {
            estadias_mark_reservation_payment($pdo, $hold['hold_token'], [
                'status' => 'pending',
                'preference_id' => $fakeId,
            ]);
        }
    } catch (Throwable $e) {
        error_log('mp_mock_mark_payment: ' . $e->getMessage());
    }
    echo json_encode([
        'status' => 'success',
        'id' => $fakeId,
        'hold_token' => $hold['hold_token'],
        'hold_expires_at' => $hold['expires_at'],
        'availability_storage' => $hold['storage'],
        'server_price_usd' => $priceUsd,
        'commission' => [
            'gross_usd' => $grossUsd,
            'commission_rate' => $commissionRate,
            'iva_rate' => $ivaRate,
            'commission_usd' => $commissionUsd,
            'commission_iva_usd' => $commissionIvaUsd,
            'host_net_usd' => $hostNetUsd
        ],
        'init_point' => $fakeInit,
        'sandbox_init_point' => $fakeInit
    ]);
    exit;
}

$descriptionParts = [$property, $nights . ' noche(s)', $guests . ' huesped(es)'];
if ($checkIn && $checkOut) {
    $descriptionParts[] = $checkIn . ' al ' . $checkOut;
}

$preference = [
    'items' => [[
        'title' => substr($title, 0, 250),
        'description' => substr(implode(' - ', $descriptionParts), 0, 600),
        'quantity' => $nights,
        'currency_id' => $currency,
        'unit_price' => $unitPrice
    ]],
    'back_urls' => [
        'success' => $backUrl . '?pago=success',
        'failure' => $backUrl . '?pago=failure',
        'pending' => $backUrl . '?pago=pending'
    ],
    'auto_return' => 'approved',
    'notification_url' => $webhookUrl,
    'external_reference' => 'EU-' . $hold['hold_token'],
    'statement_descriptor' => 'ESTADIAS URBANAS',
    'metadata' => [
        'property' => $property,
        'hold_token' => $hold['hold_token'],
        'check_in' => $checkIn,
        'check_out' => $checkOut,
        'guests' => $guests,
        'nights' => $nights,
        'payer_email' => $payerEmail ?: '',
        'payer_name' => $payerName,
        'payer_phone' => $payerPhone,
        'price_usd' => $priceUsd,
        'gross_usd' => $grossUsd,
        'estadias_commission_rate' => $commissionRate,
        'estadias_commission_usd' => $commissionUsd,
        'estadias_commission_iva_usd' => $commissionIvaUsd,
        'host_net_usd' => $hostNetUsd,
        'source' => $source
    ]
];

if ($payerEmail) {
    $preference['payer'] = [
        'name' => $payerName,
        'email' => $payerEmail,
    ];
}

$ch = curl_init('https://api.mercadopago.com/checkout/preferences');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode($preference),
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4
]);

$response = curl_exec($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $httpCode < 200 || $httpCode >= 300) {
    estadias_release_hold($hold['hold_token']);
    $provider = json_decode((string)$response, true);
    $providerMessage = is_array($provider) ? (string)($provider['message'] ?? $provider['error'] ?? '') : '';
    $message = 'No se pudo crear el pago en Mercado Pago.';
    if ($httpCode === 401 || $httpCode === 403) {
        $message = 'Mercado Pago rechazó la credencial configurada. Revisa que sea el Access Token de producción, no la Public Key.';
    } elseif ($curlError) {
        $message = 'No se pudo conectar con Mercado Pago desde el servidor.';
    }

    http_response_code(502);
    echo json_encode([
        'status' => 'error',
        'message' => $message,
        'http_code' => $httpCode,
        'provider_message' => $providerMessage
    ]);
    exit;
}

$data = json_decode($response, true);
$preferenceId = $data['id'] ?? null;
if ($preferenceId) {
    try {
        $pdo = estadias_get_db_connection();
        if ($pdo) {
            estadias_mark_reservation_payment($pdo, $hold['hold_token'], [
                'status' => 'pending',
                'preference_id' => $preferenceId,
            ]);
        }
    } catch (Throwable $e) {
        error_log('mp_preference_mark_payment: ' . $e->getMessage());
    }
}

if (empty($data['init_point'])) {
    estadias_release_hold($hold['hold_token']);
    http_response_code(502);
    echo json_encode([
        'status' => 'error',
        'message' => 'Mercado Pago no devolvió un link de pago.',
        'http_code' => $httpCode
    ]);
    exit;
}

echo json_encode([
    'status' => 'success',
    'id' => $preferenceId,
    'hold_token' => $hold['hold_token'],
    'hold_expires_at' => $hold['expires_at'],
    'availability_storage' => $hold['storage'],
    'server_price_usd' => $priceUsd,
    'commission' => [
        'gross_usd' => $grossUsd,
        'commission_rate' => $commissionRate,
        'iva_rate' => $ivaRate,
        'commission_usd' => $commissionUsd,
        'commission_iva_usd' => $commissionIvaUsd,
        'host_net_usd' => $hostNetUsd
    ],
    'init_point' => $data['init_point'] ?? null,
    'sandbox_init_point' => $data['sandbox_init_point'] ?? null
]);
?>
