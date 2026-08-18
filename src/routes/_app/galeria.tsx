import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchArtworks } from "@/lib/queries";
import { useChild } from "@/lib/child-context";

export const Route = createFileRoute("/_app/galeria")({
  component: GaleriaPage,
  head: () => ({
    meta: [
      { title: "Mi Galería · Pinturitas" },
      { name: "description", content: "Todos tus dibujos terminados en un solo lugar." },
    ],
  }),
});

function GaleriaPage() {
  const { activeChildId: childId } = useChild();
  const artworksQ = useQuery({
    queryKey: ["artworks", childId],
    queryFn: () => fetchArtworks(childId as string),
    enabled: !!childId,
  });
  const artworks = artworksQ.data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-5">
      <h1 className="mb-1 font-display text-3xl font-bold text-ink">Mi Galería</h1>
      <p className="mb-6 text-sm text-ink-soft">Aquí se guardan los dibujos que terminas.</p>

      {artworksQ.isLoading && <p className="text-ink-soft">Cargando…</p>}

      {artworks.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {artworks.map((a) => (
            <Link
              key={a.id}
              to="/coloreo/$drawingSlug"
              params={{ drawingSlug: a.drawings?.slug ?? "" }}
              className="overflow-hidden rounded-3xl bg-surface shadow-crayon"
            >
              <div className="canvas-paper aspect-square">
                {a.thumbnail_path && (
                  <img src={a.thumbnail_path} alt={a.drawings?.name_es ?? ""} className="h-full w-full object-contain" />
                )}
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate font-display font-bold leading-tight text-ink">
                    {a.drawings?.name_en}
                  </div>
                  <div className="truncate text-xs text-ink-soft">{a.drawings?.name_es}</div>
                </div>
                {a.is_completed && <span title="Terminado">⭐</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        !artworksQ.isLoading && (
          <div className="flex flex-col items-center rounded-3xl border border-border bg-surface px-6 py-12 text-center shadow-soft">
            <img
              src="/brand/empty-gallery.png"
              alt=""
              className="mb-4 h-40 w-40 object-contain"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <h2 className="font-display text-xl font-bold text-ink">Todavía no hay dibujos</h2>
            <p className="mt-1 max-w-xs text-sm text-ink-soft">
              Cuando termines de colorear una lámina, aparecerá aquí como tu obra de arte.
            </p>
            <Link
              to="/mundos"
              className="mt-5 rounded-2xl bg-primary px-6 py-3 font-display font-bold text-primary-foreground shadow-crayon active:scale-95"
            >
              Colorear mi primero
            </Link>
          </div>
        )
      )}
    </div>
  );
}
