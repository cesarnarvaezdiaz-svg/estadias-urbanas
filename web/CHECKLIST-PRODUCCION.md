# Checklist de produccion Estadias Urbanas

## Archivos PHP que deben subirse al hosting

- `security.php`
- `config.php`
- `db.php`
- `registrar_usuario.php`
- `login.php`
- `logout.php`
- `session.php`
- `procesar_reserva.php`
- `reservation_guard.php`
- `disponibilidad.php`
- `mis_reservas.php`
- `cuenta_resumen.php`
- `perfil_usuario.php`
- `reserva_estado.php`
- `reservation-create.php`
- `reservations.php`
- `mercadopago_preference.php`
- `mercadopago_webhook.php`
- `oauth_config.php`
- `oauth_start.php`
- `oauth_callback.php`
- `oauth_status.php`
- `newsletter_subscribe.php`
- `solicitud_anfitrion.php`
- `login_admin.php`
- `logout_admin.php`
- `admin_auth.php`
- `panel_reservas.php`
- `channel_manager.php`
- `channel_manager_accion.php`
- `actualizar_estado.php`
- `estado_sistema.php`

## Variables necesarias en HostGator

- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
- `PUBLIC_BASE_URL=https://www.estadiasurbanas.com`
- `MP_ACCESS_TOKEN`
- `MP_CURRENCY=CLP`
- `MP_USD_TO_CLP`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `SMTP_FROM`
- `RESERVAS_EMAIL`, `REGISTROS_EMAIL`, `NEWSLETTER_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`
- `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`
- Alternativa Apple: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH`

## Prueba operativa despues de subir

1. Entrar a `https://www.estadiasurbanas.com/estado_sistema.php` con la clave admin.
2. Confirmar que MySQL, tablas, Mercado Pago, SMTP, cURL y OAuth aparezcan OK.
3. Registrar un usuario real.
4. Iniciar sesión y revisar que aparezca la barra de cuenta con puntos/reservas.
5. Crear una reserva.
6. Pagar con Mercado Pago.
7. Confirmar en `panel_reservas.php` que la reserva cambio a `pagada`.
8. Entrar a `channel_manager.php`, bloquear una fecha y confirmar que esa misma fecha no quede disponible en web/app.
9. Volver a la cuenta del usuario y confirmar que aumentaron puntos/reservas.
10. Probar `Mis reservas` con el email usado.
11. Probar newsletter y confirmar que llega correo.

## Puntos que dependen de cuentas externas

- Google, Facebook y Apple no pueden quedar activos sin credenciales reales en sus consolas.
- Mercado Pago no puede cobrar real sin `MP_ACCESS_TOKEN` productivo.
- Google, Apple y Facebook no pueden iniciar sesión real sin sus credenciales OAuth en `.env`.
- Usa `.env.oauth.example` como plantilla y luego revisa `https://www.estadiasurbanas.com/oauth_status.php`.
- Correos reales dependen de SMTP valido.
