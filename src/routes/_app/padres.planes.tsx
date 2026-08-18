import { createFileRoute } from "@tanstack/react-router";

/**
 * Planes / Paywall (Zona de Padres — nunca lo ve el niño).
 *
 * TODO(Claude Code):
 * - Cargar plans (3 filas: basico, pro, premium).
 * - Mostrar tabla comparativa con "Todo incluido" en las 3 columnas.
 * - Calcular equivalente mensual: price_usd / months.
 * - Calcular ahorro vs plan básico.
 * - Marcar "Mejor valor" en premium (is_best_value=true).
 * - Etiqueta "Más elegido" en pro (semestral).
 * - El estado de suscripción se lee SIEMPRE de subscriptions +
 *   has_active_subscription(user_id). NUNCA hardcodeado.
 * - Al elegir un plan: iniciar checkout de Hotmart usando hotmart_offer_code
 *   (integración pendiente).
 */
export const Route = createFileRoute("/_app/padres/planes")({
  component: PlanesPage,
  head: () => ({
    meta: [
      { title: "Planes · Pinturitas" },
      { name: "description", content: "Elige el plan que mejor se ajuste a tu familia." },
    ],
  }),
});

function PlanesPage() {
  return (
    <div className="p-6">
      <h1 className="font-display text-3xl text-ink">Planes</h1>
      <p className="mt-2 text-muted-foreground">Pantalla pendiente de implementar.</p>
    </div>
  );
}
