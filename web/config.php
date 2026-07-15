<?php
function load_estadias_env($path) {
    if (!is_readable($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
        [$name, $value] = array_map('trim', explode('=', $line, 2));
        if ($name !== '' && getenv($name) === false) {
            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
        }
    }
}
load_estadias_env(__DIR__ . '/.env');

define('DB_HOST', 'localhost');
define('DB_NAME', 'estadiasurbanas');
define('DB_USER', 'TU_USUARIO');
define('DB_PASS', 'TU_PASSWORD');

define('ADMIN_EMAIL', 'contacto@estadiasurbanas.com');

// Mercado Pago Checkout Pro. Usa variables de entorno en produccion.
if (!defined('MP_ACCESS_TOKEN')) define('MP_ACCESS_TOKEN', getenv('MP_ACCESS_TOKEN') ?: '');
if (!defined('MP_CURRENCY')) define('MP_CURRENCY', getenv('MP_CURRENCY') ?: 'CLP');
if (!defined('MP_USD_TO_CLP')) define('MP_USD_TO_CLP', getenv('MP_USD_TO_CLP') ?: '950');
?>