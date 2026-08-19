# Pinturitas

Crea "Pinturitas": una PWA de libro para colorear digital que enseña vocabulario en inglés a niños de 3 a 6 años. El niño pinta láminas con el dedo y aprende la palabra en inglés de lo que pinta.

## IDIOMA (regla dura)
Toda la interfaz, textos, mensajes de error y correos en ESPAÑOL NEUTRO LATINOAMERICANO. Usa "tú", nunca "vos" ni "vosotros". Sin modismos regionales. Los identificadores del código (variables, tablas, componentes, archivos) van en INGLÉS.

## DISEÑO — "Caja de Crayones"
Tokens en el CSS, nada hardcodeado:
- Fondo papel: #FFF6EE · Superficie: #FFFFFF · Borde: #F0E2D4
- Primario (mandarina): #FF7A3D · Secundario (turquesa): #17B8B0 · Logros (amarillo crayón): #FFC43D
- Tinta: #2A2118 · Tinta suave: #7A6A5C
- Modo oscuro: fondo #1A1613, superficie #241E1A, tinta #F5EDE5, primario #FF8F5C
- Tipografías: Fredoka para títulos, Nunito para texto
- Bordes redondeados generosos (16-20px), sombras suaves, botones grandes.
REGLA: el lienzo de coloreo es SIEMPRE papel blanco #FFFFFF, incluso en modo oscuro. El papel nunca se invierte.

## BACKEND — activa Lovable Cloud
RLS HABILITADO EN TODAS LAS TABLAS, sin excepción.

Tablas de contenido (lectura para usuarios autenticados; escritura solo service_role):
- worlds: id, slug unique, name_es, name_en, sort_order, cover_image_path, color_hex, icon_key, is_free bool
- drawings: id, world_id fk, slug, name_es, name_en, phonetic_es, article_en, plural_en, sample_sentence_en, sample_sentence_es, fun_fact_es, line_art_path, preview_image_path, audio_path, sort_order, is_active
- palette_colors: id, hex, name_es, name_en, phonetic_es, sort_order
- achievements: id, code unique, name_es, description_es, icon_path, rule jsonb, sort_order
- plans: id, code unique, name, price_usd numeric, billing_interval, months int, is_best_value bool, hotmart_offer_code, sort_order, is_active

Tablas de usuario:
- profiles: id uuid PK ref auth.users, email, display_name, country, created_at
- children: id, parent_id fk profiles, name, avatar_key, birth_year, theme_color, created_at (hasta 4 por cuenta)
- user_settings: user_id PK fk profiles, theme, sound_enabled, music_enabled, daily_reminder_time, notifications_enabled
- subscriptions: id, user_id fk, plan_id fk, status enum('pendiente','activa','vencida','cancelada'), started_at, renews_at, canceled_at, external_reference, hotmart_offer_code, hotmart_subscriber_code, raw_payload jsonb, created_at, updated_at
- payment_events: id, subscription_id fk nullable, provider, event_type, external_id UNIQUE (idempotencia del webhook), payload jsonb, received_at
- email_log: id, user_id, template_code, to_email, status, provider_message_id, sent_at, error

Tablas de actividad (todas con child_id):
- artworks: id, child_id, drawing_id, canvas_state jsonb, thumbnail_path, is_completed, completed_at, created_at, updated_at, UNIQUE(child_id, drawing_id)
- vocab_progress: id, child_id, drawing_id, status enum('nueva','aprendiendo','dominada'), srs_box int, next_review_at, correct_count, wrong_count, last_seen_at, UNIQUE(child_id, drawing_id)
- favorites: child_id, drawing_id, created_at, PK(child_id, drawing_id)
- game_sessions: id, child_id, game_type, score, correct_count, wrong_count, duration_seconds, played_at
- child_achievements: child_id, achievement_id, unlocked_at, PK(child_id, achievement_id)
- daily_activity: id, child_id, activity_date, minutes, drawings_colored, words_reviewed, UNIQUE(child_id, activity_date)
- parent_notes: id, child_id, drawing_id nullable, body, created_at, updated_at

