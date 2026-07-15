<?php
require_once __DIR__ . '/security.php';

security_send_common_headers();
security_send_cors_headers('GET, POST, OPTIONS');
security_no_store();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

security_rate_limit('disponibilidad', 80, 300);

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}
require_once __DIR__ . '/reservation_guard.php';

$input = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    security_require_json_content_type();
    $decoded = json_decode(file_get_contents('php://input'), true);
    if (is_array($decoded)) {
        $input = $decoded;
    }
} else {
    $input = $_GET;
}

$result = estadias_check_booking_availability([
    'property' => $input['property'] ?? $input['propiedad'] ?? '',
    'check_in' => $input['check_in'] ?? $input['checkin'] ?? '',
    'check_out' => $input['check_out'] ?? $input['checkout'] ?? '',
    'guests' => $input['guests'] ?? $input['huespedes'] ?? 1,
]);

if (!$result['ok']) {
    http_response_code((int)($result['http_code'] ?? 400));
    echo json_encode(['status' => 'error', 'message' => $result['message']]);
    exit;
}

echo json_encode([
    'status' => 'success',
    'available' => (bool)$result['available'],
    'message' => $result['message'],
    'storage' => $result['storage'] ?? null,
    'blocked_night' => $result['blocked_night'] ?? null,
    'blocked_status' => $result['blocked_status'] ?? null,
    'blocked_source' => $result['blocked_source'] ?? null,
    'warning' => $result['warning'] ?? null,
]);
?>
