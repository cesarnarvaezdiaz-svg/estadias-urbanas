<?php
require_once __DIR__ . '/security.php';
security_bootstrap_json_api('mercadopago_webhook', 80);

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}
require_once __DIR__ . '/reservation_guard.php';

$raw = file_get_contents('php://input');
$input = json_decode($raw ?: '{}', true);
if (!is_array($input)) $input = [];

$paymentId = $input['data']['id'] ?? $input['id'] ?? ($_GET['data_id'] ?? $_GET['id'] ?? '');
$paymentId = preg_replace('/[^0-9]/', '', (string)$paymentId);

if ($paymentId === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Webhook sin payment id.']);
    exit;
}

$accessToken = getenv('MP_ACCESS_TOKEN') ?: (defined('MP_ACCESS_TOKEN') ? MP_ACCESS_TOKEN : '');
if (!$accessToken) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Mercado Pago no está configurado.']);
    exit;
}

$ch = curl_init('https://api.mercadopago.com/v1/payments/' . rawurlencode($paymentId));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ],
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4
]);
$response = curl_exec($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $httpCode < 200 || $httpCode >= 300) {
    http_response_code(502);
    echo json_encode([
        'status' => 'error',
        'message' => 'No se pudo verificar el pago con Mercado Pago.',
        'http_code' => $httpCode,
        'provider_error' => $curlError,
    ]);
    exit;
}

$payment = json_decode($response, true);
if (!is_array($payment)) {
    http_response_code(502);
    echo json_encode(['status' => 'error', 'message' => 'Mercado Pago respondió datos inválidos.']);
    exit;
}

$paymentStatus = (string)($payment['status'] ?? '');
$metadata = is_array($payment['metadata'] ?? null) ? $payment['metadata'] : [];
$holdToken = preg_replace('/[^a-f0-9]/', '', (string)($metadata['hold_token'] ?? ''));

if (in_array($paymentStatus, ['cancelled', 'rejected', 'refunded', 'charged_back'], true) && $holdToken !== '') {
    estadias_release_hold($holdToken);
    try {
        $pdo = estadias_get_db_connection();
        if ($pdo) {
            estadias_mark_reservation_payment($pdo, $holdToken, [
                'status' => $paymentStatus,
                'payment_id' => $paymentId,
                'preference_id' => $payment['preference_id'] ?? null,
            ]);
        }
    } catch (Throwable $e) {
        error_log('mp_rejected_mark_payment: ' . $e->getMessage());
    }
    echo json_encode(['status' => 'success', 'message' => 'Pago no aprobado; bloqueo liberado.']);
    exit;
}

if ($paymentStatus !== 'approved') {
    if ($holdToken !== '') {
        try {
            $pdo = estadias_get_db_connection();
            if ($pdo) {
                estadias_mark_reservation_payment($pdo, $holdToken, [
                    'status' => $paymentStatus,
                    'payment_id' => $paymentId,
                    'preference_id' => $payment['preference_id'] ?? null,
                ]);
            }
        } catch (Throwable $e) {
            error_log('mp_pending_mark_payment: ' . $e->getMessage());
        }
    }
    echo json_encode(['status' => 'success', 'message' => 'Pago recibido en estado ' . $paymentStatus . '.']);
    exit;
}

if ($holdToken !== '') {
    estadias_confirm_hold($holdToken);
    try {
        $pdo = estadias_get_db_connection();
        if ($pdo) {
            estadias_mark_reservation_payment($pdo, $holdToken, [
                'status' => $paymentStatus,
                'payment_id' => $paymentId,
                'preference_id' => $payment['preference_id'] ?? null,
            ]);
        }
    } catch (Throwable $e) {
        error_log('mp_approved_mark_payment: ' . $e->getMessage());
    }
}

$payer = is_array($payment['payer'] ?? null) ? $payment['payer'] : [];
$payerEmail = filter_var($payer['email'] ?? $metadata['payer_email'] ?? '', FILTER_VALIDATE_EMAIL);
$payerName = trim((string)($metadata['payer_name'] ?? $payer['first_name'] ?? 'Huésped'));
$nights = max(1, (int)($metadata['nights'] ?? 1));
$loyalty = null;

if ($payerEmail) {
    $loyalty = estadias_record_loyalty($payerEmail, $payerName, $nights, 'mp-' . $paymentId, 'mercadopago_approved');
}

echo json_encode([
    'status' => 'success',
    'message' => 'Pago aprobado y reserva protegida.',
    'payment_id' => $paymentId,
    'hold_confirmed' => $holdToken !== '',
    'loyalty' => $loyalty,
]);
?>
