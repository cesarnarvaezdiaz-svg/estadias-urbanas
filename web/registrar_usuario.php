<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . "/security.php";
require_once __DIR__ . "/db.php";

security_bootstrap_json_api('auth_register_ip', 8);
security_no_store();
security_start_session();

$usersTable = "`users`";
$data = json_decode(file_get_contents("php://input"), true);

if (!is_array($data)) {
    security_json_error("Solicitud invalida.", 400);
}

$name = trim($data["name"] ?? "Huésped");
$email = filter_var(strtolower(trim((string)($data["email"] ?? ""))), FILTER_VALIDATE_EMAIL);
$password = trim($data["password"] ?? "");
$phone = trim($data["phone"] ?? "");
$trap = trim((string)($data["company"] ?? ""));

if ($trap !== "") {
    echo json_encode(["status" => "success", "message" => "Usuario registrado correctamente.", "user" => ["id" => 0, "name" => "Huésped", "email" => $email ?: ""]]);
    exit;
}

if (!$email) {
    security_json_error("Email inválido.", 400);
}

if ($name === "") {
    security_json_error("Ingresa tu nombre.", 400);
}

if (strlen($email) > 190 || strlen($name) > 120 || strlen($phone) > 40) {
    security_json_error("Datos demasiado largos.", 400);
}

if (!preg_match('/^[\p{L}\p{N}\s.\'-]{2,120}$/u', $name)) {
    security_json_error("Nombre invalido.", 400);
}

if ($phone !== '' && !preg_match('/^[0-9+()\s.-]{6,40}$/', $phone)) {
    security_json_error("Celular invalido.", 400);
}

$passwordError = security_password_policy($password);
if ($passwordError) {
    security_json_error($passwordError, 400);
}

security_rate_limit('auth_register_email_' . hash('sha256', strtolower((string)$email)), 3, 900);

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

try {
    $existing = $pdo->prepare("SELECT id FROM $usersTable WHERE email = :email LIMIT 1");
    $existing->execute([":email" => $email]);

    if ($existing->fetch(PDO::FETCH_ASSOC)) {
        security_json_error("Este email ya está registrado. Inicia sesión con tu contraseña.", 409);
    }

    $stmt = $pdo->prepare("
        INSERT INTO $usersTable (name, email, password_hash, phone)
        VALUES (:name, :email, :password_hash, :phone)
    ");

    $stmt->execute([
        ":name" => $name,
        ":email" => $email,
        ":password_hash" => $passwordHash,
        ":phone" => $phone
    ]);

    session_regenerate_id(true);

    $_SESSION["user_id"] = $pdo->lastInsertId();
    $_SESSION["user_email"] = $email;
    $_SESSION["user_name"] = $name;

    echo json_encode([
        "status" => "success",
        "message" => "Usuario registrado correctamente.",
        "user" => [
            "id" => $_SESSION["user_id"],
            "name" => $name,
            "email" => $email
        ]
    ]);
    exit;
} catch (PDOException $e) {
    error_log("registrar_usuario_error: " . $e->getMessage());
    security_json_error("No se pudo completar el registro en este momento.", 500);
}
?>
