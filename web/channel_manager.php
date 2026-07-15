<?php
require_once __DIR__ . '/admin_auth.php';
require_admin();

if (file_exists(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
require_once __DIR__ . '/reservation_guard.php';

function cm_e($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function cm_bootstrap_channel_schema(PDO $pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS channel_tarifas (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        propiedad_key CHAR(64) NOT NULL,
        propiedad_nombre VARCHAR(190) NOT NULL,
        night_date DATE NOT NULL,
        price_usd DECIMAL(10,2) NULL,
        min_nights INT NOT NULL DEFAULT 1,
        closed TINYINT(1) NOT NULL DEFAULT 0,
        notes VARCHAR(190) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tarifa_propiedad_night (propiedad_key, night_date),
        KEY idx_tarifa_date (night_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function cm_month_from_request($value) {
    $value = preg_match('/^\d{4}-\d{2}$/', (string)$value) ? $value : date('Y-m');
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value . '-01');
    return $date ?: new DateTimeImmutable('first day of this month');
}

function cm_property_options(PDO $pdo) {
    $properties = [];
    $fallbacks = ['Apart Hotel Agustinas Plaza', 'Balcones de Guatavita'];

    foreach ([
        "SELECT DISTINCT propiedad_nombre FROM reservas WHERE propiedad_nombre <> '' ORDER BY propiedad_nombre",
        "SELECT DISTINCT propiedad_nombre FROM reserva_bloqueos WHERE propiedad_nombre <> '' ORDER BY propiedad_nombre"
    ] as $sql) {
        try {
            foreach ($pdo->query($sql)->fetchAll(PDO::FETCH_COLUMN) as $name) {
                $name = trim((string)$name);
                if ($name !== '') $properties[$name] = true;
            }
        } catch (Throwable $e) {
        }
    }

    foreach ($fallbacks as $name) {
        $properties[$name] = true;
    }

    return array_keys($properties);
}

function cm_fetch_blocks(PDO $pdo, $propertyKey, $startDate, $endDate) {
    $stmt = $pdo->prepare("SELECT night_date, status, source, guest_email
        FROM reserva_bloqueos
        WHERE propiedad_key = :propiedad_key
          AND night_date >= :start_date
          AND night_date < :end_date
        ORDER BY night_date");
    $stmt->execute([
        ':propiedad_key' => $propertyKey,
        ':start_date' => $startDate,
        ':end_date' => $endDate,
    ]);

    $map = [];
    foreach ($stmt->fetchAll() as $row) {
        $map[$row['night_date']][] = $row;
    }
    return $map;
}

function cm_fetch_rates(PDO $pdo, $propertyKey, $startDate, $endDate) {
    $stmt = $pdo->prepare("SELECT night_date, price_usd, min_nights, closed, notes
        FROM channel_tarifas
        WHERE propiedad_key = :propiedad_key
          AND night_date >= :start_date
          AND night_date < :end_date
        ORDER BY night_date");
    $stmt->execute([
        ':propiedad_key' => $propertyKey,
        ':start_date' => $startDate,
        ':end_date' => $endDate,
    ]);

    $map = [];
    foreach ($stmt->fetchAll() as $row) {
        $map[$row['night_date']] = $row;
    }
    return $map;
}

function cm_fetch_reservations(PDO $pdo, $propertyName, $startDate, $endDate) {
    $stmt = $pdo->prepare("SELECT id, nombre_cliente, email_cliente, check_in, check_out, estado, source
        FROM reservas
        WHERE propiedad_nombre = :propiedad
          AND check_in < :end_date
          AND check_out > :start_date
        ORDER BY check_in");
    $stmt->execute([
        ':propiedad' => $propertyName,
        ':start_date' => $startDate,
        ':end_date' => $endDate,
    ]);

    $map = [];
    foreach ($stmt->fetchAll() as $row) {
        for ($cursor = $startDate; $cursor < $endDate; $cursor = date('Y-m-d', strtotime($cursor . ' +1 day'))) {
            if ($cursor >= $row['check_in'] && $cursor < $row['check_out']) {
                $map[$cursor][] = $row;
            }
        }
    }
    return $map;
}

$pdo = estadias_get_db_connection();
if (!$pdo) {
    http_response_code(500);
    exit('Base de datos no configurada para el Channel Manager.');
}

estadias_bootstrap_booking_schema($pdo);
cm_bootstrap_channel_schema($pdo);

$properties = cm_property_options($pdo);
$selectedProperty = trim((string)($_GET['propiedad'] ?? ($properties[0] ?? 'Apart Hotel Agustinas Plaza')));
if ($selectedProperty === '') $selectedProperty = 'Apart Hotel Agustinas Plaza';

$month = cm_month_from_request($_GET['mes'] ?? '');
$startDate = $month->format('Y-m-01');
$endDate = $month->modify('first day of next month')->format('Y-m-d');
$prevMonth = $month->modify('-1 month')->format('Y-m');
$nextMonth = $month->modify('+1 month')->format('Y-m');
$propertyKey = estadias_property_key($selectedProperty);
$daysInMonth = (int)$month->format('t');
$firstWeekday = (int)$month->format('N');

$blocks = cm_fetch_blocks($pdo, $propertyKey, $startDate, $endDate);
$rates = cm_fetch_rates($pdo, $propertyKey, $startDate, $endDate);
$reservations = cm_fetch_reservations($pdo, $selectedProperty, $startDate, $endDate);

$blockedCount = count($blocks);
$reservedCount = count($reservations);
$pricedCount = count($rates);
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Channel Manager - Estadias Urbanas</title>
  <style>
    :root {
      --bg: #06172f;
      --panel: #102b58;
      --line: rgba(213,43,30,.72);
      --line-soft: rgba(255,255,255,.16);
      --red: #d52b1e;
      --blue: #0039a6;
      --white: #f8fbff;
      --muted: rgba(248,251,255,.76);
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; background: var(--bg); color: var(--white); }
    main { width: min(1280px, calc(100% - 32px)); margin: 0 auto; padding: 24px 0 40px; }
    a { color: var(--white); }
    .top { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { margin-bottom: 8px; font-size: clamp(1.7rem, 3vw, 2.5rem); letter-spacing: 0; }
    h2 { font-size: 1.08rem; }
    .muted { color: var(--muted); font-weight: 700; }
    .navline { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
    .navline a { display: inline-flex; align-items: center; min-height: 38px; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,.06); text-decoration: none; font-weight: 900; }
    .notice { margin: 12px 0 0; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); background: rgba(213,43,30,.16); font-weight: 900; }
    .toolbar, .forms, .legend, .calendar { border: 1px solid var(--line); border-radius: 18px; background: linear-gradient(145deg, rgba(23,58,114,.94), rgba(8,27,56,.98)); box-shadow: 0 18px 45px rgba(0,0,0,.22); }
    .toolbar { display: grid; grid-template-columns: minmax(220px, 1fr) 180px auto; gap: 12px; align-items: end; padding: 16px; margin-bottom: 16px; }
    label { display: block; color: var(--white); font-weight: 900; margin-bottom: 7px; }
    input, select { width: 100%; min-height: 44px; border: 1px solid rgba(255,255,255,.28); border-radius: 10px; padding: 10px 12px; background: #071832; color: var(--white); font: inherit; font-weight: 800; }
    input[type="checkbox"] { width: 20px; min-height: 20px; accent-color: var(--red); }
    button { min-height: 44px; border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; background: linear-gradient(115deg, #fff 0%, #0039a6 46%, #d52b1e 100%); color: var(--white); font-weight: 950; cursor: pointer; }
    .month-links { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .month-links a { min-height: 44px; padding: 11px 13px; border-radius: 10px; border: 1px solid var(--line); background: #071832; text-decoration: none; font-weight: 900; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 0 16px; }
    .stat { padding: 16px; border: 1px solid var(--line); border-radius: 16px; background: rgba(23,58,114,.78); }
    .stat strong { display: block; font-size: 2rem; color: var(--white); }
    .forms { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding: 16px; margin-bottom: 16px; }
    .form-card { padding: 14px; border: 1px solid var(--line-soft); border-radius: 14px; background: rgba(7,24,50,.62); }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .check-row { display: flex; gap: 10px; align-items: center; margin: 10px 0; font-weight: 900; }
    .legend { display: flex; gap: 10px; flex-wrap: wrap; padding: 12px; margin-bottom: 14px; }
    .tag { display: inline-flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 999px; border: 1px solid var(--line-soft); font-weight: 850; color: var(--muted); }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .free-dot { background: #f8fbff; }
    .reserved-dot { background: var(--red); }
    .blocked-dot { background: #111827; border: 1px solid #fff; }
    .priced-dot { background: var(--blue); }
    .calendar { overflow: hidden; }
    .weekday, .day { min-height: 112px; padding: 10px; border-right: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft); }
    .weekdays, .days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
    .weekday { min-height: auto; background: #05122a; color: var(--white); font-weight: 950; text-align: center; }
    .day { background: rgba(255,255,255,.045); }
    .day.empty { background: rgba(255,255,255,.015); }
    .day.reserved { background: rgba(213,43,30,.16); }
    .day.blocked { background: rgba(5,18,42,.92); }
    .day.priced { box-shadow: inset 0 0 0 2px rgba(0,57,166,.72); }
    .day-number { display: flex; justify-content: space-between; gap: 8px; align-items: center; font-size: 1.05rem; font-weight: 950; }
    .price { color: var(--white); font-size: .85rem; font-weight: 950; }
    .mini { display: block; margin-top: 7px; color: var(--muted); font-size: .78rem; font-weight: 800; line-height: 1.35; }
    .source { display: inline-block; margin-top: 7px; padding: 4px 7px; border-radius: 999px; border: 1px solid var(--line); color: var(--white); font-size: .72rem; font-weight: 950; }
    @media (max-width: 900px) {
      main { width: min(100% - 20px, 1280px); }
      .top, .toolbar, .forms, .stats { grid-template-columns: 1fr; display: grid; }
      .navline { justify-content: flex-start; }
      .calendar { overflow-x: auto; }
      .weekdays, .days { min-width: 820px; }
    }
  </style>
</head>
<body>
<main>
  <div class="top">
    <div>
      <h1>Channel Manager Interno</h1>
      <p class="muted">Administra calendario, bloqueos, reservas y tarifas. Todo queda sincronizado con web y app.</p>
      <?php if (isset($_GET['ok'])): ?><p class="notice">Cambios guardados correctamente.</p><?php endif; ?>
      <?php if (isset($_GET['error'])): ?><p class="notice">No se pudo guardar: revisa que las fechas esten libres y completas.</p><?php endif; ?>
    </div>
    <nav class="navline" aria-label="Navegacion admin">
      <a href="panel_reservas.php">Reservas</a>
      <a href="estado_sistema.php">Estado sistema</a>
      <a href="logout_admin.php">Cerrar sesión</a>
    </nav>
  </div>

  <form class="toolbar" method="GET" action="channel_manager.php">
    <div>
      <label for="propiedad">Propiedad</label>
      <select id="propiedad" name="propiedad">
        <?php foreach ($properties as $property): ?>
          <option value="<?php echo cm_e($property); ?>" <?php echo $property === $selectedProperty ? 'selected' : ''; ?>><?php echo cm_e($property); ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div>
      <label for="mes">Mes</label>
      <input id="mes" name="mes" type="month" value="<?php echo cm_e($month->format('Y-m')); ?>">
    </div>
    <div class="month-links">
      <button type="submit">Ver calendario</button>
      <a href="channel_manager.php?propiedad=<?php echo rawurlencode($selectedProperty); ?>&mes=<?php echo rawurlencode($prevMonth); ?>">Anterior</a>
      <a href="channel_manager.php?propiedad=<?php echo rawurlencode($selectedProperty); ?>&mes=<?php echo rawurlencode($nextMonth); ?>">Siguiente</a>
    </div>
  </form>

  <section class="stats" aria-label="Resumen del mes">
    <div class="stat"><strong><?php echo cm_e($reservedCount); ?></strong><span class="muted">noches con reserva</span></div>
    <div class="stat"><strong><?php echo cm_e($blockedCount); ?></strong><span class="muted">noches bloqueadas</span></div>
    <div class="stat"><strong><?php echo cm_e($pricedCount); ?></strong><span class="muted">noches con tarifa</span></div>
  </section>

  <section class="forms" aria-label="Acciones del Channel Manager">
    <form class="form-card" action="channel_manager_accion.php" method="POST">
      <h2>Bloquear fechas</h2>
      <input type="hidden" name="csrf_token" value="<?php echo cm_e(admin_csrf_token()); ?>">
      <input type="hidden" name="accion" value="bloquear">
      <input type="hidden" name="propiedad" value="<?php echo cm_e($selectedProperty); ?>">
      <div class="grid-2">
        <div><label>Desde</label><input type="date" name="inicio" required></div>
        <div><label>Hasta</label><input type="date" name="fin" required></div>
      </div>
      <label>Motivo interno</label>
      <input type="text" name="motivo" maxlength="120" placeholder="Mantencion, dueño, bloqueo preventivo">
      <button type="submit">Bloquear disponibilidad</button>
    </form>

    <form class="form-card" action="channel_manager_accion.php" method="POST">
      <h2>Liberar bloqueo</h2>
      <input type="hidden" name="csrf_token" value="<?php echo cm_e(admin_csrf_token()); ?>">
      <input type="hidden" name="accion" value="desbloquear">
      <input type="hidden" name="propiedad" value="<?php echo cm_e($selectedProperty); ?>">
      <div class="grid-2">
        <div><label>Desde</label><input type="date" name="inicio" required></div>
        <div><label>Hasta</label><input type="date" name="fin" required></div>
      </div>
      <p class="muted">Solo libera bloqueos manuales. No elimina reservas reales.</p>
      <button type="submit">Liberar fechas</button>
    </form>

    <form class="form-card" action="channel_manager_accion.php" method="POST">
      <h2>Tarifas y reglas</h2>
      <input type="hidden" name="csrf_token" value="<?php echo cm_e(admin_csrf_token()); ?>">
      <input type="hidden" name="accion" value="tarifa">
      <input type="hidden" name="propiedad" value="<?php echo cm_e($selectedProperty); ?>">
      <div class="grid-2">
        <div><label>Desde</label><input type="date" name="inicio" required></div>
        <div><label>Hasta</label><input type="date" name="fin" required></div>
      </div>
      <div class="grid-2">
        <div><label>Tarifa USD</label><input type="number" name="price_usd" min="0" step="0.01" placeholder="64"></div>
        <div><label>Min. noches</label><input type="number" name="min_nights" min="1" max="90" value="1"></div>
      </div>
      <label>Nota interna</label>
      <input type="text" name="notes" maxlength="120" placeholder="Temporada alta, promocion, evento">
      <label class="check-row"><input type="checkbox" name="closed" value="1"> Cerrar venta en estas fechas</label>
      <button type="submit">Guardar tarifa</button>
    </form>
  </section>

  <section class="legend" aria-label="Leyenda">
    <span class="tag"><span class="dot free-dot"></span> Disponible</span>
    <span class="tag"><span class="dot reserved-dot"></span> Reserva o hold real</span>
    <span class="tag"><span class="dot blocked-dot"></span> Bloqueo manual</span>
    <span class="tag"><span class="dot priced-dot"></span> Tarifa configurada</span>
  </section>

  <section class="calendar" aria-label="Calendario mensual">
    <div class="weekdays">
      <?php foreach (['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'] as $dayName): ?>
        <div class="weekday"><?php echo cm_e($dayName); ?></div>
      <?php endforeach; ?>
    </div>
    <div class="days">
      <?php for ($i = 1; $i < $firstWeekday; $i++): ?><div class="day empty"></div><?php endfor; ?>
      <?php for ($day = 1; $day <= $daysInMonth; $day++): ?>
        <?php
          $date = $month->format('Y-m-') . str_pad((string)$day, 2, '0', STR_PAD_LEFT);
          $dayBlocks = $blocks[$date] ?? [];
          $dayReservations = $reservations[$date] ?? [];
          $rate = $rates[$date] ?? null;
          $manualBlock = false;
          foreach ($dayBlocks as $block) {
              if (in_array(($block['source'] ?? ''), ['admin_block', 'admin_closed'], true)) $manualBlock = true;
          }
          $classes = ['day'];
          if ($dayBlocks || $dayReservations) $classes[] = 'reserved';
          if ($manualBlock || ($rate && (int)$rate['closed'] === 1)) $classes[] = 'blocked';
          if ($rate) $classes[] = 'priced';
        ?>
        <article class="<?php echo cm_e(implode(' ', $classes)); ?>">
          <div class="day-number">
            <span><?php echo cm_e($day); ?></span>
            <?php if ($rate && $rate['price_usd'] !== null): ?><span class="price">USD <?php echo cm_e(number_format((float)$rate['price_usd'], 0)); ?></span><?php endif; ?>
          </div>
          <?php if ($dayReservations): ?>
            <?php foreach ($dayReservations as $res): ?>
              <span class="mini">EU-<?php echo cm_e($res['id']); ?> · <?php echo cm_e($res['estado']); ?><br><?php echo cm_e($res['nombre_cliente'] ?: $res['email_cliente']); ?></span>
            <?php endforeach; ?>
          <?php endif; ?>
          <?php if ($dayBlocks): ?>
            <?php foreach ($dayBlocks as $block): ?>
              <span class="source"><?php echo cm_e(($block['source'] ?? '') === 'admin_block' ? 'Bloqueo manual' : (($block['source'] ?? '') === 'admin_closed' ? 'Venta cerrada' : ($block['source'] ?? 'web'))); ?></span>
            <?php endforeach; ?>
          <?php endif; ?>
          <?php if ($rate): ?>
            <span class="mini">Min. <?php echo cm_e($rate['min_nights']); ?> noche(s)<?php echo (int)$rate['closed'] === 1 ? ' · venta cerrada' : ''; ?></span>
            <?php if (!empty($rate['notes'])): ?><span class="mini"><?php echo cm_e($rate['notes']); ?></span><?php endif; ?>
          <?php endif; ?>
        </article>
      <?php endfor; ?>
    </div>
  </section>
</main>
</body>
</html>
