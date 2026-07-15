<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

function estadias_db_value(string $envName, string $constantName, string $fallback = ''): string {
    $value = getenv($envName);
    if ($value !== false && trim((string)$value) !== '') {
        return trim((string)$value);
    }

    if (defined($constantName)) {
        $constant = trim((string)constant($constantName));
        if ($constant !== '' && $constant !== 'TU_USUARIO' && $constant !== 'TU_PASSWORD') {
            return $constant;
        }
    }

    return $fallback;
}

$host = estadias_db_value('DB_HOST', 'DB_HOST', 'localhost');
$dbname = estadias_db_value('DB_NAME', 'DB_NAME', '');
$username = estadias_db_value('DB_USER', 'DB_USER', '');
$password = estadias_db_value('DB_PASS', 'DB_PASS', '');

if ($dbname === '' || $username === '' || $password === '') {
    error_log('db_config_missing');
    http_response_code(500);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "status" => "error",
        "message" => "Base de datos no configurada en el servidor."
    ]);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    error_log("db_connection_error: " . $e->getMessage());
    http_response_code(500);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "status" => "error",
        "message" => "Base de datos no disponible temporalmente."
    ]);
    exit;
}
?>
