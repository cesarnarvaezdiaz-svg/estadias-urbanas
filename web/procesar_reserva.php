<?php
require_once __DIR__ . '/security.php';
security_bootstrap_json_api('procesar_reserva', 20);

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}
require_once __DIR__ . '/reservation_guard.php';

$datos = json_decode(file_get_contents('php://input'), true);
if (!is_array($datos)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No se recibieron datos validos del formulario.']);
    exit;
}

$propiedad = trim((string)($datos['propiedad'] ?? ''));
$nombre = trim((string)($datos['nombre'] ?? ''));
$email = filter_var($datos['email'] ?? '', FILTER_VALIDATE_EMAIL);
$telefono = trim((string)($datos['telefono'] ?? $datos['phone'] ?? ''));
$checkIn = trim((string)($datos['check_in'] ?? ''));
$checkOut = trim((string)($datos['check_out'] ?? ''));
$huespedes = filter_var($datos['huespedes'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 20]]);
$source = estadias_normalize_source($datos['source'] ?? 'web');
$reservationSource = $source === 'app' ? 'app_reservation_request' : 'web_reservation_request';

if ($propiedad === '' || $nombre === '' || !$email || $telefono === '' || $checkIn === '' || $checkOut === '' || !$huespedes || $checkOut <= $checkIn) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Revisa los datos de la reserva.']);
    exit;
}

function safe_text($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function normalize_phone($phone) {
    $phone = trim((string)$phone);
    $phone = preg_replace('/[^\d+]/', '', $phone);
    if (strpos($phone, '00') === 0) {
        $phone = '+' . substr($phone, 2);
    }
    if ($phone !== '' && $phone[0] !== '+') {
        $phone = '+56' . ltrim($phone, '0');
    }
    return $phone;
}

function send_booking_email($to, $toName, $subject, $htmlBody, $plainBody) {
    require_once __DIR__ . '/phpmailer/PHPMailer-master/src/Exception.php';
    require_once __DIR__ . '/phpmailer/PHPMailer-master/src/PHPMailer.php';
    require_once __DIR__ . '/phpmailer/PHPMailer-master/src/SMTP.php';

    $smtpUser = getenv('SMTP_USER') ?: '';
    $smtpPass = getenv('SMTP_PASS') ?: '';
    if ($smtpUser === '' || $smtpPass === '') {
        return ['sent' => false, 'error' => 'SMTP no configurado.'];
    }

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = getenv('SMTP_HOST') ?: 'smtp.titan.email';
        $mail->SMTPAuth = true;
        $mail->Username = $smtpUser;
        $mail->Password = $smtpPass;
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = (int)(getenv('SMTP_PORT') ?: 465);
        $mail->CharSet = 'UTF-8';

        $from = getenv('SMTP_FROM') ?: $smtpUser;
        $mail->setFrom($from, 'Estadias Urbanas');
        $mail->addAddress($to, $toName);
        $mail->addReplyTo('reservas@estadiasurbanas.com', 'Reservas Estadias Urbanas');
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->AltBody = $plainBody;
        $mail->send();
        return ['sent' => true, 'error' => ''];
    } catch (Throwable $e) {
        return ['sent' => false, 'error' => $e->getMessage()];
    }
}

function send_sms_notification($to, $message) {
    $sid = getenv('TWILIO_ACCOUNT_SID') ?: '';
    $token = getenv('TWILIO_AUTH_TOKEN') ?: '';
    $from = getenv('TWILIO_FROM_NUMBER') ?: '';
    if ($sid === '' || $token === '' || $from === '') {
        return ['sent' => false, 'error' => 'SMS no configurado.'];
    }

    $url = 'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode($sid) . '/Messages.json';
    $post = http_build_query([
        'To' => $to,
        'From' => $from,
        'Body' => $message,
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $post,
        CURLOPT_USERPWD => $sid . ':' . $token,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
    ]);
    $response = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $httpCode < 200 || $httpCode >= 300) {
        return ['sent' => false, 'error' => $curlError ?: 'Twilio HTTP ' . $httpCode];
    }
    return ['sent' => true, 'error' => ''];
}

$safeNombre = safe_text($nombre);
$safePropiedad = safe_text($propiedad);
$safeEmail = safe_text($email);
$safeTelefono = safe_text($telefono);
$safeCheckIn = safe_text($checkIn);
$safeCheckOut = safe_text($checkOut);
$safeHuespedes = safe_text($huespedes);
$phoneNormalized = normalize_phone($telefono);
$adminEmail = getenv('RESERVAS_EMAIL') ?: 'reservas@estadiasurbanas.com';

$hold = estadias_create_booking_hold([
    'property' => $propiedad,
    'name' => $nombre,
    'email' => $email,
    'phone' => $telefono,
    'check_in' => $checkIn,
    'check_out' => $checkOut,
    'guests' => $huespedes,
], $reservationSource, 1440, true);

