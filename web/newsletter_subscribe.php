<?php
require_once __DIR__ . '/security.php';
security_bootstrap_json_api('newsletter_subscribe', 12);

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}
require_once __DIR__ . '/reservation_guard.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Solicitud invalida.']);
    exit;
}

$trap = trim((string)($input['company'] ?? ''));
if ($trap !== '') {
    echo json_encode(['status' => 'success', 'message' => 'Suscripcion recibida.']);
    exit;
}

$email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
if (!$email) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Ingresa un email valido.']);
    exit;
}

$source = substr(trim((string)($input['source'] ?? 'newsletter')), 0, 80);
$city = substr(trim((string)($input['city'] ?? $input['inferredCity'] ?? '')), 0, 120);
$language = substr(trim((string)($input['language'] ?? 'es')), 0, 8);
$currency = substr(trim((string)($input['currency'] ?? 'USD')), 0, 8);
$ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '|' . (getenv('NEWSLETTER_SALT') ?: 'estadias-newsletter'));

function newsletter_store_file($email, $source, $city, $language, $currency, $ipHash) {
    $file = estadias_storage_dir() . DIRECTORY_SEPARATOR . 'newsletter_subscribers.json';
    $handle = @fopen($file, 'c+');
    if (!$handle) {
        return ['ok' => false, 'storage' => 'none', 'duplicate' => false];
    }

    flock($handle, LOCK_EX);
    rewind($handle);
    $data = json_decode(stream_get_contents($handle) ?: '{}', true);
    if (!is_array($data)) $data = [];
    if (!isset($data['subscribers']) || !is_array($data['subscribers'])) $data['subscribers'] = [];

    $duplicate = isset($data['subscribers'][$email]);
    $data['subscribers'][$email] = [
        'email' => $email,
        'source' => $source,
        'city' => $city,
        'language' => $language,
        'currency' => $currency,
        'ip_hash' => $ipHash,
        'status' => 'active',
        'subscribed_at' => $data['subscribers'][$email]['subscribed_at'] ?? gmdate('c'),
        'updated_at' => gmdate('c'),
    ];

    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    return ['ok' => true, 'storage' => 'file', 'duplicate' => $duplicate];
}

function newsletter_get_pdo() {
    $pdo = estadias_get_db_connection();
    if ($pdo instanceof PDO) return $pdo;

    if (file_exists(__DIR__ . '/db.php')) {
        require __DIR__ . '/db.php';
        if (isset($pdo) && $pdo instanceof PDO) return $pdo;
    }

    return null;
}

function newsletter_store_db($email, $source, $city, $language, $currency, $ipHash) {
    $pdo = newsletter_get_pdo();
    if (!$pdo) return null;

    $pdo->exec("CREATE TABLE IF NOT EXISTS newsletter_suscriptores (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(190) NOT NULL UNIQUE,
        source VARCHAR(80) NOT NULL,
        city VARCHAR(120) NULL,
        language_code VARCHAR(8) NOT NULL DEFAULT 'es',
        currency_code VARCHAR(8) NOT NULL DEFAULT 'USD',
        ip_hash CHAR(64) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        consent_text VARCHAR(255) NULL,
        subscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    try {
        $pdo->exec("ALTER TABLE newsletter_suscriptores ADD COLUMN consent_text VARCHAR(255) NULL");
    } catch (Throwable $e) {
        // Column already exists or the host blocks ALTER; continuing is safe.
    }

    $existing = $pdo->prepare("SELECT id FROM newsletter_suscriptores WHERE email = :email");
    $existing->execute([':email' => $email]);
    $duplicate = (bool)$existing->fetch();

    $stmt = $pdo->prepare("INSERT INTO newsletter_suscriptores
        (email, source, city, language_code, currency_code, ip_hash, status, consent_text)
        VALUES (:email, :source, :city, :language_code, :currency_code, :ip_hash, 'active', :consent_text)
        ON DUPLICATE KEY UPDATE
        source = VALUES(source),
        city = VALUES(city),
        language_code = VALUES(language_code),
        currency_code = VALUES(currency_code),
        ip_hash = VALUES(ip_hash),
        status = 'active',
        consent_text = VALUES(consent_text),
        updated_at = UTC_TIMESTAMP()");
    $stmt->execute([
        ':email' => $email,
        ':source' => $source,
        ':city' => $city ?: null,
        ':language_code' => $language,
        ':currency_code' => $currency,
        ':ip_hash' => $ipHash,
        ':consent_text' => 'Usuario solicita recibir alertas de precios y ofertas especiales de Estadias Urbanas.',
    ]);

    return ['ok' => true, 'storage' => 'database', 'duplicate' => $duplicate];
}

function newsletter_send_email($to, $toName, $replyTo, $subject, $html, $plain) {
    $smtpUser = getenv('SMTP_USER') ?: '';
    $smtpPass = getenv('SMTP_PASS') ?: '';
    if ($smtpUser !== '' && $smtpPass !== '') {
        require_once __DIR__ . '/phpmailer/PHPMailer-master/src/Exception.php';
        require_once __DIR__ . '/phpmailer/PHPMailer-master/src/PHPMailer.php';
        require_once __DIR__ . '/phpmailer/PHPMailer-master/src/SMTP.php';

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
            if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
                $mail->addReplyTo($replyTo);
            }
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $html;
            $mail->AltBody = $plain;
            $mail->send();
            return ['sent' => true, 'error' => ''];
        } catch (Throwable $e) {
            return ['sent' => false, 'error' => $e->getMessage()];
        }
    }

    $from = getenv('SMTP_FROM') ?: 'no-reply@estadiasurbanas.com';
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: Estadias Urbanas <' . $from . '>',
    ];
    if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: ' . $replyTo;
    }

    $sent = mail($to, $subject, $html, implode("\r\n", $headers));
    return ['sent' => $sent, 'error' => $sent ? '' : 'No se pudo enviar mail().'];
}

