<?php
require_once __DIR__ . '/admin_auth.php';
require_admin();

if (file_exists(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
require_once __DIR__ . '/reservation_guard.php';

function h($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function status_row($label, $ok, $detail) {
    return [
        'label' => $label,
        'ok' => (bool)$ok,
        'detail' => $detail,
    ];
}

$checks = [];
$pdo = estadias_get_db_connection();
$checks[] = status_row('Conexion MySQL', $pdo instanceof PDO, $pdo instanceof PDO ? 'Base de datos conectada.' : 'No hay conexion PDO.');

if ($pdo instanceof PDO) {
    try {
        estadias_bootstrap_booking_schema($pdo);
        $checks[] = status_row('Tablas de reservas', true, 'reservas y reserva_bloqueos listas.');
    } catch (Throwable $e) {
        $checks[] = status_row('Tablas de reservas', false, $e->getMessage());
    }

    foreach (['users', 'reservas', 'reserva_bloqueos', 'fidelizacion_clientes', 'newsletter_suscriptores'] as $table) {
        try {
            $stmt = $pdo->query("SHOW TABLES LIKE " . $pdo->quote($table));
            $checks[] = status_row('Tabla ' . $table, (bool)$stmt->fetchColumn(), 'Verificacion de esquema.');
        } catch (Throwable $e) {
            $checks[] = status_row('Tabla ' . $table, false, $e->getMessage());
        }
    }
}

$checks[] = status_row('Mercado Pago', (bool)(getenv('MP_ACCESS_TOKEN') ?: (defined('MP_ACCESS_TOKEN') ? MP_ACCESS_TOKEN : '')), 'MP_ACCESS_TOKEN requerido para cobros reales.');
$checks[] = status_row('URL publica', (bool)(getenv('PUBLIC_BASE_URL') ?: getenv('MP_PUBLIC_BASE_URL')), 'Necesaria para retorno y webhook de Mercado Pago.');
$checks[] = status_row('SMTP correo', (bool)(getenv('SMTP_USER') && getenv('SMTP_PASS')), 'Necesario para correos reales.');
$checks[] = status_row('Google login', (bool)(getenv('GOOGLE_CLIENT_ID') && getenv('GOOGLE_CLIENT_SECRET')), 'Credenciales OAuth de Google.');
$checks[] = status_row('Facebook login', (bool)(getenv('FACEBOOK_CLIENT_ID') && getenv('FACEBOOK_CLIENT_SECRET')), 'Credenciales OAuth de Facebook.');
$checks[] = status_row('Apple login', (bool)(getenv('APPLE_CLIENT_ID') && getenv('APPLE_CLIENT_SECRET')), 'Credenciales OAuth de Apple.');
$checks[] = status_row('Extension cURL', function_exists('curl_init'), 'Necesaria para Mercado Pago y OAuth.');
$checks[] = status_row('Directorio storage', is_dir(__DIR__ . '/storage') ? is_writable(__DIR__ . '/storage') : is_writable(__DIR__), 'Fallback local para holds/newsletter si MySQL falla.');

$pending = 0;
foreach ($checks as $row) {
    if (!$row['ok']) $pending++;
}
$ready = $pending === 0;
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estado del sistema - Estadias Urbanas</title>
  <style>
    body { margin: 0; font-family: Inter, Arial, sans-serif; background: #05122a; color: #fff; }
    main { max-width: 1120px; margin: 0 auto; padding: 28px; }
    a { color: #fff; }
    .hero { border: 1px solid rgba(213,43,30,.58); border-radius: 12px; padding: 20px; background: rgba(15,42,87,.72); margin-bottom: 18px; }
    .status { display: inline-flex; border-radius: 999px; padding: 8px 12px; font-weight: 900; background: <?php echo $ready ? '#0f766e' : '#d52b1e'; ?>; }
    table { width: 100%; border-collapse: collapse; border: 1px solid rgba(213,43,30,.48); border-radius: 12px; overflow: hidden; background: rgba(15,42,87,.72); }
    th, td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,.12); text-align: left; }
    th { background: #071832; }
    .ok { color: #7dd3fc; font-weight: 900; }
    .bad { color: #ffb4ad; font-weight: 900; }
  </style>
</head>
<body>
<main>
  <p><a href="panel_reservas.php">Volver al panel</a></p>
  <section class="hero">
    <h1>Estado operativo</h1>
    <p class="status"><?php echo $ready ? 'Listo para operar' : 'Hay pendientes criticos'; ?></p>
  </section>
  <table>
    <thead><tr><th>Modulo</th><th>Estado</th><th>Detalle</th></tr></thead>
    <tbody>
      <?php foreach ($checks as $check): ?>
        <tr>
          <td><?php echo h($check['label']); ?></td>
          <td class="<?php echo $check['ok'] ? 'ok' : 'bad'; ?>"><?php echo $check['ok'] ? 'OK' : 'Pendiente'; ?></td>
          <td><?php echo h($check['detail']); ?></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</main>
</body>
</html>
