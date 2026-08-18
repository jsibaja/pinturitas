import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { assetUrl, fetchWorlds } from "@/lib/queries";

export const Route = createFileRoute("/_app/mundos/")({
  component: WorldsPage,
  head: () => ({
    meta: [
      { title: "Mundos · Pinturitas" },
      { name: "description", content: "Elige un mundo y colorea sus láminas." },
    ],
  }),
});

function WorldsPage() {
  const worldsQ = useQuery({ queryKey: ["worlds"], queryFn: fetchWorlds });
  const worlds = worldsQ.data ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-8 pt-4">
      <h1 className="mb-1 font-display text-3xl font-bold text-ink">Mundos</h1>
      <p className="mb-5 text-sm text-ink-soft">Elige un mundo para empezar a colorear.</p>

      {worldsQ.isLoading && <p className="text-ink-soft">Cargando mundos…</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {worlds.map((w) => {
          const cover = assetUrl(w.cover_image_path);
          return (
            <Link
              key={w.id}
              to="/mundos/$worldSlug"
              params={{ worldSlug: w.slug }}
              className="group relative overflow-hidden rounded-3xl shadow-crayon"
            >
              <div
                className="flex aspect-[4/5] flex-col justify-end p-3"
                style={{
                  background: cover
                    ? `center/cover url(${cover})`
                    : `linear-gradient(160deg, ${w.color_hex ?? "#FF7A3D"}, ${w.color_hex ?? "#FF7A3D"}cc)`,
                }}
              >
                <div className="rounded-2xl bg-black/25 px-2.5 py-1.5 backdrop-blur-sm">
                  <div className="font-display text-base font-bold leading-tight text-white">{w.name_es}</div>
                  <div className="text-[11px] text-white/85">{w.name_en}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
