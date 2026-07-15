<?php
require_once __DIR__ . '/security.php';
security_send_common_headers();
header('Content-Type: application/json; charset=utf-8');
security_send_cors_headers('GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    security_json_error('Metodo no permitido.', 405);
}

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}
require_once __DIR__ . '/reservation_guard.php';

$folio = trim((string)($_GET['folio'] ?? ''));
$email = filter_var($_GET['email'] ?? '', FILTER_VALIDATE_EMAIL);
$id = 0;
if (preg_match('/EU-(\d+)/i', $folio, $m)) {
    $id = (int)$m[1];
}

if ($id <= 0 || !$email) {
    security_json_error('Indica folio y email validos.', 400);
}

try {
    $pdo = estadias_get_db_connection();
    if (!$pdo) {
        security_json_error('Base de datos no disponible.', 503);
    }
    estadias_bootstrap_booking_schema($pdo);

    $stmt = $pdo->prepare("SELECT id, propiedad_nombre, nombre_cliente, email_cliente, check_in, check_out, huespedes, estado, hold_token, source, created_at
        FROM reservas
        WHERE id = :id AND email_cliente = :email
        LIMIT 1");
    $stmt->execute([':id' => $id, ':email' => $email]);
    $row = $stmt->fetch();

    if (!$row) {
        security_json_error('No encontramos una reserva con ese folio y email.', 404);
    }

    echo json_encode([
        'status' => 'success',
        'reservation' => [
            'folio' => 'EU-' . $row['id'],
            'property' => $row['propiedad_nombre'],
            'name' => $row['nombre_cliente'],
            'email' => $row['email_cliente'],
            'check_in' => $row['check_in'],
            'check_out' => $row['check_out'],
            'guests' => (int)$row['huespedes'],
            'state' => $row['estado'],
            'source' => $row['source'] ?? 'web',
            'created_at' => $row['created_at'],
        ],
    ]);
} catch (Throwable $e) {
    security_json_error('No se pudo consultar la reserva.', 500);
}
?>
