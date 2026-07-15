<?php
require_once __DIR__ . '/security.php';
security_bootstrap_json_api('solicitud_anfitrion', 20);

if (file_exists(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
require_once __DIR__ . '/reservation_guard.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Solicitud invalida.']);
    exit;
}

function host_clean($value, $limit = 190) {
    return substr(trim((string)$value), 0, $limit);
}

$nombre = host_clean($input['nombre'] ?? '');
$email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
$telefono = host_clean($input['telefono'] ?? '', 60);
$ciudad = host_clean($input['ciudad'] ?? '', 120);
$tipo = host_clean($input['tipo_vivienda'] ?? '', 120);
$capacidad = host_clean($input['capacidad'] ?? '', 120);
$direccion = host_clean($input['direccion'] ?? '', 190);
$mensaje = host_clean($input['mensaje'] ?? '', 1200);
$fotosUrl = host_clean($input['fotos_url'] ?? '', 4000);
$precio = trim((string)($input['precio_noche'] ?? ''));
$precioNoche = $precio === '' ? null : round((float)$precio, 2);

if (!$nombre || !$email || !$telefono || !$ciudad || !$tipo || !$capacidad || !$direccion || !$mensaje) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Completa los datos de propietario e inmueble.']);
    exit;
}

if ($precioNoche !== null && $precioNoche < 0) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'El precio sugerido no es valido.']);
    exit;
}

$pdo = estadias_get_db_connection();
if (!$pdo) {
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'No se pudo conectar con MySQL para guardar la solicitud.']);
    exit;
}

try {
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
        fotos_url TEXT NULL,
        precio_noche_usd DECIMAL(10,2) NULL,
        estado VARCHAR(40) NOT NULL DEFAULT 'en_revision',
        comision_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1100,
        iva_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1900,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_anfitrion_email (email),
        KEY idx_anfitrion_estado (estado)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $optional = [
        "ALTER TABLE solicitudes_anfitrion ADD COLUMN fotos_url TEXT NULL AFTER mensaje",
        "ALTER TABLE solicitudes_anfitrion ADD COLUMN precio_noche_usd DECIMAL(10,2) NULL AFTER fotos_url",
        "ALTER TABLE solicitudes_anfitrion ADD COLUMN comision_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1100 AFTER estado",
        "ALTER TABLE solicitudes_anfitrion ADD COLUMN iva_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1900 AFTER comision_rate",
        "ALTER TABLE solicitudes_anfitrion ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
    ];
    foreach ($optional as $sql) {
        try { $pdo->exec($sql); } catch (Throwable $e) {}
    }

    $stmt = $pdo->prepare("INSERT INTO solicitudes_anfitrion
        (nombre, email, telefono, ciudad, tipo_vivienda, capacidad, direccion, mensaje, fotos_url, precio_noche_usd, estado)
        VALUES (:nombre, :email, :telefono, :ciudad, :tipo, :capacidad, :direccion, :mensaje, :fotos_url, :precio, 'en_revision')");
    $stmt->execute([
        ':nombre' => $nombre,
        ':email' => $email,
        ':telefono' => $telefono,
        ':ciudad' => $ciudad,
        ':tipo' => $tipo,
        ':capacidad' => $capacidad,
        ':direccion' => $direccion,
        ':mensaje' => $mensaje,
        ':fotos_url' => $fotosUrl ?: null,
        ':precio' => $precioNoche,
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Solicitud de anfitrión guardada en MySQL. Ya puedes verla en tu intranet con el mismo email.',
        'id' => (int)$pdo->lastInsertId(),
        'commission' => [
            'rate' => 0.11,
            'iva_rate' => 0.19,
            'total_rate' => 0.1309
        ]
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'No se pudo guardar la solicitud de anfitrión.']);
}
?>
