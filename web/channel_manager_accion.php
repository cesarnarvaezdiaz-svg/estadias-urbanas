<?php
require_once __DIR__ . '/admin_auth.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Metodo no permitido.');
}

admin_verify_csrf($_POST['csrf_token'] ?? null);

if (file_exists(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
require_once __DIR__ . '/reservation_guard.php';

function cm_action_bootstrap_channel_schema(PDO $pdo) {
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

function cm_action_redirect($property, $startDate, $status) {
    $month = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$startDate) ? substr((string)$startDate, 0, 7) : date('Y-m');
    header('Location: channel_manager.php?propiedad=' . rawurlencode((string)$property) . '&mes=' . rawurlencode($month) . '&' . $status . '=1');
    exit;
}

function cm_action_dates($startValue, $endValue) {
    $start = estadias_parse_date($startValue);
    $end = estadias_parse_date($endValue);
    if (!$start || !$end || $end <= $start) {
        throw new InvalidArgumentException('Fechas invalidas.');
    }

    $dates = [];
    for ($cursor = $start; $cursor < $end; $cursor = $cursor->modify('+1 day')) {
        $dates[] = $cursor->format('Y-m-d');
        if (count($dates) > 365) {
            throw new InvalidArgumentException('Rango demasiado largo.');
        }
    }
    return $dates;
}

$pdo = estadias_get_db_connection();
if (!$pdo) {
    http_response_code(500);
    exit('Base de datos no configurada.');
}

estadias_bootstrap_booking_schema($pdo);
cm_action_bootstrap_channel_schema($pdo);

$action = preg_replace('/[^a-z_]/', '', (string)($_POST['accion'] ?? ''));
$property = trim((string)($_POST['propiedad'] ?? ''));
$property = substr($property, 0, 190);

if ($property === '') {
    cm_action_redirect('Apart Hotel Agustinas Plaza', $_POST['inicio'] ?? '', 'error');
}

$propertyKey = estadias_property_key($property);

try {
    $dates = cm_action_dates($_POST['inicio'] ?? '', $_POST['fin'] ?? '');

    if ($action === 'bloquear') {
        $token = bin2hex(random_bytes(32));
        $reason = trim((string)($_POST['motivo'] ?? 'Bloqueo manual'));
        $reason = substr($reason !== '' ? $reason : 'Bloqueo manual', 0, 190);

        $pdo->beginTransaction();
        $stmt = $pdo->prepare("INSERT INTO reserva_bloqueos
            (propiedad_key, propiedad_nombre, night_date, hold_token, status, source, guest_email, expires_at)
            VALUES (:propiedad_key, :propiedad, :night_date, :hold_token, 'confirmed', 'admin_block', :reason, '9999-12-31 23:59:59')");
        foreach ($dates as $date) {
            $stmt->execute([
                ':propiedad_key' => $propertyKey,
                ':propiedad' => $property,
                ':night_date' => $date,
                ':hold_token' => $token,
                ':reason' => $reason,
            ]);
        }
        $pdo->commit();
        cm_action_redirect($property, $dates[0], 'ok');
    }

    if ($action === 'desbloquear') {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("DELETE FROM reserva_bloqueos
            WHERE propiedad_key = :propiedad_key
              AND night_date = :night_date
              AND source = 'admin_block'");
        foreach ($dates as $date) {
            $stmt->execute([
                ':propiedad_key' => $propertyKey,
                ':night_date' => $date,
            ]);
        }
        $pdo->commit();
        cm_action_redirect($property, $dates[0], 'ok');
    }

    if ($action === 'tarifa') {
        $priceRaw = trim((string)($_POST['price_usd'] ?? ''));
        $price = $priceRaw === '' ? null : round((float)$priceRaw, 2);
        if ($price !== null && $price < 0) {
            throw new InvalidArgumentException('Tarifa invalida.');
        }

        $minNights = max(1, min(90, (int)($_POST['min_nights'] ?? 1)));
        $closed = isset($_POST['closed']) ? 1 : 0;
        $notes = trim((string)($_POST['notes'] ?? ''));
        $notes = $notes !== '' ? substr($notes, 0, 190) : null;

        $pdo->beginTransaction();
        $stmt = $pdo->prepare("INSERT INTO channel_tarifas
            (propiedad_key, propiedad_nombre, night_date, price_usd, min_nights, closed, notes)
            VALUES (:propiedad_key, :propiedad, :night_date, :price_usd, :min_nights, :closed, :notes)
            ON DUPLICATE KEY UPDATE
                propiedad_nombre = VALUES(propiedad_nombre),
                price_usd = VALUES(price_usd),
                min_nights = VALUES(min_nights),
                closed = VALUES(closed),
                notes = VALUES(notes),
                updated_at = CURRENT_TIMESTAMP");
        foreach ($dates as $date) {
            $stmt->execute([
                ':propiedad_key' => $propertyKey,
                ':propiedad' => $property,
                ':night_date' => $date,
                ':price_usd' => $price,
                ':min_nights' => $minNights,
                ':closed' => $closed,
                ':notes' => $notes,
            ]);
        }

        $deleteClosed = $pdo->prepare("DELETE FROM reserva_bloqueos
            WHERE propiedad_key = :propiedad_key
              AND night_date = :night_date
              AND source = 'admin_closed'");
        foreach ($dates as $date) {
            $deleteClosed->execute([
                ':propiedad_key' => $propertyKey,
                ':night_date' => $date,
            ]);
        }

        if ($closed === 1) {
            $token = bin2hex(random_bytes(32));
            $closedReason = $notes ?: 'Venta cerrada';
            $insertClosed = $pdo->prepare("INSERT INTO reserva_bloqueos
                (propiedad_key, propiedad_nombre, night_date, hold_token, status, source, guest_email, expires_at)
                VALUES (:propiedad_key, :propiedad, :night_date, :hold_token, 'confirmed', 'admin_closed', :reason, '9999-12-31 23:59:59')");
            foreach ($dates as $date) {
                $insertClosed->execute([
                    ':propiedad_key' => $propertyKey,
                    ':propiedad' => $property,
                    ':night_date' => $date,
                    ':hold_token' => $token,
                    ':reason' => $closedReason,
                ]);
            }
        }
        $pdo->commit();
        cm_action_redirect($property, $dates[0], 'ok');
    }

    cm_action_redirect($property, $dates[0] ?? '', 'error');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    cm_action_redirect($property, $_POST['inicio'] ?? '', 'error');
}
