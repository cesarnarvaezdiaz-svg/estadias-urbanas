<?php
require_once __DIR__ . '/security.php';
security_bootstrap_admin();
security_start_session();

function admin_is_logged_in(): bool {
    return !empty($_SESSION['admin_logged_in']);
}

function require_admin(): void {
    if (admin_is_logged_in()) {
        return;
    }

    header('Location: login_admin.php');
    exit;
}

function admin_csrf_token(): string {
    return security_csrf_token();
}

function admin_verify_csrf(?string $token): void {
    security_verify_csrf($token);
}

function admin_password_hash(): string {
    return getenv('ADMIN_PASSWORD_HASH') ?: '';
}
?>
