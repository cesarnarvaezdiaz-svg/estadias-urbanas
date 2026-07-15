# App Eurabanas — Estadías Urbanas

Aplicación móvil para Android e iOS construida con React Native, Expo SDK 57, TypeScript y Expo Router. Es una app nativa; no carga la web dentro de un WebView.

## Funciones incluidas

- Inicio y catálogo de alojamientos.
- Búsqueda por destino y cantidad de huéspedes.
- Ficha del alojamiento y tipos de departamento.
- Registro e inicio de sesión tradicional.
- Flujo OAuth con Google con validación de `id_token` en el servidor.
- Inicio de sesión con Facebook validando `access_token` contra la App ID del servidor.
- Inicio de sesión con Apple en iOS.
- Sesión móvil protegida en `SecureStore`.
- Consulta de puntos, nivel, noches y reservas.
- Reservas con folio usando la tabla `reservas` de la web.
- Consulta de disponibilidad y bloqueo anti-overbooking.
- Checkout Pro de Mercado Pago abierto en el navegador seguro del sistema, no en WebView.
- Actualización del estado de la reserva mediante el webhook que ya utiliza la web.

## Requisitos

- Node.js 22 o superior.
- npm.
- Un equipo macOS para compilar localmente iOS, o EAS Build.
- Android Studio para compilar localmente Android, o EAS Build.

## Instalación

```bash
npm install
cp .env.example .env
npm run check
npm start
```

Configura en `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://www.estadiasurbanas.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID=CLIENT_ID_GENERAL_DE_GOOGLE
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=CLIENT_ID_IOS_DE_GOOGLE
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=CLIENT_ID_ANDROID_DE_GOOGLE
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=CLIENT_ID_WEB_DE_GOOGLE
EXPO_PUBLIC_FACEBOOK_APP_ID=APP_ID_DE_FACEBOOK
EXPO_PUBLIC_ENABLE_MERCADO_PAGO=true
```

Google OAuth usa autorización nativa y validación del `id_token` en el servidor. Facebook abre el diálogo OAuth nativo, entrega un `access_token` y el servidor lo valida con `debug_token` antes de crear sesión. Apple intercambia el código de autorización en el servidor. Los tres proveedores requieren credenciales reales en sus portales; el código no inventa ni incorpora secretos.

## Sincronización con la web

Los archivos de `server-sync/` deben copiarse al directorio público donde actualmente están `db.php`, `security.php`, `oauth_config.php` y `reservation_guard.php` en HostGator:

- `mobile_bootstrap.php`
- `mobile_auth.php`
- `mobile_catalog.php`
- `mobile_account.php`
- `mobile_reservations.php`
- `mobile_profile.php`

Estos endpoints reutilizan `db.php` y las tablas existentes. Crean solamente `mobile_access_tokens` para sesiones nativas; no crean una base de datos distinta.

La app llama directamente a los endpoints existentes para disponibilidad, creación de reservas y Mercado Pago:

- `disponibilidad.php`
- `procesar_reserva.php`
- `mercadopago_preference.php`
- `mercadopago_webhook.php`

## Verificaciones

```bash
npm run typecheck
npm run check:php
npm run doctor
npm run check
```

También puede comprobarse que el paquete web de desarrollo se genera correctamente:

```bash
npx expo export --platform web
```

## Estructura principal

```text
src/app/                 pantallas y navegación
src/components/          componentes visuales reutilizables
src/context/             sesión y autenticación
src/data/                catálogo de respaldo
src/hooks/               carga de cuenta y catálogo
src/lib/                 API, fechas, colores y utilidades
server-sync/             endpoints PHP para compartir la web y MySQL
```

## Seguridad

- El token móvil se guarda cifrado mediante `expo-secure-store`.
- El servidor guarda únicamente el hash SHA-256 del token.
- Las consultas de cuenta y reservas usan el correo del usuario autenticado; la app no puede solicitar los datos de otro correo.
- Los precios se vuelven a validar en el servidor antes de crear la preferencia de Mercado Pago.
- La app puede deshabilitar el botón de pago con `EXPO_PUBLIC_ENABLE_MERCADO_PAGO=false` sin tocar el backend.