Funciones y triggers:
- handle_new_user(): trigger en auth.users que crea la fila en profiles y en user_settings
- owns_child(uuid) security definer: true si el child pertenece a auth.uid(). Úsala en el RLS de TODAS las tablas de actividad
- has_active_subscription(uuid) security definer: true si existe subscription status='activa' y renews_at > now()
- trigger updated_at automático donde aplique

## AUTENTICACIÓN
Registro y login con email y contraseña. Recuperación de contraseña por enlace. Sin login social.

## PLANES Y PAYWALL
Tres planes, los TRES dan acceso completo e idéntico, solo cambia la facturación:
- basico: $4.99 mensual (1 mes)
- pro: $9.00 semestral (6 meses), etiqueta "Más elegido"
- premium: $15.00 anual (12 meses), etiqueta "Mejor valor"
Muestra el equivalente mensual ($4.99, $1.50, $1.25) y el ahorro. La tabla comparativa dice "Todo incluido" en las tres columnas; el precio es la única variable.

El paywall lee SIEMPRE el estado desde la tabla subscriptions con has_active_subscription(). NUNCA hardcodeado.
Vista previa gratis: el mundo con is_free=true queda 100% usable sin pagar. Los demás se ven en el mapa con candado y miniatura difuminada.
IMPORTANTE: el niño nunca ve el paywall. Al tocar un mundo bloqueado aparece un mensaje amable ("¡Pídele a un adulto que abra este mundo!"); el muro de pago vive dentro de la Zona de Padres.

## PWA COMPLETA
manifest.json, service worker, instalable en el teléfono, ícono y splash screen, funcionamiento offline del contenido ya cargado. Registra el service worker correctamente.

## MOBILE-FIRST REAL
Debe sentirse app nativa: tab bar inferior en móvil con 5 pestañas (Hoy · Mundos · Juegos · Galería · Padres con candado), transiciones suaves, touch targets mínimo 56px, sin scroll horizontal en ninguna pantalla, safe areas de iOS respetadas (env(safe-area-inset-*)). En desktop se adapta a sidebar con las mismas secciones.

## PANTALLAS DE ESTA PRIMERA ENTREGA
1. Onboarding y creación del perfil del niño (nombre, avatar, edad)
2. Registro / Login / Recuperar contraseña
3. Selector de perfil de niño (hasta 4, avatares grandes)
4. Hoy: sesión del día, racha, continuar dibujo
5. Mundos: mapa de mundos con progreso circular y candados
6. Detalle de mundo: cuadrícula de láminas con estado
7. ESTUDIO DE COLOREO (ver abajo, es lo más importante)
8. Mi Galería: mural de dibujos terminados
9. Zona de Padres: puerta con operación matemática simple, y detrás el panel de progreso, los planes y los ajustes
10. Planes / Paywall

## ESTUDIO DE COLOREO — el corazón de la app
Tres capas apiladas dentro de un contenedor cuadrado:
1. Abajo: SVG con las regiones pintables (un <path> por parte, atributo fill)
2. En medio: <canvas> para el trazo libre del dedo
3. Arriba: la lámina de contorno en PNG con transparencia, pointer-events:none

Dos herramientas:
- BALDE (por defecto): el niño toca una parte y se rellena. Hit-test con Path2D e isPointInPath, recorriendo las regiones de la última a la primera para que gane la de encima. Se guarda en artworks.canvas_state como jsonb {region_id: color}.
- DEDO: trazo libre con Pointer Events sobre el canvas, grosor ajustable, con un interruptor "Sin salirse de la línea" que hace ctx.clip() a la región donde empezó el trazo.
Más: borrador, deshacer, limpiar, y guardar.

Detalles obligatorios del lienzo: touch-action:none, user-select:none, -webkit-tap-highlight-color:transparent, y setPointerCapture. Ignora punteros secundarios para que el apoyo de la palma no pinte.

La paleta es BILINGÜE Y HABLADA: al tocar un color se muestra "RED · rojo" y se pronuncia con speechSynthesis (voz en-US para el inglés, es-MX para el español). Un interruptor global de sonido lo desactiva.

Cada lámina muestra una tarjeta con la palabra en inglés en grande, el español debajo, la pronunciación figurada, y un botón de bocina que dice la palabra con speechSynthesis (NO uses ningún servicio de audio externo).

