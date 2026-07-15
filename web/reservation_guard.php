<?php
function estadias_get_db_connection() {
    $host = getenv('DB_HOST') ?: (defined('DB_HOST') ? DB_HOST : 'localhost');
    $dbname = getenv('DB_NAME') ?: (defined('DB_NAME') ? DB_NAME : '');
    $username = getenv('DB_USER') ?: (defined('DB_USER') ? DB_USER : '');
    $password = getenv('DB_PASS') ?: (defined('DB_PASS') ? DB_PASS : '');

    if ($dbname === '' || $username === '' || $password === '' || $username === 'TU_USUARIO' || $password === 'TU_PASSWORD') {
        $dbFile = __DIR__ . '/db.php';
        if (is_readable($dbFile)) {
            require $dbFile;
            if (isset($pdo) && $pdo instanceof PDO) {
                return $pdo;
            }
        }
        return null;
    }

    return new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

function estadias_storage_dir() {
    $dir = __DIR__ . DIRECTORY_SEPARATOR . 'storage';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    return $dir;
}

function estadias_normalize_key($value) {
    $value = strtolower(trim((string)$value));
    $value = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
    $value = preg_replace('/[^a-z0-9]+/', ' ', $value);
    return trim(preg_replace('/\s+/', ' ', $value));
}

function estadias_property_key($property) {
    return hash('sha256', estadias_normalize_key($property));
}

function estadias_normalize_source($source) {
    $source = preg_replace('/[^a-zA-Z0-9_.-]/', '', (string)$source);
    return substr($source ?: 'web', 0, 60);
}

function estadias_parse_date($value) {
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$value);
    $errors = DateTimeImmutable::getLastErrors();
    if (!$date || (is_array($errors) && ((int)$errors['warning_count'] > 0 || (int)$errors['error_count'] > 0))) {
        return null;
    }
    return $date;
}

function estadias_validate_stay($property, $checkIn, $checkOut, $guests) {
    $property = trim((string)$property);
    $start = estadias_parse_date($checkIn);
    $end = estadias_parse_date($checkOut);
    $guestCount = filter_var($guests, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 12]]);

    $propertyLength = function_exists('mb_strlen') ? mb_strlen($property, 'UTF-8') : strlen($property);
    if ($property === '' || $propertyLength > 190) {
        return ['ok' => false, 'message' => 'Propiedad invalida.'];
    }
    if (!$start || !$end) {
        return ['ok' => false, 'message' => 'Fechas invalidas.'];
    }
    if (!$guestCount) {
        return ['ok' => false, 'message' => 'Cantidad de huéspedes inválida.'];
    }

    $today = new DateTimeImmutable('today');
    if ($start < $today) {
        return ['ok' => false, 'message' => 'La fecha de entrada no puede ser anterior a hoy.'];
    }
    if ($end <= $start) {
        return ['ok' => false, 'message' => 'La salida debe ser posterior a la entrada.'];
    }

    $nights = (int)$start->diff($end)->days;
    if ($nights < 1 || $nights > 180) {
        return ['ok' => false, 'message' => 'La estadia debe ser de 1 a 180 noches.'];
    }

    return [
        'ok' => true,
        'property' => $property,
        'check_in' => $start->format('Y-m-d'),
        'check_out' => $end->format('Y-m-d'),
        'guests' => (int)$guestCount,
        'nights' => $nights,
        'start' => $start,
    ];
}

function estadias_night_dates(DateTimeImmutable $start, $nights) {
    $dates = [];
    for ($i = 0; $i < (int)$nights; $i++) {
        $dates[] = $start->modify('+' . $i . ' days')->format('Y-m-d');
    }
    return $dates;
}

