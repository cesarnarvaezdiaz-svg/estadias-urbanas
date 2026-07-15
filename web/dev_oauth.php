<?php
// Endpoint de desarrollo para simular OAuth cuando OAUTH_MOCK=1
ini_set('display_errors', '0');
error_reporting(E_ALL);
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/oauth_config.php';
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}
require_once __DIR__ . '/oauth_db.php';

security_send_common_headers();
security_no_store();
security_start_session();

$mock = getenv('OAUTH_MOCK') ?: '0';
if ($mock !== '1') {
    header('Location: /index.html?auth_error=mock_disabled');
    exit;
}

$provider = strtolower(trim($_GET['provider'] ?? 'dev'));
$email = filter_var($_GET['email'] ?? '', FILTER_VALIDATE_EMAIL);
$name = trim((string)($_GET['name'] ?? 'Usuario Mock'));

if (!$email) {
    header('Location: /index.html?auth_error=oauth_email');
    exit;
}

$pdo = oauth_get_db_connection();
if (!$pdo) {
    header('Location: /index.html?auth_error=oauth_db');
    exit;
}

try {
    oauth_bootstrap_users_table($pdo);
    $usersTable = "`users`";
    $stmt = $pdo->prepare("SELECT id, name, email FROM $usersTable WHERE email = :email LIMIT 1");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $passwordHash = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
        $insert = $pdo->prepare("INSERT INTO $usersTable (name, email, password_hash, phone) VALUES (:name, :email, :password_hash, '')");
        $insert->execute([
            ':name' => $name,
            ':email' => $email,
            ':password_hash' => $passwordHash,
        ]);
        $user = ['id' => $pdo->lastInsertId(), 'name' => $name, 'email' => $email];
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_name'] = $user['name'] ?: $name;

    header('Location: /index.html?auth=success&mock=1');
    exit;
} catch (PDOException $e) {
    error_log('dev_oauth_error: ' . $e->getMessage());
    header('Location: /index.html?auth_error=oauth_db');
    exit;
}

?>
