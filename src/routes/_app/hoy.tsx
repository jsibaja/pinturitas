import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { assetUrl, fetchDrawingsByWorld, fetchWorlds } from "@/lib/queries";
import { speak } from "@/lib/speech";
import { useChild } from "@/lib/child-context";

export const Route = createFileRoute("/_app/hoy")({
  component: HoyPage,
  head: () => ({
    meta: [
      { title: "Hoy · Pinturitas" },
      { name: "description", content: "Tu sesión de hoy: colorea y aprende una palabra nueva." },
    ],
  }),
});

function HoyPage() {
  const { activeChild } = useChild();
  // El mundo de Mascotas alimenta la actividad sugerida de Hoy.
  const petsQ = useQuery({ queryKey: ["drawings", "pets"], queryFn: () => fetchDrawingsByWorld("pets") });
  // El número de mundos se cuenta, no se escribe: así no se queda viejo al
  // agregar contenido (decía 13 cuando ya había 33).
  const worldsQ = useQuery({ queryKey: ["worlds"], queryFn: fetchWorlds });

  const worldCount = worldsQ.data?.length ?? 0;
  const drawings = petsQ.data ?? [];
  const wordOfDay = drawings.length ? drawings[new Date().getDate() % drawings.length] : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-5">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-secondary">
            ¡Hola, {activeChild?.name ?? "peque"}! {activeChild?.avatar_key ?? "👋"}
          </p>
          <h1 className="font-display text-3xl font-bold text-ink">¿Qué coloreamos hoy?</h1>
        </div>
        <Link
          to="/perfil-nino"
          aria-label="Cambiar de niño"
          className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-surface text-2xl shadow-soft active:scale-95"
        >
          {activeChild?.avatar_key ?? "🙂"}
        </Link>
      </header>

      {/* CTA principal */}
      <Link
        to="/mundos"
        className="mb-5 flex items-center gap-4 rounded-3xl bg-primary p-5 text-primary-foreground shadow-crayon"
      >
        <span className="text-4xl">🗺️</span>
        <span className="flex-1">
          <span className="block font-display text-xl font-bold">Explorar los mundos</span>
          <span className="block text-sm opacity-90">
            {worldCount ? `${worldCount} mundos llenos de dibujos para pintar` : "Mundos llenos de dibujos para pintar"}
          </span>
        </span>
        <span className="text-2xl">→</span>
      </Link>

      {/* Palabra del día */}
      {wordOfDay && (
        <section className="mb-6 rounded-3xl border border-border bg-surface p-4 shadow-soft">
          <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-ink-soft">
            Palabra del día
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/coloreo/$drawingSlug"
              params={{ drawingSlug: wordOfDay.slug }}
              className="canvas-paper h-20 w-20 flex-none overflow-hidden rounded-2xl"
            >
              <img
                src={assetUrl(wordOfDay.line_art_path) ?? ""}
                alt={wordOfDay.name_es}
                className="h-full w-full object-contain"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="font-display text-2xl font-bold text-ink">{wordOfDay.name_en}</div>
              <div className="text-sm text-ink-soft">
                {wordOfDay.name_es}
                {wordOfDay.phonetic_es ? ` · se dice: ${wordOfDay.phonetic_es}` : ""}
              </div>
            </div>
            <button
              onClick={() => speak(wordOfDay.name_en)}
              aria-label={`Escuchar ${wordOfDay.name_en}`}
              className="touch-target-lg grid flex-none place-items-center rounded-full bg-secondary text-secondary-foreground active:scale-95"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 9v6h4l5 4V5L8 9H4z" />
                <path d="M16.5 8.5a5 5 0 010 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </section>
      )}

      {/* Colorea hoy (mundo gratis) */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Empieza a colorear</h2>
          <Link to="/mundos/$worldSlug" params={{ worldSlug: "pets" }} className="text-sm font-semibold text-primary">
            Ver todo
          </Link>
        </div>

        {petsQ.isLoading && <p className="text-ink-soft">Cargando…</p>}

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {drawings.map((d) => (
            <Link
              key={d.id}
              to="/coloreo/$drawingSlug"
              params={{ drawingSlug: d.slug }}
              className="overflow-hidden rounded-2xl bg-surface shadow-soft"
            >
              <div className="canvas-paper aspect-square">
                <img
                  src={assetUrl(d.line_art_path) ?? ""}
                  alt={d.name_es}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="px-2 py-1.5 text-center">
                <div className="truncate font-display text-sm font-bold text-ink">{d.name_en}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
