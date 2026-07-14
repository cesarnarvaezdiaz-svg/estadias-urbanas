<?php
declare(strict_types=1);

require_once __DIR__ . '/mobile_bootstrap.php';

$user = mobile_require_user($pdo);
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

$columns = 'billing_name, document_id, phone, address, city, region, country, postal_code, preferred_payment, cardholder_name, card_last4';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare("SELECT $columns FROM user_profiles WHERE LOWER(email) = LOWER(:email) LIMIT 1");
    $stmt->execute([':email' => $user['email']]);
    mobile_json_success(['profile' => $stmt->fetch(PDO::FETCH_ASSOC) ?: null]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') mobile_json_error('Metodo no permitido.', 405);
$input = mobile_input();
$limits = ['billing_name' => 160, 'document_id' => 60, 'phone' => 60, 'address' => 190, 'city' => 120, 'region' => 120, 'country' => 120, 'postal_code' => 40, 'preferred_payment' => 60, 'cardholder_name' => 160];
$profile = [];
foreach ($limits as $key => $limit) {
    $profile[$key] = substr(trim((string)($input[$key] ?? '')), 0, $limit);
}
$profile['card_last4'] = preg_replace('/[^0-9]/', '', (string)($input['card_last4'] ?? ''));
if ($profile['card_last4'] !== '' && strlen($profile['card_last4']) !== 4) mobile_json_error('Los ultimos digitos de la tarjeta deben ser cuatro.');

$stmt = $pdo->prepare("INSERT INTO user_profiles (email, $columns)
    VALUES (:email, :billing_name, :document_id, :phone, :address, :city, :region, :country, :postal_code, :preferred_payment, :cardholder_name, :card_last4)
    ON DUPLICATE KEY UPDATE billing_name=VALUES(billing_name), document_id=VALUES(document_id), phone=VALUES(phone), address=VALUES(address), city=VALUES(city), region=VALUES(region), country=VALUES(country), postal_code=VALUES(postal_code), preferred_payment=VALUES(preferred_payment), cardholder_name=VALUES(cardholder_name), card_last4=VALUES(card_last4), updated_at=UTC_TIMESTAMP()");
$params = [':email' => $user['email']];
foreach ($profile as $key => $value) $params[':' . $key] = $value;
$stmt->execute($params);
mobile_json_success(['profile' => $profile]);
?>
