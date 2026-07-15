<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . "/security.php";
require_once __DIR__ . "/db.php";

security_bootstrap_json_api('auth_login_ip', 12);
security_no_store();
security_start_session();

$usersTable = "`users`";
$data = json_decode(file_get_contents("php://input"), true);

if (!is_array($data)) {
    security_json_error("Solicitud invalida.", 400);
}

$email = filter_var(strtolower(trim((string)($data["email"] ?? ""))), FILTER_VALIDATE_EMAIL);
$password = trim($data["password"] ?? "");

if (!$email || $password === "") {
    security_json_error("Ingresa email y contraseña.", 400);
}

security_rate_limit('auth_login_email_' . hash('sha256', strtolower((string)$email)), 6, 900);

try {
    $stmt = $pdo->prepare("SELECT * FROM $usersTable WHERE email = :email LIMIT 1");
    $stmt->execute([":email" => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user["password_hash"] ?? "")) {
        security_json_error("Email o contraseña incorrectos.", 401);
    }

    $displayName = $user["name"] ?? $user["nombre"] ?? $user["full_name"] ?? $user["nombre_completo"] ?? "Huésped";

    session_regenerate_id(true);

    $_SESSION["user_id"] = $user["id"];
    $_SESSION["user_email"] = $user["email"];
    $_SESSION["user_name"] = $displayName;

    echo json_encode([
        "status" => "success",
        "message" => "Inicio de sesión correcto.",
        "user" => [
            "id" => $user["id"],
            "name" => $displayName,
            "email" => $user["email"]
        ]
    ]);
    exit;
} catch (PDOException $e) {
    error_log("login_error: " . $e->getMessage());
    security_json_error("No se pudo iniciar sesión en este momento.", 500);
}
?>
