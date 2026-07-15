<?php
require_once __DIR__ . '/security.php';

security_send_common_headers();
header('Content-Type: application/json; charset=utf-8');
security_send_cors_headers('GET, POST, OPTIONS');
security_no_store();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

security_rate_limit('perfil_usuario', 40, 300);
security_start_session();

if (file_exists(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
require_once __DIR__ . '/reservation_guard.php';

function perfil_json_error(string $message, int $status = 400): void {
    http_response_code($status);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

function perfil_db(): PDO {
    $pdo = estadias_get_db_connection();
    if (!$pdo) perfil_json_error('No se pudo conectar con la base de datos.', 503);
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
    return $pdo;
}

function perfil_clean($value, int $max): string {
    $value = trim((string)$value);
    $value = preg_replace('/[\x00-\x1F\x7F]/u', '', $value);
    return substr($value, 0, $max);
}

$email = filter_var($_GET['email'] ?? ($_SESSION['user_email'] ?? ''), FILTER_VALIDATE_EMAIL);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    security_require_json_content_type();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) perfil_json_error('Solicitud invalida.');
    $email = filter_var($data['email'] ?? ($_SESSION['user_email'] ?? ''), FILTER_VALIDATE_EMAIL);
}

if (!$email) perfil_json_error('No se pudo identificar el email de la cuenta.');

$pdo = perfil_db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare("SELECT billing_name, document_id, phone, address, city, region, country, postal_code, preferred_payment, cardholder_name, card_last4 FROM user_profiles WHERE LOWER(email) = LOWER(:email) LIMIT 1");
    $stmt->execute([':email' => $email]);
    echo json_encode([
        'status' => 'success',
        'profile' => $stmt->fetch(PDO::FETCH_ASSOC) ?: null,
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Metodo no permitido.']);
    exit;
}

$profile = [
    'billing_name' => perfil_clean($data['billing_name'] ?? '', 160),
    'document_id' => perfil_clean($data['document_id'] ?? '', 60),
    'phone' => perfil_clean($data['phone'] ?? '', 60),
    'address' => perfil_clean($data['address'] ?? '', 190),
    'city' => perfil_clean($data['city'] ?? '', 120),
    'region' => perfil_clean($data['region'] ?? '', 120),
    'country' => perfil_clean($data['country'] ?? '', 120),
    'postal_code' => perfil_clean($data['postal_code'] ?? '', 40),
    'preferred_payment' => perfil_clean($data['preferred_payment'] ?? 'mercadopago', 60),
    'cardholder_name' => perfil_clean($data['cardholder_name'] ?? '', 160),
    'card_last4' => preg_replace('/[^0-9]/', '', (string)($data['card_last4'] ?? '')),
];

if ($profile['card_last4'] !== '' && strlen($profile['card_last4']) !== 4) {
    perfil_json_error('Ingresa solo los ultimos 4 digitos de la tarjeta.');
}

$stmt = $pdo->prepare("INSERT INTO user_profiles
    (email, billing_name, document_id, phone, address, city, region, country, postal_code, preferred_payment, cardholder_name, card_last4)
    VALUES (:email, :billing_name, :document_id, :phone, :address, :city, :region, :country, :postal_code, :preferred_payment, :cardholder_name, :card_last4)
    ON DUPLICATE KEY UPDATE
    billing_name = VALUES(billing_name),
    document_id = VALUES(document_id),
    phone = VALUES(phone),
    address = VALUES(address),
    city = VALUES(city),
    region = VALUES(region),
    country = VALUES(country),
    postal_code = VALUES(postal_code),
    preferred_payment = VALUES(preferred_payment),
    cardholder_name = VALUES(cardholder_name),
    card_last4 = VALUES(card_last4),
    updated_at = UTC_TIMESTAMP()");
$params = [':email' => $email];
foreach ($profile as $key => $value) {
    $params[':' . $key] = $value;
}
$stmt->execute($params);

echo json_encode([
    'status' => 'success',
    'message' => 'Perfil actualizado.',
    'profile' => $profile,
]);
?>
