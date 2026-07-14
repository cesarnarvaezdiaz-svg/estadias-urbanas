<?php
declare(strict_types=1);

require_once __DIR__ . '/mobile_bootstrap.php';
require_once __DIR__ . '/reservation_guard.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') mobile_json_error('Metodo no permitido.', 405);
$user = mobile_require_user($pdo);
estadias_bootstrap_booking_schema($pdo);

$stmt = $pdo->prepare('SELECT id, propiedad_nombre, nombre_cliente, email_cliente, telefono_cliente, check_in, check_out, huespedes, estado, source, created_at
    FROM reservas WHERE LOWER(email_cliente) = LOWER(:email) ORDER BY check_in DESC, created_at DESC, id DESC LIMIT 100');
$stmt->execute([':email' => $user['email']]);
$reservations = array_map(static fn(array $row): array => [
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
], $stmt->fetchAll(PDO::FETCH_ASSOC));

mobile_json_success(['count' => count($reservations), 'reservations' => $reservations]);
?>
