<?php
// Iniciamos la sesión para poder guardar al usuario logueado más adelante
session_start();

// 1. Verificamos que Google nos haya devuelto un código en la URL
if (!isset($_GET['code'])) {
    die("Error: No se recibió la autorización de Google.");
}
$codigo_temporal = $_GET['code'];

// 2. Coloca aquí tus claves exactas
// Usa variables de entorno o configuraciones seguras en lugar de hardcoded
$cliente_id = getenv('GOOGLE_CLIENT_ID') ?: '';
$secreto_cliente = getenv('GOOGLE_CLIENT_SECRET') ?: '';
$public_base = getenv('PUBLIC_BASE_URL') ?: ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
$ruta_redireccion = rtrim($public_base, '/') . '/callback_google.php';

// 3. Intercambiamos el código temporal por un Token de Acceso (usando cURL)
$url_token = 'https://oauth2.googleapis.com/token';
$datos_post = "code=" . $codigo_temporal . "&client_id=" . $cliente_id . "&client_secret=" . $secreto_cliente . "&redirect_uri=" . $ruta_redireccion . "&grant_type=authorization_code";

$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, $url_token);
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_POSTFIELDS, $datos_post);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
$respuesta_token = curl_exec($curl);
curl_close($curl);

// Transformamos el texto que nos da Google en un arreglo de PHP
$arreglo_token = json_decode($respuesta_token, true);

// Validamos que el token exista
if (!isset($arreglo_token['access_token'])) {
    die("Error: No se pudo obtener el token de Google.");
}
$token_acceso = $arreglo_token['access_token'];

// 4. Pedimos los datos del perfil usando el Token que acabamos de conseguir
$url_perfil = "https://www.googleapis.com/oauth2/v2/userinfo";
$curl_perfil = curl_init();
curl_setopt($curl_perfil, CURLOPT_URL, $url_perfil);
curl_setopt($curl_perfil, CURLOPT_RETURNTRANSFER, true);
// Enviamos el token como una llave de autorización
curl_setopt($curl_perfil, CURLOPT_HTTPHEADER, array('Authorization: Bearer ' . $token_acceso));
$respuesta_perfil = curl_exec($curl_perfil);
curl_close($curl_perfil);

$perfil_usuario = json_decode($respuesta_perfil, true);

$email_obtenido = $perfil_usuario['email'];
$nombre_obtenido = $perfil_usuario['name'];

// 5. Conexión a la Base de Datos para registrar al usuario
// Según tu imagen, tu base de datos se llama 'cesamar_estadiasurbanas'
// 5. Conexión a la Base de Datos para registrar al usuario (usa env)
$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') ?: '';
$dbName = getenv('DB_NAME') ?: 'estadias';
$conexion = new mysqli($dbHost, $dbUser, $dbPass, $dbName);

// Buscamos si este correo ya existe en tu tabla real 'users'
$consulta = "SELECT id FROM users WHERE email = '$email_obtenido'";
$resultado = $conexion->query($consulta);

if ($resultado->num_rows == 0) {
    // Si el usuario no existe, preparamos datos por defecto para los campos que Google no tiene
    $clave_por_defecto = "registro_google_sin_clave"; 
    $telefono_por_defecto = "Sin registro";
    
    // Lo guardamos directamente en tu tabla 'users'
    $sql_insertar = "INSERT INTO users (name, email, password_hash, phone) 
                     VALUES ('$nombre_obtenido', '$email_obtenido', '$clave_por_defecto', '$telefono_por_defecto')";
    $conexion->query($sql_insertar);
}

// 6. Dejamos al usuario logueado usando las variables que ya maneja tu página
$_SESSION['usuario_sesion'] = $email_obtenido;
header("Location: index.php");
exit();
?>