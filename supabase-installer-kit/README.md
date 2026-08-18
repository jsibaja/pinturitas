# Installer Kit · Pinturitas

Todo lo necesario para levantar el backend de **Pinturitas** desde cero en un
proyecto Supabase nuevo: estructura, seguridad, funciones y **todo el
contenido** (33 mundos, 634 láminas con su traducción y pronunciación, la
paleta de 24 colores y los planes).

Generado directamente desde la base de datos en producción, así que refleja el
estado real de la app.

---

## Cómo instalarlo

En el **SQL Editor** de tu proyecto Supabase, ejecuta los archivos **en orden**.
Cada uno se puede volver a ejecutar sin romper nada (son idempotentes).

| # | Archivo | Qué hace |
|---|---------|----------|
| 1 | `01_extensions_types.sql` | Extensiones (pgcrypto) y tipos (roles, estados) |
| 2 | `02_schema.sql` | Las 19 tablas con sus llaves y relaciones |
| 3 | `03_functions_triggers.sql` | Funciones de permisos, alta de usuarios y disparadores |
| 4 | `04_rls_policies.sql` | Seguridad por fila (RLS) y privilegios |
| 5 | `05_seed_catalog.sql` | Planes, paleta de 24 colores y los 33 mundos |
| 6 | `06_seed_drawings_1..4.sql` | Las 634 láminas (en 4 partes) |
| 7 | `07_bootstrap_admin.sql` | Nombra al primer administrador (**edita el correo**) |

Después:

1. Copia `.env.example` como `.env` en la raíz del proyecto y rellena la URL y
   la clave pública de tu Supabase.
2. Copia la carpeta `public/` del repo (imágenes de las láminas y portadas).
   Las rutas de la base apuntan a `line-art/{mundo}/{slug}.png` y
   `covers/{mundo}.png`.
3. Regístrate en la app con el correo que pusiste en el paso 7 y entra a
   `/admin`.

---

## Cómo está pensada la seguridad

- **RLS en todas las tablas.** El catálogo es de solo lectura; la actividad de
  cada niño se filtra con `owns_child()`.
- **Los roles viven en su propia tabla** (`user_roles`), no en el perfil, para
  que nadie pueda ascenderse editando sus datos.
- **Jerarquía owner > admin > usuario.** Solo se gestionan cuentas de rango
  inferior y nunca la propia: así un administrador no puede desactivarse ni
  eliminarse (si se va, nadie quedaría con acceso).
- **Las operaciones de cuenta** (crear, eliminar, cambiar correo o contraseña)
  son funciones `SECURITY DEFINER` dentro de Postgres que comprueban el rol
  antes de actuar. **El navegador nunca maneja claves privilegiadas.**
- Los administradores tienen acceso a la app aunque no tengan suscripción.

> ⚠️ Ojo con dos detalles que rompen cosas si se cambian:
> - RLS filtra filas, pero **el privilegio de tabla es aparte**: sin los `GRANT`
>   de `04_rls_policies.sql`, el panel falla con "permission denied".
> - Al crear cuentas por SQL, las columnas de token de `auth.users` deben ir
>   como **cadena vacía, no NULL**, o el login falla con
>   *"Database error querying schema"*.

---

## Qué NO incluye

- **Los archivos de imagen.** Van en `public/line-art/` y `public/covers/` del
  repositorio (unas 660 imágenes).
- **Datos de usuarios reales** (cuentas, perfiles de niños, obras). El kit crea
  la estructura vacía; los usuarios se registran o se crean desde `/admin`.
- **Pagos (Hotmart) y correos (Resend).** El esquema ya tiene las tablas
  (`subscriptions`, `payment_events`, `email_log`) y las plantillas están en
  `emails/`, pero la conexión con los proveedores queda pendiente.

---

## Contenido que sí trae

| | |
|---|---|
| Mundos | **33** |
| Láminas | **634**, todas con nombre en español, inglés y pronunciación escrita |
| Palabras | **634 únicas** — ninguna se repite en toda la app |
| Colores | **24**, con nombre y pronunciación (incluye tonos de piel) |
| Planes | Mensual $4.99 y Anual $29.99 (el semestral queda inactivo) |
