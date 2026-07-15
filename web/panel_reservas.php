<?php
require_once __DIR__ . '/admin_auth.php';
require_admin();

if (file_exists(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
require_once __DIR__ . '/reservation_guard.php';

function e($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

$pdo = estadias_get_db_connection();
if (!$pdo) {
    http_response_code(500);
    exit('Base de datos no configurada para reservas.');
}
estadias_bootstrap_booking_schema($pdo);

$estado = preg_replace('/[^a-z_]/', '', (string)($_GET['estado'] ?? ''));
$allowed = ['pendiente', 'confirmada', 'pagada', 'cancelada'];
$where = in_array($estado, $allowed, true) ? 'WHERE estado = :estado' : '';
$sql = "SELECT id, propiedad_nombre, nombre_cliente, email_cliente, telefono_cliente, check_in, check_out, huespedes, estado, hold_token, source, created_at
        FROM reservas
        $where
        ORDER BY created_at DESC, id DESC
        LIMIT 250";
$stmt = $pdo->prepare($sql);
if ($where) $stmt->bindValue(':estado', $estado);
$stmt->execute();
$reservas = $stmt->fetchAll();

$counts = [];
foreach ($allowed as $item) {
    $c = $pdo->prepare("SELECT COUNT(*) FROM reservas WHERE estado = :estado");
    $c->execute([':estado' => $item]);
    $counts[$item] = (int)$c->fetchColumn();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Panel de Reservas - Estadias Urbanas</title>
  <style>
    body { margin: 0; font-family: Inter, Arial, sans-serif; background: #071832; color: #f8fbff; }
    main { padding: 24px; max-width: 1280px; margin: 0 auto; }
    a { color: #fff; }
    .top { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 18px; }
    .filters { display: flex; gap: 10px; flex-wrap: wrap; margin: 18px 0; }
    .chip { padding: 9px 12px; border: 1px solid rgba(213,43,30,.7); border-radius: 999px; text-decoration: none; background: rgba(255,255,255,.06); }
    .chip strong { color: #fff; }
    table { width: 100%; border-collapse: collapse; background: rgba(15,42,87,.9); border: 1px solid rgba(213,43,30,.45); border-radius: 10px; overflow: hidden; }
    th, td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,.12); text-align: left; vertical-align: top; }
    th { background: #05122a; color: #fff; font-size: .88rem; }
    td { color: rgba(255,255,255,.88); }
    .folio { font-weight: 900; color: #fff; }
    .estado { display: inline-block; padding: 5px 8px; border-radius: 999px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18); font-weight: 800; }
    .actions { display: grid; gap: 7px; min-width: 140px; }
    button { border: 0; border-radius: 8px; padding: 8px 10px; cursor: pointer; color: #fff; font-weight: 800; }
    .confirmar { background: #0039a6; }
    .pagar { background: #0f766e; }
    .cancelar { background: #d52b1e; }
    .empty { padding: 26px; border: 1px solid rgba(213,43,30,.45); border-radius: 10px; background: rgba(15,42,87,.72); }
    .notice { display: inline-flex; margin: 8px 0 0; padding: 10px 12px; border: 1px solid rgba(213,43,30,.45); border-radius: 10px; background: rgba(15,42,87,.72); color: #fff; font-weight: 800; }
  </style>
</head>
<body>
<main>
  <div class="top">
    <div>
      <h1>Panel de Reservas</h1>
      <p>Reservas reales guardadas en MySQL.</p>
      <?php if (isset($_GET['ok'])): ?>
        <p class="notice">Estado actualizado correctamente.</p>
      <?php endif; ?>
    </div>
    <p><a href="channel_manager.php">Channel Manager</a> · <a href="estado_sistema.php">Estado sistema</a> · <a href="logout_admin.php">Cerrar sesión</a></p>
  </div>

  <nav class="filters" aria-label="Filtros de estado">
    <a class="chip" href="panel_reservas.php">Todas</a>
    <?php foreach ($allowed as $item): ?>
      <a class="chip" href="panel_reservas.php?estado=<?php echo e($item); ?>"><?php echo e(ucfirst($item)); ?> <strong><?php echo e($counts[$item] ?? 0); ?></strong></a>
    <?php endforeach; ?>
  </nav>

  <?php if (!$reservas): ?>
    <div class="empty">No hay reservas para este filtro.</div>
  <?php else: ?>
    <table>
      <thead>
        <tr>
          <th>Folio</th>
          <th>Propiedad</th>
          <th>Cliente</th>
          <th>Fechas</th>
          <th>Estado</th>
          <th>Fuente</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
      <?php foreach ($reservas as $reserva): ?>
        <tr>
          <td class="folio">EU-<?php echo e($reserva['id']); ?></td>
          <td><?php echo e($reserva['propiedad_nombre']); ?></td>
          <td>
            <strong><?php echo e($reserva['nombre_cliente']); ?></strong><br>
            <?php echo e($reserva['email_cliente']); ?><br>
            <?php echo e($reserva['telefono_cliente'] ?? ''); ?>
          </td>
          <td><?php echo e($reserva['check_in']); ?> al <?php echo e($reserva['check_out']); ?><br><?php echo e($reserva['huespedes']); ?> huésped(es)</td>
          <td><span class="estado"><?php echo e($reserva['estado']); ?></span></td>
          <td><?php echo e($reserva['source'] ?? 'web'); ?><br><small><?php echo e($reserva['created_at']); ?></small></td>
          <td>
            <div class="actions">
              <form action="actualizar_estado.php" method="POST">
                <input type="hidden" name="id_reserva" value="<?php echo e($reserva['id']); ?>">
                <input type="hidden" name="accion" value="confirmar">
                <input type="hidden" name="csrf_token" value="<?php echo e(admin_csrf_token()); ?>">
                <button class="confirmar" type="submit">Confirmar</button>
              </form>
              <form action="actualizar_estado.php" method="POST">
                <input type="hidden" name="id_reserva" value="<?php echo e($reserva['id']); ?>">
                <input type="hidden" name="accion" value="pagada">
                <input type="hidden" name="csrf_token" value="<?php echo e(admin_csrf_token()); ?>">
                <button class="pagar" type="submit">Marcar pagada</button>
              </form>
              <form action="actualizar_estado.php" method="POST">
                <input type="hidden" name="id_reserva" value="<?php echo e($reserva['id']); ?>">
                <input type="hidden" name="accion" value="cancelar">
                <input type="hidden" name="csrf_token" value="<?php echo e(admin_csrf_token()); ?>">
                <button class="cancelar" type="submit">Cancelar</button>
              </form>
            </div>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  <?php endif; ?>
</main>
</body>
</html>