Barra de progreso "X de Y partes". Al pintar todas las partes: marca artworks.is_completed y muestra una celebración.

Mientras no existan las láminas reales, usa placeholders con el nombre exacto del archivo que les corresponde (line_art_path), para que al integrar las imágenes todo encaje directo.

## EDGE FUNCTIONS (placeholders documentados, no conectes nada aún)
- payment-webhook: listo para recibir el webhook de Hotmart. Valida firma, escribe en payment_events usando external_id para idempotencia, y actualiza subscriptions.
- send-email: listo para conectar Resend. Variables RESEND_API_KEY y dominio de envío.

## PLANTILLAS DE CORREO
Carpeta emails/ con plantillas HTML con la identidad visual de la app, en español neutro: bienvenida, confirmación de suscripción, recuperación de contraseña, aviso de renovación próxima, suscripción vencida.

## DATOS SEMILLA
Los 3 planes. Los 12 colores de la paleta: Red rojo, Orange naranja, Yellow amarillo, Green verde, Blue azul, Cyan celeste, Purple morado, Pink rosado, Brown café, Black negro, Grey gris, White blanco.

7 mundos (is_free solo en el primero):
1. Mis Mascotas / Pets (GRATIS) 2. La Granja / Farm Animals 3. Animales Salvajes / Wild Animals 4. El Bosque / Forest Animals 5. El Océano / Ocean Animals 6. Los que Vuelan / Animals That Fly 7. Bichos y Pequeños Amigos / Bugs & Small Creatures

49 láminas, formato es | en | fonética figurada en español:
Mascotas: Perro|Dog|dog · Gato|Cat|kat · Conejo|Rabbit|RÁ-bit · Pez dorado|Goldfish|GÓLD-fish · Hámster|Hamster|JÁMS-ter · Tortuga|Turtle|TÉR-tel · Periquito|Parakeet|PÁ-ra-kit
Granja: Vaca|Cow|káu · Cerdo|Pig|pig · Caballo|Horse|jors · Gallina|Hen|jen · Pato|Duck|dak · Oveja|Sheep|shiip · Gallo|Rooster|RÚS-ter
Salvajes: León|Lion|LÁI-on · Tigre|Tiger|TÁI-ger · Elefante|Elephant|É-le-fant · Cebra|Zebra|ZÍ-bra · Jirafa|Giraffe|lli-RAF · Hipopótamo|Hippo|JÍ-po · Rinoceronte|Rhinoceros|rai-NÓ-se-ros
Bosque: Zorro|Fox|foks · Ciervo|Deer|diir · Lobo|Wolf|wulf · Búho|Owl|ául · Ardilla|Squirrel|SKUÉ-rel · Mapache|Raccoon|ra-KÚN · Oso|Bear|ber
Océano: Delfín|Dolphin|DÓL-fin · Tiburón|Shark|shark · Pulpo|Octopus|ÓK-to-pus · Ballena|Whale|wéil · Estrella de mar|Starfish|STÁR-fish · Caballito de mar|Seahorse|SÍ-jors · Medusa|Jellyfish|LLÉ-li-fish
Vuelan: Águila|Eagle|Í-gol · Halcón|Falcon|FÁL-kon · Loro|Parrot|PÉ-rot · Colibrí|Hummingbird|JÁ-ming-berd · Murciélago|Bat|bat · Cisne|Swan|suán · Gaviota|Seagull|SÍ-gal
Bichos: Abeja|Bee|bii · Mariposa|Butterfly|BÁ-ter-flai · Hormiga|Ant|ant · Mariquita|Ladybug|LÉI-di-bag · Escarabajo|Beetle|BÍ-tel · Araña|Spider|SPÁI-der · Caracol|Snail|snéil

El slug de cada lámina es el nombre en inglés en minúsculas. line_art_path sigue el patrón line-art/{world_slug}/{slug}.png

## CÓDIGO
Limpio y modular, componentes reutilizables, nombres descriptivos. El desarrollo continuará en Claude Code sobre el repo de GitHub, así que deja la estructura ordenada y sin lógica duplicada.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fff2d611-98ae-4625-a214-97773a0a1b69).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
