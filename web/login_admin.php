<?php
require_once 'admin_auth.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    security_rate_limit('admin_login', 5, 900);
    $password = $_POST['password'] ?? '';
    $hash = admin_password_hash();

    if ($hash !== '' && password_verify($password, $hash)) {
        session_regenerate_id(true);
        $_SESSION['admin_logged_in'] = true;
        header('Location: panel_reservas.php');
        exit;
    }

    $error = 'Clave invalida o ADMIN_PASSWORD_HASH no configurado.';
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Reservas - Estadias Urbanas</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; background: #091226; color: #fff; }
    form { width: min(420px, 92vw); display: grid; gap: 14px; background: #121e3a; border: 1px solid #2c3f65; border-radius: 14px; padding: 24px; }
    input, button { min-height: 44px; border-radius: 10px; border: 1px solid #2c3f65; padding: 0 12px; }
    button { background: #6ca9ff; color: #071833; font-weight: 700; cursor: pointer; }
    .error { color: #ffabab; min-height: 20px; }
  </style>
</head>
<body>
  <form method="POST">
    <h1>Panel de reservas</h1>
    <label>Clave admin<input type="password" name="password" required autofocus></label>
    <button type="submit">Ingresar</button>
    <p class="error"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
  </form>
</body>
</html>
