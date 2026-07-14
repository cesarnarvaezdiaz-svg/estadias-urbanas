<?php
declare(strict_types=1);

require_once __DIR__ . '/mobile_bootstrap.php';
require_once __DIR__ . '/reservation_guard.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') mobile_json_error('Metodo no permitido.', 405);
$user = mobile_require_user($pdo);
$email = (string)$user['email'];

estadias_bootstrap_booking_schema($pdo);
$pdo->exec("CREATE TABLE IF NOT EXISTS fidelizacion_clientes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    nombre VARCHAR(190) NOT NULL,
    puntos INT NOT NULL DEFAULT 0,
    reservas INT NOT NULL DEFAULT 0,
    noches INT NOT NULL DEFAULT 0,
    nivel VARCHAR(30) NOT NULL DEFAULT 'Club',
    last_booking_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$loyaltyStmt = $pdo->prepare('SELECT puntos, reservas, noches, nivel, last_booking_at FROM fidelizacion_clientes WHERE LOWER(email) = LOWER(:email) LIMIT 1');
$loyaltyStmt->execute([':email' => $email]);
$loyalty = $loyaltyStmt->fetch(PDO::FETCH_ASSOC) ?: [];

$countStmt = $pdo->prepare('SELECT COUNT(*) FROM reservas WHERE LOWER(email_cliente) = LOWER(:email)');
$countStmt->execute([':email' => $email]);
$total = (int)$countStmt->fetchColumn();

$activeStmt = $pdo->prepare("SELECT COUNT(*) FROM reservas WHERE LOWER(email_cliente) = LOWER(:email)
    AND estado IN ('pendiente', 'confirmada', 'pagada') AND check_out >= CURDATE()");
$activeStmt->execute([':email' => $email]);
$active = (int)$activeStmt->fetchColumn();

$recentStmt = $pdo->prepare('SELECT id, propiedad_nombre, nombre_cliente, email_cliente, telefono_cliente, check_in, check_out, huespedes, estado, source, created_at
    FROM reservas WHERE LOWER(email_cliente) = LOWER(:email) ORDER BY check_in DESC, id DESC LIMIT 3');
$recentStmt->execute([':email' => $email]);
$recent = array_map(static fn(array $row): array => [
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
], $recentStmt->fetchAll(PDO::FETCH_ASSOC));

mobile_json_success([
    'loyalty' => [
        'points' => (int)($loyalty['puntos'] ?? 0),
        'tier' => (string)($loyalty['nivel'] ?? 'Club'),
        'bookings' => (int)($loyalty['reservas'] ?? $total),
        'nights' => (int)($loyalty['noches'] ?? 0),
        'last_booking_at' => $loyalty['last_booking_at'] ?? null,
    ],
    'reservations' => ['total' => $total, 'active' => $active, 'recent' => $recent],
    'profile' => null,
]);
?>
