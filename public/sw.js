/* Pinturitas — Service Worker mínimo.
 *
 * Estrategia:
 * - Navegación / HTML: network-first, con fallback a caché para offline.
 * - Assets con hash en el nombre (JS, CSS, fuentes del build): cache-first.
 *   Son seguros porque al cambiar el contenido cambia el nombre del archivo.
 * - Imágenes de contenido (/covers, /line-art, /landing, iconos): stale-while-
 *   revalidate. Se sirven al instante desde caché PERO se revalidan en segundo
 *   plano, así una lámina o portada reemplazada (mismo nombre, contenido nuevo)
 *   se actualiza sola en la siguiente carga en vez de quedarse rancia.
 * - No intercepta OAuth ni otros orígenes.
 * - Solo se registra en producción (ver src/lib/pwa-register.ts).
 *
 * IMPORTANTE: al reemplazar assets con el mismo nombre, sube CACHE_VERSION.
 * Al activarse se borran los cachés anteriores y todo se vuelve a pedir fresco.
 */

const CACHE_VERSION = "v4-2026-08-17";
const CACHE = `pinturitas-${CACHE_VERSION}`;
const APP_SHELL = ["/", "/manifest.webmanifest"];

/** Assets del build: llevan hash en el nombre, nunca quedan rancios. */
function isHashedBuildAsset(pathname) {
  return pathname.startsWith("/assets/") || /-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|ttf)$/.test(pathname);
}

function isStaticAsset(pathname) {
  return /\.(js|css|woff2?|ttf|png|jpe?g|svg|webp|gif|ico)$/.test(pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(APP_SHELL))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/~oauth")) return; // NUNCA interceptar OAuth
  if (url.pathname.startsWith("/api/")) return;   // Endpoints no se cachean

  // HTML / navegaciones -> network-first
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  if (!isStaticAsset(url.pathname)) return;

  // Assets del build (con hash) -> cache-first
  if (isHashedBuildAsset(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      })(),
    );
    return;
  }

  // Imágenes de contenido (mismo nombre, contenido que puede cambiar)
  // -> stale-while-revalidate: rápido y además se actualiza solo.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const network = fetch(req)
        .then((fresh) => {
          if (fresh && fresh.ok) {
            caches.open(CACHE).then((c) => c.put(req, fresh.clone()).catch(() => {}));
          }
          return fresh;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(network); // revalida en segundo plano
        return cached;
      }
      return (await network) || Response.error();
    })(),
  );
});
