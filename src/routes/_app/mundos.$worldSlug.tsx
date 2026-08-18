import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { assetUrl, fetchDrawingsByWorld, fetchWorld } from "@/lib/queries";

export const Route = createFileRoute("/_app/mundos/$worldSlug")({
  component: WorldDetailPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.worldSlug} · Pinturitas` },
      { name: "description", content: "Elige una lámina para colorear y aprender." },
    ],
  }),
});

function WorldDetailPage() {
  const { worldSlug } = Route.useParams();
  const worldQ = useQuery({ queryKey: ["world", worldSlug], queryFn: () => fetchWorld(worldSlug) });
  const drawingsQ = useQuery({
    queryKey: ["drawings", worldSlug],
    queryFn: () => fetchDrawingsByWorld(worldSlug),
  });

  const world = worldQ.data;
  const drawings = drawingsQ.data ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-8 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/mundos"
          aria-label="Volver"
          className="touch-target-lg grid place-items-center rounded-2xl bg-surface text-ink shadow-soft"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold leading-none text-ink">
            {world?.name_es ?? worldSlug}
          </h1>
          {world?.name_en && <p className="text-sm text-ink-soft">{world.name_en}</p>}
        </div>
      </div>

      {drawingsQ.isLoading && <p className="text-ink-soft">Cargando láminas…</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {drawings.map((d) => {
          const thumb = assetUrl(d.preview_image_path) ?? assetUrl(d.line_art_path);
          return (
            <Link
              key={d.id}
              to="/coloreo/$drawingSlug"
              params={{ drawingSlug: d.slug }}
              className="overflow-hidden rounded-3xl bg-surface shadow-crayon"
            >
              <div className="canvas-paper aspect-square">
                {thumb && (
                  <img src={thumb} alt={d.name_es} className="h-full w-full object-contain" loading="lazy" />
                )}
              </div>
              <div className="px-3 py-2">
                <div className="font-display font-bold leading-tight text-ink">{d.name_en}</div>
                <div className="text-xs text-ink-soft">{d.name_es}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
