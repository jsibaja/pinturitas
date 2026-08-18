import { createFileRoute } from "@tanstack/react-router";

/**
 * ENDPOINT PLACEHOLDER — Envío de correos con Resend.
 *
 * NOTA de arquitectura: el brief pedía una "edge function"; en este stack
 * (TanStack Start) es un server route. Expuesto en
 * `POST /api/public/send-email`.
 *
 * IMPORTANTE: este endpoint no debe quedar abierto al público en producción.
 * Cuando se conecte, protegerlo con un header secreto (SEND_EMAIL_SECRET)
 * o limitarlo a llamadas internas desde otros server functions.
 *
 * TODO(Claude Code) — pasos para conectar:
 *
 * 1. Secretos requeridos (Project Settings → Secrets):
 *    - RESEND_API_KEY
 *    - RESEND_FROM_EMAIL      (ej: "Pinturitas <hola@pinturitas.app>")
 *    - RESEND_SENDING_DOMAIN  (opcional, para logs)
 *    - SEND_EMAIL_SECRET      (header secreto para autorizar llamadas)
 *
 * 2. Body esperado:
 *      {
 *        template_code: "welcome" | "subscription_confirmed" | "password_reset"
 *                     | "renewal_notice" | "subscription_expired",
 *        to_email: string,
 *        user_id?: string,
 *        variables: Record<string, string>   // reemplazo simple {{var}} en el HTML
 *      }
 *
 * 3. Cargar la plantilla HTML desde /emails/{template_code}.html,
 *    reemplazar {{var}} con `variables`, y enviar con Resend:
 *      await fetch("https://api.resend.com/emails", {
 *        method: "POST",
 *        headers: {
 *          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
 *          "Content-Type": "application/json",
 *        },
 *        body: JSON.stringify({ from, to, subject, html }),
 *      });
 *
 * 4. Registrar el resultado en email_log (usando supabaseAdmin):
 *    template_code, to_email, status, provider_message_id, error.
 */
export const Route = createFileRoute("/api/public/send-email")({
  server: {
    handlers: {
      POST: async () => {
        return new Response(
          JSON.stringify({
            ok: false,
            message: "send-email placeholder — pendiente de conectar con Resend",
          }),
          { status: 501, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
