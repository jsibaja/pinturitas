# Plantillas de correo — Pinturitas

Plantillas HTML en español neutro con la identidad "Caja de Crayones".

Cada archivo usa la sintaxis `{{variable}}` para inyectar datos desde
`src/routes/api/public/send-email.ts`. Sustitución simple con
`String.prototype.replaceAll("{{name}}", value)`.

## Archivos

| Archivo | Cuándo se envía | Variables |
|---|---|---|
| `welcome.html` | Al registrarse un usuario nuevo | `display_name` |
| `subscription-confirmed.html` | Cuando el webhook activa la suscripción | `display_name`, `plan_name`, `renews_at` |
| `password-reset.html` | Al pedir recuperación de contraseña | `display_name`, `reset_url` |
| `renewal-notice.html` | 5 días antes de que renueve la suscripción | `display_name`, `plan_name`, `renews_at`, `amount_usd` |
| `subscription-expired.html` | Cuando la suscripción caduca o falla el cobro | `display_name`, `renew_url` |

## Identidad visual

- Fondo del correo: `#FFF6EE` (papel).
- Tarjeta blanca centrada, 600px máx.
- Título: Fredoka (fallback a Georgia y serif).
- Cuerpo: Nunito (fallback a Helvetica y sans-serif).
- Primario mandarina `#FF7A3D`, secundario turquesa `#17B8B0`.
- Botones con `border-radius: 16px` y padding generoso.

Todas las plantillas deben tener versión "dark-mode safe" mediante
`prefers-color-scheme` en `<style>`, pero el CTA principal debe seguir
siendo legible en cualquier cliente de correo (varios ignoran CSS).
