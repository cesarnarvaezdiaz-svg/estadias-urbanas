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

security_rate_limit('cuenta_resumen', 50, 300);
security_start_session();

if (file_exists(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
require_once __DIR__ . '/reservation_guard.php';

$email = filter_var($_GET['email'] ?? '', FILTER_VALIDATE_EMAIL);
if (!$email && !empty($_SESSION['user_email'])) {
    $email = filter_var($_SESSION['user_email'], FILTER_VALIDATE_EMAIL);
}

if (!$email) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No se pudo identificar el email de la cuenta.']);
    exit;
}

$pdo = estadias_get_db_connection();
if (!$pdo) {
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'No se pudo conectar con la base de datos.']);
    exit;
}

try {
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

    $pdo->exec("CREATE TABLE IF NOT EXISTS user_profiles (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(190) NOT NULL UNIQUE,
        billing_name VARCHAR(160) NULL,
        document_id VARCHAR(60) NULL,
        phone VARCHAR(60) NULL,
        address VARCHAR(190) NULL,
        city VARCHAR(120) NULL,
        region VARCHAR(120) NULL,
        country VARCHAR(120) NULL,
        postal_code VARCHAR(40) NULL,
        preferred_payment VARCHAR(60) NULL,
        cardholder_name VARCHAR(160) NULL,
        card_last4 VARCHAR(4) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS solicitudes_anfitrion (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(190) NOT NULL,
        email VARCHAR(190) NOT NULL,
        telefono VARCHAR(60) NOT NULL,
        ciudad VARCHAR(120) NOT NULL,
        tipo_vivienda VARCHAR(120) NOT NULL,
        capacidad VARCHAR(120) NOT NULL,
        direccion VARCHAR(190) NOT NULL,
        mensaje TEXT NOT NULL,
        fotos_url VARCHAR(600) NULL,
        precio_noche_usd DECIMAL(10,2) NULL,
        estado VARCHAR(40) NOT NULL DEFAULT 'en_revision',
        comision_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1100,
        iva_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1900,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_anfitrion_email (email),
        KEY idx_anfitrion_estado (estado)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $loyaltyStmt = $pdo->prepare("SELECT puntos, reservas, noches, nivel, last_booking_at FROM fidelizacion_clientes WHERE LOWER(email) = LOWER(:email) LIMIT 1");
    $loyaltyStmt->execute([':email' => $email]);
    $loyalty = $loyaltyStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM reservas WHERE LOWER(email_cliente) = LOWER(:email)");
    $countStmt->execute([':email' => $email]);
    $reservationCount = (int)$countStmt->fetchColumn();

    $upcomingStmt = $pdo->prepare("SELECT COUNT(*) FROM reservas
        WHERE LOWER(email_cliente) = LOWER(:email)
        AND estado IN ('pendiente', 'confirmada', 'pagada')
        AND check_out >= CURDATE()");
    $upcomingStmt->execute([':email' => $email]);
    $activeCount = (int)$upcomingStmt->fetchColumn();

    $recentStmt = $pdo->prepare("SELECT id, propiedad_nombre, check_in, check_out, huespedes, estado
        FROM reservas
        WHERE LOWER(email_cliente) = LOWER(:email)
        ORDER BY check_in DESC, created_at DESC, id DESC
        LIMIT 3");
    $recentStmt->execute([':email' => $email]);
    $recentRows = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    $profileStmt = $pdo->prepare("SELECT billing_name, document_id, phone, address, city, region, country, postal_code, preferred_payment, cardholder_name, card_last4 FROM user_profiles WHERE LOWER(email) = LOWER(:email) LIMIT 1");
    $profileStmt->execute([':email' => $email]);
    $profile = $profileStmt->fetch(PDO::FETCH_ASSOC) ?: null;

    $hostStmt = $pdo->prepare("SELECT id, nombre, telefono, ciudad, tipo_vivienda, capacidad, direccion, mensaje, fotos_url, precio_noche_usd, estado, comision_rate, iva_rate, created_at
        FROM solicitudes_anfitrion
        WHERE LOWER(email) = LOWER(:email)
        ORDER BY created_at DESC, id DESC
        LIMIT 10");
    $hostStmt->execute([':email' => $email]);
    $hostRows = $hostStmt->fetchAll(PDO::FETCH_ASSOC);

    $hostProperties = array_map(function ($row) {
        $price = $row['precio_noche_usd'] !== null ? (float)$row['precio_noche_usd'] : null;
        $commissionRate = (float)($row['comision_rate'] ?? 0.11);
        $ivaRate = (float)($row['iva_rate'] ?? 0.19);
        $commission = $price !== null ? round($price * $commissionRate, 2) : null;
        $iva = $commission !== null ? round($commission * $ivaRate, 2) : null;
        $hostNet = $price !== null ? round($price - $commission - $iva, 2) : null;
        $photos = array_values(array_filter(array_map('trim', preg_split('/[\r\n,]+/', (string)($row['fotos_url'] ?? '')))));
        return [
            'id' => (int)$row['id'],
            'title' => trim(($row['tipo_vivienda'] ?: 'Propiedad') . ' en ' . ($row['ciudad'] ?: 'revision')),
            'owner' => $row['nombre'],
            'phone' => $row['telefono'],
            'city' => $row['ciudad'],
            'type' => $row['tipo_vivienda'],
            'capacity' => $row['capacidad'],
            'address' => $row['direccion'],
            'description' => $row['mensaje'],
            'photos' => $photos,
            'price_usd' => $price,
            'status' => $row['estado'],
            'created_at' => $row['created_at'],
            'commission' => [
                'rate' => $commissionRate,
                'iva_rate' => $ivaRate,
                'total_rate' => round($commissionRate * (1 + $ivaRate), 4),
                'commission_usd' => $commission,
                'iva_usd' => $iva,
                'host_net_usd' => $hostNet,
            ],
        ];
    }, $hostRows);

    $recent = array_map(function ($row) {
        return [
            'folio' => 'EU-' . (int)$row['id'],
            'property' => $row['propiedad_nombre'],
            'check_in' => $row['check_in'],
            'check_out' => $row['check_out'],
            'guests' => (int)$row['huespedes'],
            'status' => $row['estado'],
        ];
    }, $recentRows);

    echo json_encode([
        'status' => 'success',
        'email' => $email,
        'loyalty' => [
            'points' => (int)($loyalty['puntos'] ?? 0),
            'tier' => $loyalty['nivel'] ?? 'Club',
            'bookings' => (int)($loyalty['reservas'] ?? $reservationCount),
            'nights' => (int)($loyalty['noches'] ?? 0),
            'last_booking_at' => $loyalty['last_booking_at'] ?? null,
        ],
        'reservations' => [
            'total' => $reservationCount,
            'active' => $activeCount,
            'recent' => $recent,
        ],
        'profile' => $profile,
        'host' => [
            'total' => count($hostProperties),
            'properties' => $hostProperties,
            'commission_policy' => [
                'label' => '11% comision Estadias Urbanas + IVA sobre la comision',
                'commission_rate' => 0.11,
                'iva_rate' => 0.19,
                'total_rate' => 0.1309,
            ],
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'No se pudo cargar el resumen de cuenta.']);
}
?>
