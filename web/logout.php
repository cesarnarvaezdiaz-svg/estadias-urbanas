<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . "/security.php";

security_bootstrap_json_api('auth_logout_ip', 30);
security_no_store();
security_start_session();

$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        "",
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

session_destroy();

echo json_encode([
    "status" => "success",
    "message" => "Sesión cerrada."
]);
exit;
?>