function estadias_bootstrap_booking_schema(PDO $pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS reserva_bloqueos (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        propiedad_key CHAR(64) NOT NULL,
        propiedad_nombre VARCHAR(190) NOT NULL,
        night_date DATE NOT NULL,
        hold_token CHAR(64) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'hold',
        source VARCHAR(60) NOT NULL DEFAULT 'web',
        guest_email VARCHAR(190) NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_propiedad_night (propiedad_key, night_date),
        KEY idx_hold_token (hold_token),
        KEY idx_expires (expires_at),
        KEY idx_guest_email (guest_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS reservas (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        propiedad_nombre VARCHAR(190) NOT NULL,
        nombre_cliente VARCHAR(190) NOT NULL,
        email_cliente VARCHAR(190) NOT NULL,
        telefono_cliente VARCHAR(60) NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        huespedes INT NOT NULL,
        estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
        payment_status VARCHAR(40) NULL,
        payment_provider VARCHAR(40) NULL,
        payment_preference_id VARCHAR(120) NULL,
        mp_payment_id VARCHAR(120) NULL,
        paid_at DATETIME NULL,
        hold_token CHAR(64) NULL,
        source VARCHAR(60) NOT NULL DEFAULT 'web',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_reservas_propiedad_fechas (propiedad_nombre, check_in, check_out),
        KEY idx_reservas_email (email_cliente),
        KEY idx_reservas_hold_token (hold_token),
        KEY idx_reservas_payment_status (payment_status),
        KEY idx_reservas_mp_payment_id (mp_payment_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $optionalColumns = [
        "ALTER TABLE reserva_bloqueos ADD COLUMN source VARCHAR(60) NOT NULL DEFAULT 'web' AFTER status",
        "ALTER TABLE reserva_bloqueos ADD COLUMN guest_email VARCHAR(190) NULL AFTER source",
        "ALTER TABLE reserva_bloqueos ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
        "ALTER TABLE reserva_bloqueos ADD KEY idx_guest_email (guest_email)",
        "ALTER TABLE reservas ADD COLUMN telefono_cliente VARCHAR(60) NULL AFTER email_cliente",
        "ALTER TABLE reservas ADD COLUMN payment_status VARCHAR(40) NULL AFTER estado",
        "ALTER TABLE reservas ADD COLUMN payment_provider VARCHAR(40) NULL AFTER payment_status",
        "ALTER TABLE reservas ADD COLUMN payment_preference_id VARCHAR(120) NULL AFTER payment_provider",
        "ALTER TABLE reservas ADD COLUMN mp_payment_id VARCHAR(120) NULL AFTER payment_preference_id",
        "ALTER TABLE reservas ADD COLUMN paid_at DATETIME NULL AFTER mp_payment_id",
        "ALTER TABLE reservas ADD COLUMN hold_token CHAR(64) NULL AFTER paid_at",
        "ALTER TABLE reservas ADD COLUMN source VARCHAR(60) NOT NULL DEFAULT 'web' AFTER hold_token",
        "ALTER TABLE reservas ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
        "ALTER TABLE reservas ADD KEY idx_reservas_hold_token (hold_token)",
        "ALTER TABLE reservas ADD KEY idx_reservas_payment_status (payment_status)",
        "ALTER TABLE reservas ADD KEY idx_reservas_mp_payment_id (mp_payment_id)",
    ];

    foreach ($optionalColumns as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            // Existing HostGator tables may already have the column/key.
        }
    }
}

function estadias_insert_reservation_row(PDO $pdo, array $payload, $holdToken, $source) {
    try {
        $stmt = $pdo->prepare("INSERT INTO reservas
            (propiedad_nombre, nombre_cliente, email_cliente, telefono_cliente, check_in, check_out, huespedes, estado, hold_token, source)
            VALUES (:propiedad, :nombre, :email, :telefono, :check_in, :check_out, :huespedes, 'pendiente', :hold_token, :source)");
        $stmt->execute([
            ':propiedad' => $payload['property'],
            ':nombre' => $payload['name'] ?: 'Huésped',
            ':email' => $payload['email'] ?: 'sin-email@estadiasurbanas.com',
            ':telefono' => $payload['phone'] ?: null,
            ':check_in' => $payload['check_in'],
            ':check_out' => $payload['check_out'],
            ':huespedes' => $payload['guests'],
            ':hold_token' => $holdToken,
            ':source' => $source,
        ]);
        return (int)$pdo->lastInsertId();
    } catch (Throwable $e) {
        try {
            $stmt = $pdo->prepare("INSERT INTO reservas
                (propiedad_nombre, nombre_cliente, email_cliente, check_in, check_out, huespedes, estado)
                VALUES (:propiedad, :nombre, :email, :check_in, :check_out, :huespedes, 'pendiente')");
            $stmt->execute([
                ':propiedad' => $payload['property'],
                ':nombre' => $payload['name'] ?: 'Huésped',
                ':email' => $payload['email'] ?: 'sin-email@estadiasurbanas.com',
                ':check_in' => $payload['check_in'],
                ':check_out' => $payload['check_out'],
                ':huespedes' => $payload['guests'],
            ]);
            return (int)$pdo->lastInsertId();
        } catch (Throwable $fallback) {
            return 0;
        }
    }
}

function estadias_create_db_hold(PDO $pdo, array $payload, $source, $ttlMinutes, $recordReservation) {
    estadias_bootstrap_booking_schema($pdo);

    $token = bin2hex(random_bytes(32));
    $propertyKey = estadias_property_key($payload['property']);
    $expiresAt = gmdate('Y-m-d H:i:s', time() + ((int)$ttlMinutes * 60));
    $dates = estadias_night_dates($payload['start'], $payload['nights']);

    try {
        $pdo->beginTransaction();
        $pdo->exec("DELETE FROM reserva_bloqueos WHERE status = 'hold' AND expires_at < UTC_TIMESTAMP()");

        $stmt = $pdo->prepare("INSERT INTO reserva_bloqueos
            (propiedad_key, propiedad_nombre, night_date, hold_token, status, source, guest_email, expires_at)
            VALUES (:propiedad_key, :propiedad, :night_date, :hold_token, 'hold', :source, :guest_email, :expires_at)");

        foreach ($dates as $date) {
            $stmt->execute([
                ':propiedad_key' => $propertyKey,
                ':propiedad' => $payload['property'],
                ':night_date' => $date,
                ':hold_token' => $token,
                ':source' => $source,
                ':guest_email' => $payload['email'] ?: null,
                ':expires_at' => $expiresAt,
            ]);
        }

        $reservationId = 0;
        if ($recordReservation) {
            $reservationId = estadias_insert_reservation_row($pdo, $payload, $token, $source);
            if ($reservationId <= 0) {
                throw new RuntimeException('No se pudo crear la reserva.');
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return [
            'ok' => false,
            'http_code' => 409,
            'message' => 'Lo sentimos, esas fechas ya estan tomadas o bloqueadas para esta propiedad.',
        ];
    }

    return [
        'ok' => true,
        'hold_token' => $token,
        'expires_at' => $expiresAt,
        'nights' => $payload['nights'],
        'storage' => 'database',
        'reservation_id' => $reservationId,
    ];
}

function estadias_create_file_hold(array $payload, $source, $ttlMinutes, $recordReservation) {
    $dir = estadias_storage_dir();
    $file = $dir . DIRECTORY_SEPARATOR . 'reservation_holds.json';
    $token = bin2hex(random_bytes(32));
    $propertyKey = estadias_property_key($payload['property']);
    $expiresAt = time() + ((int)$ttlMinutes * 60);
    $dates = estadias_night_dates($payload['start'], $payload['nights']);

    $handle = @fopen($file, 'c+');
    if (!$handle) {
        return ['ok' => false, 'http_code' => 503, 'message' => 'No se pudo abrir el sistema de disponibilidad.'];
    }

    flock($handle, LOCK_EX);
    rewind($handle);
    $raw = stream_get_contents($handle);
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) $data = [];
    $holds = isset($data['holds']) && is_array($data['holds']) ? $data['holds'] : [];
    $now = time();

    $active = [];
    foreach ($holds as $hold) {
        $isExpired = ($hold['status'] ?? 'hold') === 'hold' && (int)($hold['expires_at_ts'] ?? 0) < $now;
        if (!$isExpired) $active[] = $hold;
    }

    foreach ($dates as $date) {
        foreach ($active as $hold) {
            if (($hold['property_key'] ?? '') === $propertyKey && ($hold['night_date'] ?? '') === $date) {
                flock($handle, LOCK_UN);
                fclose($handle);
                return [
                    'ok' => false,
                    'http_code' => 409,
                    'message' => 'Lo sentimos, esas fechas ya estan tomadas o bloqueadas para esta propiedad.',
                ];
            }
        }
    }

    foreach ($dates as $date) {
        $active[] = [
            'property_key' => $propertyKey,
            'property_name' => $payload['property'],
            'night_date' => $date,
            'hold_token' => $token,
            'status' => 'hold',
            'source' => $source,
            'guest_email' => $payload['email'],
            'expires_at_ts' => $expiresAt,
            'created_at' => gmdate('c'),
        ];
    }

    $data['holds'] = $active;
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    if ($recordReservation) {
        @file_put_contents(
            $dir . DIRECTORY_SEPARATOR . 'reservations.jsonl',
            json_encode([
                'hold_token' => $token,
                'reservation_id' => $token,
                'property' => $payload['property'],
                'name' => $payload['name'],
                'email' => $payload['email'],
                'phone' => $payload['phone'],
                'check_in' => $payload['check_in'],
                'check_out' => $payload['check_out'],
                'guests' => $payload['guests'],
                'source' => $source,
                'created_at' => gmdate('c'),
            ], JSON_UNESCAPED_SLASHES) . PHP_EOL,
            FILE_APPEND | LOCK_EX
        );
    }

    return [
        'ok' => true,
        'hold_token' => $token,
        'expires_at' => gmdate('Y-m-d H:i:s', $expiresAt),
        'nights' => $payload['nights'],
        'storage' => 'file',
        'reservation_id' => $recordReservation ? $token : null,
        'warning' => 'Base de datos no configurada; se uso bloqueo local con archivo protegido.',
    ];
}


function estadias_mark_reservation_payment(PDO $pdo, $holdToken, array $payment) {
    if ($holdToken === '') return false;
    estadias_bootstrap_booking_schema($pdo);
    $status = (string)($payment['status'] ?? '');
    $estado = $status === 'approved' ? 'pagada' : (in_array($status, ['cancelled', 'rejected', 'refunded', 'charged_back'], true) ? 'cancelada' : 'pendiente');
    $stmt = $pdo->prepare("UPDATE reservas SET
        estado = :estado,
        payment_status = :payment_status,
        payment_provider = 'mercadopago',
        payment_preference_id = COALESCE(:preference_id, payment_preference_id),
        mp_payment_id = COALESCE(:payment_id, mp_payment_id),
        paid_at = CASE WHEN :paid = 1 THEN COALESCE(paid_at, UTC_TIMESTAMP()) ELSE paid_at END,
        updated_at = UTC_TIMESTAMP()
        WHERE hold_token = :token");
    $stmt->execute([
        ':estado' => $estado,
        ':payment_status' => $status ?: null,
        ':preference_id' => $payment['preference_id'] ?? null,
        ':payment_id' => $payment['payment_id'] ?? null,
        ':paid' => $status === 'approved' ? 1 : 0,
        ':token' => $holdToken,
    ]);
    return $stmt->rowCount() > 0;
}

function estadias_create_booking_hold(array $input, $source = 'web', $ttlMinutes = 1440, $recordReservation = true) {
    $source = estadias_normalize_source($source);
    $validated = estadias_validate_stay(
        $input['property'] ?? '',
        $input['check_in'] ?? '',
        $input['check_out'] ?? '',
        $input['guests'] ?? 1
    );
    if (!$validated['ok']) {
        return ['ok' => false, 'http_code' => 400, 'message' => $validated['message']];
    }

    $payload = [
        'property' => $validated['property'],
        'check_in' => $validated['check_in'],
        'check_out' => $validated['check_out'],
        'guests' => $validated['guests'],
        'nights' => $validated['nights'],
        'start' => $validated['start'],
        'name' => trim((string)($input['name'] ?? '')),
        'email' => strtolower(trim((string)($input['email'] ?? ''))),
        'phone' => trim((string)($input['phone'] ?? '')),
    ];

    try {
        $pdo = estadias_get_db_connection();
        if ($pdo) {
            return estadias_create_db_hold($pdo, $payload, $source, $ttlMinutes, $recordReservation);
        }
    } catch (Throwable $e) {
        return ['ok' => false, 'http_code' => 503, 'message' => 'El sistema de disponibilidad no esta disponible.'];
    }

    return estadias_create_file_hold($payload, $source, $ttlMinutes, $recordReservation);
}

function estadias_check_booking_availability(array $input) {
    $validated = estadias_validate_stay(
        $input['property'] ?? '',
        $input['check_in'] ?? '',
        $input['check_out'] ?? '',
        $input['guests'] ?? 1
    );
    if (!$validated['ok']) {
        return ['ok' => false, 'http_code' => 400, 'message' => $validated['message']];
    }

    $propertyKey = estadias_property_key($validated['property']);
    $dates = estadias_night_dates($validated['start'], $validated['nights']);

    try {
        $pdo = estadias_get_db_connection();
        if ($pdo) {
            estadias_bootstrap_booking_schema($pdo);
            $pdo->exec("DELETE FROM reserva_bloqueos WHERE status = 'hold' AND expires_at < UTC_TIMESTAMP()");
            $stmt = $pdo->prepare("SELECT night_date, status, source
                FROM reserva_bloqueos
                WHERE propiedad_key = :propiedad_key AND night_date = :night_date
                LIMIT 1");
            foreach ($dates as $date) {
                $stmt->execute([
                    ':propiedad_key' => $propertyKey,
                    ':night_date' => $date,
                ]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($row) {
                    return [
                        'ok' => true,
                        'available' => false,
                        'storage' => 'database',
                        'message' => 'Fechas no disponibles para esta propiedad.',
                        'blocked_night' => $row['night_date'],
                        'blocked_status' => $row['status'],
                        'blocked_source' => $row['source'],
                    ];
                }
            }

            return [
                'ok' => true,
                'available' => true,
                'storage' => 'database',
                'message' => 'Fechas disponibles.',
            ];
        }
    } catch (Throwable $e) {
        return ['ok' => false, 'http_code' => 503, 'message' => 'El sistema de disponibilidad no esta disponible.'];
    }

    $file = estadias_storage_dir() . DIRECTORY_SEPARATOR . 'reservation_holds.json';
    $data = is_readable($file) ? json_decode((string)file_get_contents($file), true) : [];
    $holds = isset($data['holds']) && is_array($data['holds']) ? $data['holds'] : [];
    $now = time();

    foreach ($dates as $date) {
        foreach ($holds as $hold) {
            $isExpired = ($hold['status'] ?? 'hold') === 'hold' && (int)($hold['expires_at_ts'] ?? 0) < $now;
            if (!$isExpired && ($hold['property_key'] ?? '') === $propertyKey && ($hold['night_date'] ?? '') === $date) {
                return [
                    'ok' => true,
                    'available' => false,
                    'storage' => 'file',
                    'message' => 'Fechas no disponibles para esta propiedad.',
                    'blocked_night' => $date,
                    'blocked_status' => $hold['status'] ?? 'hold',
                    'blocked_source' => $hold['source'] ?? 'web',
                ];
            }
        }
    }

    return [
        'ok' => true,
        'available' => true,
        'storage' => 'file',
        'message' => 'Fechas disponibles.',
        'warning' => 'Base de datos no configurada; disponibilidad consultada en archivo local.',
    ];
}

function estadias_release_hold($holdToken) {
    $holdToken = preg_replace('/[^a-f0-9]/', '', (string)$holdToken);
    if ($holdToken === '') return;

    try {
        $pdo = estadias_get_db_connection();
        if ($pdo) {
            $stmt = $pdo->prepare("DELETE FROM reserva_bloqueos WHERE hold_token = :token AND status = 'hold'");
            $stmt->execute([':token' => $holdToken]);
            return;
        }
    } catch (Throwable $e) {
        return;
    }

    $file = estadias_storage_dir() . DIRECTORY_SEPARATOR . 'reservation_holds.json';
    $handle = @fopen($file, 'c+');
    if (!$handle) return;
    flock($handle, LOCK_EX);
    rewind($handle);
    $data = json_decode(stream_get_contents($handle) ?: '{}', true);
    if (!is_array($data)) $data = [];
    $holds = isset($data['holds']) && is_array($data['holds']) ? $data['holds'] : [];
    $data['holds'] = array_values(array_filter($holds, function ($hold) use ($holdToken) {
        return ($hold['hold_token'] ?? '') !== $holdToken;
    }));
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
}

function estadias_confirm_hold($holdToken) {
    $holdToken = preg_replace('/[^a-f0-9]/', '', (string)$holdToken);
    if ($holdToken === '') return false;

    try {
        $pdo = estadias_get_db_connection();
        if ($pdo) {
            $stmt = $pdo->prepare("UPDATE reserva_bloqueos
                SET status = 'confirmed', expires_at = '9999-12-31 23:59:59'
                WHERE hold_token = :token");
            $stmt->execute([':token' => $holdToken]);
            return $stmt->rowCount() > 0;
        }
    } catch (Throwable $e) {
        return false;
    }

    $file = estadias_storage_dir() . DIRECTORY_SEPARATOR . 'reservation_holds.json';
    $handle = @fopen($file, 'c+');
    if (!$handle) return false;
    flock($handle, LOCK_EX);
    rewind($handle);
    $data = json_decode(stream_get_contents($handle) ?: '{}', true);
    if (!is_array($data)) $data = [];
    $holds = isset($data['holds']) && is_array($data['holds']) ? $data['holds'] : [];
    $changed = false;
    foreach ($holds as &$hold) {
        if (($hold['hold_token'] ?? '') === $holdToken) {
            $hold['status'] = 'confirmed';
            $hold['expires_at_ts'] = 253402300799;
            $hold['confirmed_at'] = gmdate('c');
            $changed = true;
        }
    }
    unset($hold);
    $data['holds'] = $holds;
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    return $changed;
}

function estadias_price_catalog() {
    return [
        'apart hotel agustinas plaza' => 70,
        'apart hotel agustinas plaza departamento 1 o 2 personas cama doble' => 70,
        'apart hotel agustinas plaza departamento 2 personas dos camas single' => 72,
        'apart hotel agustinas plaza departamento 3 personas cama doble y single' => 92,
        'apart hotel agustinas plaza departamento 3 personas tres camas single' => 92,
        'apart hotel agustinas plaza departamento 4 personas cama doble y dos single' => 110,
        'apart hotel agustinas plaza departamento 4 personas cuatro camas single' => 118,
        'balcones de guatavita' => 70,
    ];
}

function estadias_resolve_catalog_price($title, $property) {
    $catalog = estadias_price_catalog();
    $candidates = [
        estadias_normalize_key($title),
        estadias_normalize_key($property),
    ];

    foreach ($candidates as $candidate) {
        if (isset($catalog[$candidate])) return (float)$catalog[$candidate];
    }

    foreach ($catalog as $label => $price) {
        foreach ($candidates as $candidate) {
            if ($candidate !== '' && strpos($candidate, $label) !== false) {
                return (float)$price;
            }
        }
    }

    return null;
}

function estadias_loyalty_tier($points) {
    if ($points >= 5000) return 'Black';
    if ($points >= 2000) return 'Plus';
    if ($points >= 800) return 'Preferente';
    return 'Club';
}

function estadias_record_loyalty($email, $name, $nights, $reference, $source = 'reservation') {
    $email = filter_var($email, FILTER_VALIDATE_EMAIL);
    if (!$email) return null;

    $name = trim((string)$name) ?: 'Huésped';
    $nights = max(1, (int)$nights);
    $reference = preg_replace('/[^a-zA-Z0-9_.:-]/', '', (string)$reference);
    if ($reference === '') $reference = 'ref-' . bin2hex(random_bytes(8));

    try {
        $pdo = estadias_get_db_connection();
        if ($pdo) {
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
            $pdo->exec("CREATE TABLE IF NOT EXISTS fidelizacion_movimientos (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(190) NOT NULL,
                reference VARCHAR(120) NOT NULL UNIQUE,
                source VARCHAR(60) NOT NULL,
                puntos INT NOT NULL,
                noches INT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                KEY idx_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $pdo->beginTransaction();
            $movement = $pdo->prepare("SELECT id FROM fidelizacion_movimientos WHERE reference = :reference");
            $movement->execute([':reference' => $reference]);
            if ($movement->fetch()) {
                $current = $pdo->prepare("SELECT puntos, reservas, noches, nivel FROM fidelizacion_clientes WHERE email = :email");
                $current->execute([':email' => $email]);
                $row = $current->fetch();
                $pdo->commit();
                return $row ? [
                    'points_awarded' => 0,
                    'total_points' => (int)$row['puntos'],
                    'tier' => $row['nivel'],
                    'bookings' => (int)$row['reservas'],
                    'nights' => (int)$row['noches'],
                    'duplicate' => true,
                ] : null;
            }

            $current = $pdo->prepare("SELECT puntos, reservas, noches FROM fidelizacion_clientes WHERE email = :email FOR UPDATE");
            $current->execute([':email' => $email]);
            $row = $current->fetch();
            $welcome = $row ? 0 : 250;
            $pointsAwarded = ($nights * 100) + $welcome;
            $totalPoints = (int)($row['puntos'] ?? 0) + $pointsAwarded;
            $bookings = (int)($row['reservas'] ?? 0) + 1;
            $totalNights = (int)($row['noches'] ?? 0) + $nights;
            $tier = estadias_loyalty_tier($totalPoints);

            $upsert = $pdo->prepare("INSERT INTO fidelizacion_clientes
                (email, nombre, puntos, reservas, noches, nivel, last_booking_at)
                VALUES (:email, :nombre, :puntos, :reservas, :noches, :nivel, UTC_TIMESTAMP())
                ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                puntos = VALUES(puntos),
                reservas = VALUES(reservas),
                noches = VALUES(noches),
                nivel = VALUES(nivel),
                last_booking_at = UTC_TIMESTAMP()");
            $upsert->execute([
                ':email' => $email,
                ':nombre' => $name,
                ':puntos' => $totalPoints,
                ':reservas' => $bookings,
                ':noches' => $totalNights,
                ':nivel' => $tier,
            ]);

            $insertMove = $pdo->prepare("INSERT INTO fidelizacion_movimientos
                (email, reference, source, puntos, noches)
                VALUES (:email, :reference, :source, :puntos, :noches)");
            $insertMove->execute([
                ':email' => $email,
                ':reference' => $reference,
                ':source' => $source,
                ':puntos' => $pointsAwarded,
                ':noches' => $nights,
            ]);

            $pdo->commit();
            return [
                'points_awarded' => $pointsAwarded,
                'total_points' => $totalPoints,
                'tier' => $tier,
                'bookings' => $bookings,
                'nights' => $totalNights,
                'welcome_bonus' => $welcome,
            ];
        }
    } catch (Throwable $e) {
        if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
    }

    return estadias_record_loyalty_file($email, $name, $nights, $reference, $source);
}

function estadias_record_loyalty_file($email, $name, $nights, $reference, $source) {
    $file = estadias_storage_dir() . DIRECTORY_SEPARATOR . 'loyalty.json';
    $handle = @fopen($file, 'c+');
    if (!$handle) return null;

    flock($handle, LOCK_EX);
    rewind($handle);
    $data = json_decode(stream_get_contents($handle) ?: '{}', true);
    if (!is_array($data)) $data = [];
    if (!isset($data['clients']) || !is_array($data['clients'])) $data['clients'] = [];
    if (!isset($data['movements']) || !is_array($data['movements'])) $data['movements'] = [];

    if (isset($data['movements'][$reference])) {
        $client = $data['clients'][$email] ?? null;
        flock($handle, LOCK_UN);
        fclose($handle);
        return $client ? [
            'points_awarded' => 0,
            'total_points' => (int)$client['points'],
            'tier' => $client['tier'],
            'bookings' => (int)$client['bookings'],
            'nights' => (int)$client['nights'],
            'duplicate' => true,
        ] : null;
    }

    $client = $data['clients'][$email] ?? ['name' => $name, 'points' => 0, 'bookings' => 0, 'nights' => 0, 'tier' => 'Club'];
    $welcome = ((int)$client['bookings'] === 0) ? 250 : 0;
    $pointsAwarded = ($nights * 100) + $welcome;
    $client['name'] = $name;
    $client['points'] = (int)$client['points'] + $pointsAwarded;
    $client['bookings'] = (int)$client['bookings'] + 1;
    $client['nights'] = (int)$client['nights'] + $nights;
    $client['tier'] = estadias_loyalty_tier($client['points']);
    $client['updated_at'] = gmdate('c');
    $data['clients'][$email] = $client;
    $data['movements'][$reference] = ['email' => $email, 'source' => $source, 'points' => $pointsAwarded, 'nights' => $nights, 'created_at' => gmdate('c')];

    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    return [
        'points_awarded' => $pointsAwarded,
        'total_points' => (int)$client['points'],
        'tier' => $client['tier'],
        'bookings' => (int)$client['bookings'],
        'nights' => (int)$client['nights'],
        'welcome_bonus' => $welcome,
        'storage' => 'file',
    ];
}
?>