function newsletter_send_notice($email, $source, $city, $language, $currency) {
    $admin = getenv('NEWSLETTER_EMAIL') ?: getenv('REGISTROS_EMAIL') ?: getenv('ADMIN_EMAIL') ?: (defined('ADMIN_EMAIL') ? ADMIN_EMAIL : 'contacto@estadiasurbanas.com');
    if (!filter_var($admin, FILTER_VALIDATE_EMAIL)) return ['sent' => false, 'error' => 'Email admin invalido.'];

    $safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
    $safeSource = htmlspecialchars($source, ENT_QUOTES, 'UTF-8');
    $safeCity = htmlspecialchars($city ?: 'No informada', ENT_QUOTES, 'UTF-8');
    $safeLanguage = htmlspecialchars($language, ENT_QUOTES, 'UTF-8');
    $safeCurrency = htmlspecialchars($currency, ENT_QUOTES, 'UTF-8');
    $html = "<div style='font-family:Arial,sans-serif;color:#1b2a3f;line-height:1.55'>
        <h2 style='color:#07285a;margin:0 0 12px'>Nueva suscripcion</h2>
        <p><strong>Email:</strong> {$safeEmail}</p>
        <p><strong>Ciudad:</strong> {$safeCity}</p>
        <p><strong>Idioma:</strong> {$safeLanguage}</p>
        <p><strong>Moneda:</strong> {$safeCurrency}</p>
        <p><strong>Origen:</strong> {$safeSource}</p>
    </div>";
    $plain = "Nueva suscripcion Estadias Urbanas\nEmail: $email\nCiudad: $city\nIdioma: $language\nMoneda: $currency\nOrigen: $source";

    return newsletter_send_email($admin, 'Estadias Urbanas', $email, 'Nueva suscripcion - Estadias Urbanas', $html, $plain);
}

function newsletter_send_confirmation($email, $city) {
    $safeCity = htmlspecialchars($city ?: 'tus destinos favoritos', ENT_QUOTES, 'UTF-8');
    $html = "<div style='font-family:Arial,sans-serif;color:#1b2a3f;line-height:1.55'>
        <h2 style='color:#07285a;margin:0 0 12px'>Ya estas suscrito a Estadias Urbanas</h2>
        <p>Gracias por suscribirte. Te avisaremos cuando tengamos alertas de precios, novedades y ofertas especiales para <strong>{$safeCity}</strong>.</p>
        <p>Si no fuiste tu, puedes responder este correo solicitando baja de la lista.</p>
        <p style='margin-top:18px'>Saludos,<br><strong>Estadias Urbanas</strong></p>
    </div>";
    $plain = "Ya estas suscrito a Estadias Urbanas.\nTe avisaremos sobre alertas de precios y ofertas especiales.\nSi no fuiste tu, responde este correo solicitando baja.";
    $reply = getenv('NEWSLETTER_EMAIL') ?: getenv('REGISTROS_EMAIL') ?: (defined('ADMIN_EMAIL') ? ADMIN_EMAIL : 'contacto@estadiasurbanas.com');

    return newsletter_send_email($email, $email, $reply, 'Suscripcion confirmada - Estadias Urbanas', $html, $plain);
}

$stored = null;
try {
    $stored = newsletter_store_db($email, $source, $city, $language, $currency, $ipHash);
} catch (Throwable $e) {
    $stored = null;
}
if (!$stored) {
    $stored = newsletter_store_file($email, $source, $city, $language, $currency, $ipHash);
}

if (!$stored['ok']) {
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'No se pudo guardar la suscripcion.']);
    exit;
}

$notice = newsletter_send_notice($email, $source, $city, $language, $currency);
$confirmation = newsletter_send_confirmation($email, $city);
$message = $stored['duplicate']
    ? 'Ya estabas suscrito. Actualizamos tus preferencias.'
    : 'Suscripcion confirmada. Te enviamos un correo de bienvenida.';

echo json_encode([
    'status' => 'success',
    'message' => $message,
    'storage' => $stored['storage'],
    'duplicate' => $stored['duplicate'],
    'notice_sent' => $notice['sent'],
    'confirmation_sent' => $confirmation['sent'],
    'warning' => implode(' ', array_filter([
        $notice['sent'] ? '' : $notice['error'],
        $confirmation['sent'] ? '' : $confirmation['error'],
    ])),
]);
?>
