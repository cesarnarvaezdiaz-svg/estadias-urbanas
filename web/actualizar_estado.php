<?php
require_once __DIR__ . '/admin_auth.php';
require_admin();

if (file_exists(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
require_once __DIR__ . '/reservation_guard.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Metodo no permitido.');
}

admin_verify_csrf($_POST['csrf_token'] ?? '');

$id = filter_input(INPUT_POST, 'id_reserva', FILTER_VALIDATE_INT);
$accion = preg_replace('/[^a-z_]/', '', (string)($_POST['accion'] ?? ''));
$map = [
    'aprobar' => 'confirmada',
    'confirmar' => 'confirmada',
    'pagada' => 'pagada',
    'rechazar' => 'cancelada',
    'cancelar' => 'cancelada',
];

if (!$id || !isset($map[$accion])) {
    http_response_code(400);
    exit('Solicitud invalida.');
}

$pdo = estadias_get_db_connection();
if (!$pdo) {
    http_response_code(500);
    exit('Base de datos no configurada.');
}
estadias_bootstrap_booking_schema($pdo);

$stmt = $pdo->prepare("SELECT * FROM reservas WHERE id = :id LIMIT 1");
$stmt->execute([':id' => $id]);
$reserva = $stmt->fetch();
if (!$reserva) {
    http_response_code(404);
    exit('Reserva no encontrada.');
}

$nuevoEstado = $map[$accion];
$update = $pdo->prepare("UPDATE reservas SET estado = :estado, updated_at = UTC_TIMESTAMP() WHERE id = :id");
$update->execute([':estado' => $nuevoEstado, ':id' => $id]);

$holdToken = (string)($reserva['hold_token'] ?? '');
if ($holdToken !== '') {
    if (in_array($nuevoEstado, ['confirmada', 'pagada'], true)) {
        estadias_confirm_hold($holdToken);
    } elseif ($nuevoEstado === 'cancelada') {
        estadias_release_hold($holdToken);
    }
}

if ($nuevoEstado === 'pagada') {
    $start = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$reserva['check_in']);
    $end = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$reserva['check_out']);
    $nights = 1;
    if ($start && $end && $end > $start) {
        $nights = max(1, (int)$start->diff($end)->days);
    }
    estadias_record_loyalty(
        $reserva['email_cliente'] ?? '',
        $reserva['nombre_cliente'] ?? 'Huésped',
        $nights,
        'admin-reserva-' . $id . '-pagada',
        'admin_panel'
    );
}

header('Location: panel_reservas.php?estado=' . urlencode($nuevoEstado) . '&ok=1');
exit;
?>
