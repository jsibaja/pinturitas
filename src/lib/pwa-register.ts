/**
 * Registro del service worker de Pinturitas.
 *
 * Regla dura: NUNCA se registra en la preview de Lovable ni en desarrollo.
 * Solo se activa en el sitio publicado. Si detecta un entorno de preview,
 * desregistra cualquier service worker previo para evitar caché rancia.
 *
 * Soporta también `?sw=off` como interruptor de emergencia.
 */

const APP_SW_PATH = "/sw.js";

function isPreviewOrDev(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;

  try {
    if (window.self !== window.top) return true; // iframe (Lovable preview)
  } catch {
    return true;
  }

  const { hostname, search } = window.location;
  const swParam = new URLSearchParams(search).get("sw");
  if (swParam === "off") return true;

  if (hostname.startsWith("id-preview--") || hostname.startsWith("preview--")) return true;
  if (hostname === "lovableproject.com" || hostname.endsWith(".lovableproject.com")) return true;
  if (hostname === "lovableproject-dev.com" || hostname.endsWith(".lovableproject-dev.com")) return true;
  if (hostname === "beta.lovable.dev" || hostname.endsWith(".beta.lovable.dev")) return true;

  return false;
}

async function unregisterMatching(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => {
        const url = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "";
        return url.endsWith(APP_SW_PATH);
      })
      .map((r) => r.unregister()),
  );
}

export async function registerPwa(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  if (isPreviewOrDev()) {
    await unregisterMatching();
    return;
  }

  try {
    // Si ya había un service worker controlando la página y entra uno nuevo,
    // recargamos UNA vez para que el usuario vea de inmediato la versión nueva
    // (si no, se quedaría viendo assets viejos hasta cerrar la pestaña).
    if (navigator.serviceWorker.controller) {
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    }

    const reg = await navigator.serviceWorker.register(APP_SW_PATH, { scope: "/" });
    // Buscar actualizaciones al abrir y al volver a la pestaña.
    void reg.update().catch(() => {});
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void reg.update().catch(() => {});
    });
  } catch (err) {
    console.warn("[Pinturitas] No se pudo registrar el service worker:", err);
  }
}
