import { createFileRoute } from "@tanstack/react-router";

/**
 * Ajustes de la cuenta (Zona de Padres).
 *
 * TODO(Claude Code):
 * - Tema: sistema / claro / oscuro (usar useTheme() de src/lib/theme-provider).
 *   Persistir también en user_settings.theme.
 * - Sonido y música (user_settings.sound_enabled, music_enabled).
 * - Hora del recordatorio diario (user_settings.daily_reminder_time).
 * - Notificaciones (user_settings.notifications_enabled).
 * - Gestión de niños (crear/editar/borrar, hasta 4).
 * - Cerrar sesión.
 */
export const Route = createFileRoute("/_app/padres/ajustes")({
  component: AjustesPage,
  head: () => ({
    meta: [
      { title: "Ajustes · Pinturitas" },
      { name: "description", content: "Preferencias de la app y de la cuenta." },
    ],
  }),
});

function AjustesPage() {
  return (
    <div className="p-6">
      <h1 className="font-display text-3xl text-ink">Ajustes</h1>
      <p className="mt-2 text-muted-foreground">Pantalla pendiente de implementar.</p>
    </div>
  );
}
