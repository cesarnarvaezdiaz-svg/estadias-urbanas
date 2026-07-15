<?php
require_once __DIR__ . '/security.php';

security_send_common_headers();
header('Content-Type: application/json; charset=utf-8');
security_send_cors_headers('GET, OPTIONS');
security_no_store();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Metodo no permitido.']);
    exit;
}

security_rate_limit('mis_reservas', 40, 300);
security_start_session();

if (file_exists(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
require_once __DIR__ . '/reservation_guard.php';

$email = filter_var($_GET['email'] ?? '', FILTER_VALIDATE_EMAIL);
if (!$email && !empty($_SESSION['user_email'])) {
    $email = filter_var($_SESSION['user_email'], FILTER_VALIDATE_EMAIL);
}

if (!$email) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Ingresa el email usado en la reserva.'
    ]);
    exit;
}

$pdo = estadias_get_db_connection();
if (!$pdo) {
    http_response_code(503);
    echo json_encode([
        'status' => 'error',
        'message' => 'No se pudo conectar con la base de datos de reservas.'
    ]);
    exit;
}

try {
    estadias_bootstrap_booking_schema($pdo);

    $stmt = $pdo->prepare("SELECT id, propiedad_nombre, nombre_cliente, email_cliente, telefono_cliente, check_in, check_out, huespedes, estado, source, created_at
        FROM reservas
        WHERE LOWER(email_cliente) = LOWER(:email)
        ORDER BY check_in DESC, created_at DESC, id DESC
        LIMIT 50");
    $stmt->execute([':email' => $email]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $reservations = array_map(function ($row) {
        return [
            'id' => (int)$row['id'],
            'folio' => 'EU-' . (int)$row['id'],
            'property' => $row['propiedad_nombre'],
            'guest_name' => $row['nombre_cliente'],
            'email' => $row['email_cliente'],
            'phone' => $row['telefono_cliente'] ?? '',
            'check_in' => $row['check_in'],
            'check_out' => $row['check_out'],
            'guests' => (int)$row['huespedes'],
            'status' => $row['estado'],
            'source' => $row['source'] ?? 'web',
            'created_at' => $row['created_at'],
        ];
    }, $rows);

    echo json_encode([
        'status' => 'success',
        'email' => $email,
        'count' => count($reservations),
        'reservations' => $reservations,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'No se pudieron consultar las reservas.'
    ]);
}
?>
