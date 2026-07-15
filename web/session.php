<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . "/security.php";

security_send_common_headers();
header("Content-Type: application/json; charset=UTF-8");
security_send_cors_headers('GET, OPTIONS');
security_no_store();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    security_json_error("Metodo no permitido.", 405);
}

security_start_session();

if (!empty($_SESSION["user_id"]) && !empty($_SESSION["user_email"])) {
    echo json_encode([
        "status" => "success",
        "logged_in" => true,
        "user" => [
            "id" => $_SESSION["user_id"],
            "name" => $_SESSION["user_name"] ?? "Huésped",
            "email" => $_SESSION["user_email"]
        ]
    ]);
    exit;
}

echo json_encode([
    "status" => "success",
    "logged_in" => false,
    "user" => null
]);
exit;
?>
