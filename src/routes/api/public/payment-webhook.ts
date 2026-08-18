import { createFileRoute } from "@tanstack/react-router";

/**
 * ENDPOINT PLACEHOLDER — Webhook de Hotmart.
 *
 * NOTA de arquitectura: el brief pedía una "edge function" pero este stack
 * (TanStack Start) usa server routes para endpoints HTTP. Este archivo
 * expone `POST /api/public/payment-webhook` como URL estable para configurar
 * en el panel de Hotmart.
 *
 * TODO(Claude Code) — pasos para conectar:
 *
 * 1. Secretos requeridos (Project Settings → Secrets):
 *    - HOTMART_WEBHOOK_SECRET  (hottok / firma HMAC)
 *
 * 2. Validar la firma ANTES de procesar el body:
 *    - Leer el header que use Hotmart (p. ej. "X-Hotmart-Hottok" o firma HMAC).
 *    - Comparar con timingSafeEqual contra HOTMART_WEBHOOK_SECRET.
 *    - Si no coincide: devolver 401 y NO tocar la base.
 *
 * 3. Idempotencia: usar payload.id (o event_id) como external_id.
 *    - INSERT en payment_events (UNIQUE en external_id, ON CONFLICT DO NOTHING).
 *    - Si ya existía: devolver 200 sin re-procesar.
 *
 * 4. Actualizar `subscriptions` según event_type de Hotmart:
 *    - PURCHASE_APPROVED / SUBSCRIPTION_ACTIVATED -> status='activa',
 *      started_at, renews_at.
 *    - SUBSCRIPTION_RENEWED  -> renews_at += intervalo.
 *    - SUBSCRIPTION_CANCELLATION -> status='cancelada', canceled_at.
 *    - PURCHASE_EXPIRED / PURCHASE_PROTEST -> status='vencida'.
 *    - Guardar el payload crudo en subscriptions.raw_payload.
 *
 * 5. Usar cliente admin cargado dentro del handler:
 *      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
 *
 * 6. Registrar la URL en Hotmart:
 *      https://project--240d4f17-15ea-4abd-9590-ec230f44cbda.lovable.app/api/public/payment-webhook
 */
export const Route = createFileRoute("/api/public/payment-webhook")({
  server: {
    handlers: {
      POST: async () => {
        // Placeholder: aún no procesa nada. Devuelve 501 hasta que se conecte.
        return new Response(
          JSON.stringify({
            ok: false,
            message: "payment-webhook placeholder — pendiente de conectar con Hotmart",
          }),
          { status: 501, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