if (!$hold['ok']) {
    http_response_code((int)($hold['http_code'] ?? 409));
    echo json_encode(['status' => 'error', 'message' => $hold['message']]);
    exit;
}

$dbSaved = true;
$dbWarning = $hold['warning'] ?? '';
$loyalty = estadias_record_loyalty($email, $nombre, (int)$hold['nights'], $hold['hold_token'], 'reservation_request');

$summaryHtml = "
<div style='font-family:Arial,sans-serif;color:#1b2a3f;line-height:1.5'>
  <h2 style='color:#07285a;margin-bottom:8px'>Solicitud de reserva recibida</h2>
  <p><strong>Propiedad:</strong> {$safePropiedad}</p>
  <p><strong>Cliente:</strong> {$safeNombre}</p>
  <p><strong>Email:</strong> {$safeEmail}</p>
  <p><strong>Celular:</strong> {$safeTelefono}</p>
  <p><strong>Check-in:</strong> {$safeCheckIn}</p>
  <p><strong>Check-out:</strong> {$safeCheckOut}</p>
  <p><strong>Huéspedes:</strong> {$safeHuespedes}</p>
</div>";

$clientHtml = "
<div style='font-family:Arial,sans-serif;color:#1b2a3f;line-height:1.5'>
  <h2 style='color:#07285a;margin-bottom:8px'>Hola {$safeNombre}, recibimos tu solicitud</h2>
  <p>Gracias por contactar a <strong>Estadias Urbanas</strong>. Recibimos tu solicitud para <strong>{$safePropiedad}</strong>.</p>
  <p><strong>Entrada:</strong> {$safeCheckIn}<br><strong>Salida:</strong> {$safeCheckOut}<br><strong>Huéspedes:</strong> {$safeHuespedes}</p>
  <p>Bloqueamos esas fechas preventivamente para evitar sobreventa mientras el equipo revisa tu solicitud.</p>
  <p>El equipo de reservas te respondera por correo o celular.</p>
  <p>Saludos,<br><strong>Estadias Urbanas</strong></p>
</div>";

$plain = "Reserva Estadías Urbanas\nPropiedad: $propiedad\nCliente: $nombre\nEmail: $email\nCelular: $telefono\nCheck-in: $checkIn\nCheck-out: $checkOut\nHuéspedes: $huespedes";

$clientEmail = send_booking_email($email, $nombre, 'Recibimos tu solicitud - Estadias Urbanas', $clientHtml, $plain);
$adminEmailResult = send_booking_email($adminEmail, 'Reservas Estadias Urbanas', 'Nueva solicitud de reserva - ' . $propiedad, $summaryHtml, $plain);
$sms = send_sms_notification($phoneNormalized, "Estadias Urbanas: recibimos tu solicitud para $propiedad del $checkIn al $checkOut. Te contactaremos pronto.");

$sentEmail = $clientEmail['sent'] && $adminEmailResult['sent'];
$reservationId = $hold['reservation_id'] ?? null;
$folio = $reservationId ? ('EU-' . $reservationId) : ('EU-' . substr((string)$hold['hold_token'], 0, 10));
$message = 'Reserva creada con folio ' . $folio . '. Fechas bloqueadas mientras nuestro equipo confirma los detalles.';
if ($sentEmail && $sms['sent']) {
    $message = 'Reserva creada con folio ' . $folio . '. Te enviamos confirmacion por correo y SMS.';
} elseif ($sentEmail) {
    $message = 'Reserva creada con folio ' . $folio . '. Te enviamos confirmacion por correo.';
} elseif ($sms['sent']) {
    $message = 'Reserva creada con folio ' . $folio . '. Te enviamos confirmacion por SMS.';
}

if (is_array($loyalty) && (int)($loyalty['points_awarded'] ?? 0) > 0) {
    $message .= ' Sumaste ' . (int)$loyalty['points_awarded'] . ' puntos Club Estadias Urbanas.';
}

echo json_encode([
    'status' => 'success',
    'message' => $message,
    'reservation_id' => $reservationId,
    'reservation_folio' => $folio,
    'hold_token' => $hold['hold_token'],
    'hold_expires_at' => $hold['expires_at'],
    'availability_storage' => $hold['storage'],
    'loyalty' => $loyalty,
    'notifications' => [
        'client_email_sent' => $clientEmail['sent'],
        'reservas_email_sent' => $adminEmailResult['sent'],
        'client_sms_sent' => $sms['sent'],
    ],
    'warnings' => array_values(array_filter([
        $dbWarning,
        $clientEmail['sent'] ? '' : $clientEmail['error'],
        $adminEmailResult['sent'] ? '' : $adminEmailResult['error'],
        $sms['sent'] ? '' : $sms['error'],
    ])),
]);
?>
