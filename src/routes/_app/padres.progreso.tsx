import { createFileRoute } from "@tanstack/react-router";

/**
 * Panel de progreso del niño (Zona de Padres).
 *
 * TODO(Claude Code):
 * - Selector de niño (si hay varios).
 * - Racha, minutos por día (daily_activity), dibujos completados.
 * - Palabras aprendiendo / dominadas (vocab_progress agrupado por status).
 * - Logros desbloqueados (child_achievements JOIN achievements).
 * - Gráfica semanal de actividad.
 * - Requiere haber cruzado la puerta /padres.
 */
export const Route = createFileRoute("/_app/padres/progreso")({
  component: ProgresoPage,
  head: () => ({
    meta: [
      { title: "Progreso · Pinturitas" },
      { name: "description", content: "Progreso de tu peque: palabras, dibujos y logros." },
    ],
  }),
});

function ProgresoPage() {
  return (
    <div className="p-6">
      <h1 className="font-display text-3xl text-ink">Progreso</h1>
      <p className="mt-2 text-muted-foreground">Pantalla pendiente de implementar.</p>
    </div>
  );
}
