# Estadías Urbanas — Web (preview)

Instrucciones para ejecutar la web localmente en modo preview (sin backend PHP local).

Requisitos mínimos

- Node.js (v18+ recomendado)

Ejecutar el servidor de preview (sirve archivos estáticos y proxys para algunos PHP):

```bash
PREVIEW_PORT=4177 PREVIEW_HOST=0.0.0.0 node preview-server.js
```

El servidor sirve `index.html` y archivos estáticos desde la carpeta `web`.
Algunas rutas PHP se proxyean hacia `https://www.estadiasurbanas.com` (ver `preview-server.js`).

Variables de entorno importantes (no subir a Git):

- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` (base de datos)
- `MP_ACCESS_TOKEN` (Mercado Pago)
- `MP_CURRENCY`, `MP_USD_TO_CLP`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `SMTP_FROM`
- `RESERVAS_EMAIL`, `REGISTROS_EMAIL`, `NEWSLETTER_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`
- `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`
- Alternativa Apple: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH` or `APPLE_PRIVATE_KEY` (PEM)

Advertencias y buenas prácticas

- No subas el archivo `.env` ni credenciales a GitHub. Se ha añadido `/web/.env` a la raíz del `.gitignore` del repo.
- Para pruebas que requieran PHP y base de datos, ejecuta un entorno local (Docker / php + MySQL) o usa el entorno de staging/productivo señalizado en `preview-server.js`.
- Revisa `CHECKLIST-PRODUCCION.md` para la lista completa de ficheros PHP que deben desplegarse en hosting.

Contacto

Si necesitas, puedo crear un `docker-compose` mínimo para levantar PHP+MySQL localmente. Pide y lo preparo.
