# Pinturitas — Plan de construcción por fases

Es un proyecto grande. Como pediste guía paso a paso, lo dividiré en **fases pequeñas**. Al terminar cada una te muestro qué quedó y espero tu "sigue" antes de continuar. Todo el contenido de UI en español neutro; los identificadores en inglés.

## Supuestos que asumo (corrígeme si algo cambia)
- Backend: **Lovable Cloud** (te la activo en la Fase 1).
- Auth: solo email + contraseña, con recuperación por enlace.
- Hotmart y Resend: dejo *edge functions* y correos como **plantillas/placeholders documentados**, sin claves reales todavía.
- Las láminas (PNG de contorno y SVG de regiones) aún **no existen**: uso placeholders con la ruta exacta `line-art/{world_slug}/{slug}.png` para que después solo subas los archivos.
- TTS: `speechSynthesis` del navegador (sin servicio externo).
- Stack: TanStack Start (el que ya tiene el proyecto). PWA con manifest + service worker guardado (no rompe la preview de Lovable).

## Fases

**Fase 1 — Base y diseño**
- Activar Lovable Cloud.
- Design system "Caja de Crayones" en `src/styles.css` (tokens claros/oscuros, fuentes Fredoka + Nunito, radios, sombras).
- Shell mobile-first: tab bar inferior en móvil / sidebar en desktop, safe areas iOS, rutas vacías de las 5 secciones.
- Manifest + íconos + registro guardado del service worker (solo en producción, nunca en la preview).

**Fase 2 — Base de datos**
- Migración con TODAS las tablas descritas, RLS en todas, `GRANT` correctos.
- Funciones `owns_child`, `has_active_subscription`, trigger `handle_new_user`, triggers de `updated_at`.
- Semilla: 3 planes, 12 colores, 7 mundos, 49 láminas (con `line_art_path` calculado).

**Fase 3 — Auth y perfiles de niños**
- Registro / login / recuperar contraseña (`/reset-password`).
- Onboarding.
- Selector de perfil de niño (hasta 4), crear/editar niño (nombre, avatar, año de nacimiento, color).

**Fase 4 — Navegación de contenido**
- Pantalla **Hoy** (racha, continuar dibujo, sesión del día).
- **Mundos** (mapa con progreso circular y candado en los no-gratis, según `has_active_subscription`).
- **Detalle de mundo** (cuadrícula de láminas con estado).
- Mensaje amable cuando el niño toca un mundo bloqueado (nunca ve el paywall).

**Fase 5 — Estudio de Coloreo (el corazón)**
- 3 capas: SVG regiones + `<canvas>` trazo + PNG contorno encima.
- Herramientas: **Balde** (Path2D + `isPointInPath`, orden inverso), **Dedo** (Pointer Events, grosor, "sin salirse de la línea" con `ctx.clip()`), borrador, deshacer, limpiar, guardar.
- Reglas del lienzo: `touch-action:none`, `user-select:none`, `-webkit-tap-highlight-color:transparent`, `setPointerCapture`, ignorar punteros secundarios.
- Paleta bilingüe hablada (`speechSynthesis` en-US + es-MX), interruptor global de sonido.
- Tarjeta de palabra (EN grande, ES, fonética, botón bocina).
- Barra "X de Y partes", marca `is_completed` y celebración al terminar.
- Papel SIEMPRE `#FFFFFF`, aun en modo oscuro.

**Fase 6 — Galería, Zona de Padres, Planes**
- Galería (mural de terminados).
- Puerta con operación matemática simple.
- Panel de progreso, ajustes, tabla comparativa de planes con "Todo incluido" y ahorro calculado.
- Paywall lee de `subscriptions` + `has_active_subscription()`.

**Fase 7 — Edge functions y correos (placeholders)**
- `payment-webhook` (Hotmart): esqueleto con validación de firma pendiente e idempotencia por `external_id`.
- `send-email` (Resend): esqueleto con variables `RESEND_API_KEY` y dominio.
- Carpeta `emails/` con las 5 plantillas HTML en español neutro con la identidad visual.

## Cómo trabajaremos
Cada fase termina con un resumen corto y un "¿sigo con la Fase N+1?". Si en cualquier momento quieres cambiar el orden, o partir una fase en trozos aún más pequeños (por ejemplo dentro de la Fase 5 hacer primero solo el Balde y después el Dedo), dímelo.

¿Arranco con la **Fase 1** (activar Lovable Cloud + design system + shell + PWA)?
