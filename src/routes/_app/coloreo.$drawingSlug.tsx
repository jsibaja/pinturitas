import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ColoringCanvas,
  type ColoringCanvasHandle,
  type Tool,
} from "@/components/coloring/ColoringCanvas";
import { assetUrl, fetchDrawing, fetchPalette, saveArtwork } from "@/lib/queries";
import { speak, speakBilingual } from "@/lib/speech";
import { useChild } from "@/lib/child-context";

/** Reduce el PNG del lienzo a una miniatura JPEG liviana para la galería. */
function makeThumb(dataUrl: string, size = 360): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const x = c.getContext("2d")!;
      x.fillStyle = "#FFFFFF";
      x.fillRect(0, 0, size, size);
      x.drawImage(img, 0, 0, size, size);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const Route = createFileRoute("/_app/coloreo/$drawingSlug")({
  component: ColoringStudioPage,
  head: ({ params }) => ({
    meta: [
      { title: `Colorear ${params.drawingSlug} · Pinturitas` },
      { name: "description", content: "Colorea, escucha y aprende una nueva palabra en inglés." },
    ],
  }),
});

// --- utilidades de color: genera tonos (más claros → más oscuros) de un color base ---
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}
/** 9 tonos: 4 más claros (pasteles), el base, y 4 más oscuros. */
function shadesOf(hex: string): string[] {
  return [
    mix(hex, "#FFFFFF", 0.72),
    mix(hex, "#FFFFFF", 0.54),
    mix(hex, "#FFFFFF", 0.36),
    mix(hex, "#FFFFFF", 0.18),
    hex,
    mix(hex, "#000000", 0.18),
    mix(hex, "#000000", 0.36),
    mix(hex, "#000000", 0.54),
    mix(hex, "#000000", 0.70),
  ];
}

/** Nombre del tono según su posición (0-8, centro = 4 = color base). */
function toneName(i: number, name: string): string {
  if (i <= 1) return `${name} muy claro`;
  if (i <= 3) return `${name} claro`;
  if (i === 4) return name;
  if (i <= 6) return `${name} oscuro`;
  return `${name} muy oscuro`;
}

function ColoringStudioPage() {
  const { drawingSlug } = Route.useParams();
  const canvasRef = useRef<ColoringCanvasHandle>(null);
  const qc = useQueryClient();
  const { activeChildId: childId } = useChild();

  const drawingQ = useQuery({ queryKey: ["drawing", drawingSlug], queryFn: () => fetchDrawing(drawingSlug) });
  const paletteQ = useQuery({ queryKey: ["palette"], queryFn: fetchPalette });

  const [tool, setTool] = useState<Tool>("fill");
  const [color, setColor] = useState("#E63946");
  const [activeBase, setActiveBase] = useState("#E63946");
  const [activeBaseName, setActiveBaseName] = useState("rojo");
  const [brush, setBrush] = useState(28);
  const [clip, setClip] = useState(true);
  const [sound, setSound] = useState(true);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const drawing = drawingQ.data;
  const palette = paletteQ.data ?? [];
  const lineUrl = assetUrl(drawing?.line_art_path);
  const shades = shadesOf(activeBase);
  const shadeIdx = shades.indexOf(color);
  const currentTone = shadeIdx >= 0 ? toneName(shadeIdx, activeBaseName) : activeBaseName;

  async function persist(completed: boolean, notify: boolean) {
    if (!childId || !drawing) return;
    const png = canvasRef.current?.exportPng();
    if (!png) return;
    setSaving(true);
    try {
      const thumb = await makeThumb(png);
      await saveArtwork({ childId, drawingId: drawing.id, thumbnail: thumb, isCompleted: completed });
      qc.invalidateQueries({ queryKey: ["artworks"] });
      if (notify) flashToast("Guardado en tu galería 🎨");
    } catch {
      if (notify) flashToast("No se pudo guardar. Revisa tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  function flashToast(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  function handleProgress(pct: number) {
    setProgress(pct);
    if (pct >= 0.85 && !done) {
      setDone(true);
      void persist(true, false); // autoguardado al terminar
    }
  }

  if (drawingQ.isLoading) {
    return <div className="grid min-h-[60vh] place-items-center text-ink-soft">Cargando…</div>;
  }
  if (!drawing || !lineUrl) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div>
          <p className="text-ink">No encontramos esta lámina.</p>
          <Link to="/mundos" className="mt-3 inline-block font-semibold text-primary">
            Volver a los mundos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-3">
      {/* Tarjeta de palabra */}
      <div className="mb-3 flex items-center gap-3">
        <Link
          to="/mundos"
          aria-label="Volver"
          className="touch-target-lg grid place-items-center rounded-2xl bg-surface text-ink shadow-soft"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="font-display text-3xl font-bold leading-none text-ink">{drawing.name_en}</div>
          <div className="text-sm text-ink-soft">
            {drawing.name_es}
            {drawing.phonetic_es ? <span className="text-secondary"> · se dice: {drawing.phonetic_es}</span> : null}
          </div>
        </div>
        <button
          onClick={() => speak(drawing.name_en)}
          aria-label={`Escuchar ${drawing.name_en}`}
          className="touch-target-lg grid place-items-center rounded-full bg-primary text-primary-foreground shadow-crayon active:scale-95"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            <path d="M16.5 8.5a5 5 0 010 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Progreso */}
      <div className="mb-2 flex items-center gap-3 text-xs text-ink-soft">
        <span className="tabular-nums">{Math.round(progress * 100)}%</span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full bg-secondary transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </span>
      </div>

      {/* Lienzo */}
      <div className="relative">
        <ColoringCanvas
          ref={canvasRef}
          imageUrl={lineUrl}
          color={color}
          tool={tool}
          brushSize={brush}
          clip={clip}
          onProgress={handleProgress}
          className="shadow-crayon"
        />
        {done && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <div className="rounded-full bg-achievement px-4 py-2 font-display text-sm font-bold text-ink shadow-crayon">
              ¡Muy bien! 🎉 Terminaste tu {drawing.name_es}
            </div>
          </div>
        )}
      </div>

      {/* Herramientas */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {(
          [
            { id: "fill", label: "Balde" },
            { id: "brush", label: "Dedo" },
            { id: "eraser", label: "Borrador" },
          ] as { id: Tool; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            aria-pressed={tool === t.id}
            className={`touch-target-lg rounded-2xl px-3 font-display font-bold transition-colors ${
              tool === t.id
                ? "bg-primary text-primary-foreground shadow-crayon"
                : "bg-surface text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Opciones de trazo */}
      {tool !== "fill" && (
        <div className="mt-3 rounded-2xl bg-surface p-3">
          <label className="mb-2 flex items-center justify-between text-sm text-ink">
            <span>Sin salirse de la línea</span>
            <button
              onClick={() => setClip((v) => !v)}
              aria-pressed={clip}
              className={`relative h-7 w-12 rounded-full transition-colors ${clip ? "bg-secondary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${clip ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </label>
          <input
            type="range"
            min={10}
            max={60}
            value={brush}
            onChange={(e) => setBrush(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Grosor del trazo"
          />
        </div>
      )}

      {/* Paleta bilingüe hablada */}
      <div className="mt-3 grid grid-cols-6 gap-2">
        {palette.map((c) => (
          <button
            key={c.hex}
            onClick={() => {
              setActiveBase(c.hex);
              setActiveBaseName(c.name_es);
              setColor(c.hex);
              if (sound) speakBilingual(c.name_en, c.name_es);
            }}
            aria-label={`${c.name_en}, ${c.name_es}`}
            aria-pressed={activeBase === c.hex}
            className="aspect-square rounded-xl border-2 transition-transform active:scale-95"
            style={{
              background: c.hex,
              borderColor: c.hex.toUpperCase() === "#FFFFFF" ? "#E5E5E5" : "rgba(0,0,0,.12)",
              outline: activeBase === c.hex ? "3px solid var(--color-primary)" : "none",
              outlineOffset: "2px",
            }}
          />
        ))}
      </div>

      {/* Tonos del color elegido: más claros (pasteles) → más oscuros */}
      <div className="mt-2">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          <span>Tonos</span>
          <span className="normal-case text-secondary">· {currentTone}</span>
        </div>
        <div className="grid grid-cols-9 gap-1.5">
          {shades.map((sh, i) => (
            <button
              key={i}
              onClick={() => {
                setColor(sh);
                if (sound) speak(toneName(i, activeBaseName), { lang: "es-MX", rate: 0.95 });
              }}
              aria-label={toneName(i, activeBaseName)}
              aria-pressed={color === sh}
              className="aspect-square rounded-lg border transition-transform active:scale-95"
              style={{
                background: sh,
                borderColor: "rgba(0,0,0,.12)",
                outline: color === sh ? "3px solid var(--color-primary)" : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => canvasRef.current?.undo()}
          className="touch-target-lg rounded-2xl bg-surface font-semibold text-ink"
        >
          Deshacer
        </button>
        <button
          onClick={() => {
            canvasRef.current?.clear();
            setDone(false);
          }}
          className="touch-target-lg rounded-2xl bg-surface font-semibold text-ink"
        >
          Limpiar
        </button>
        <button
          onClick={() => void persist(progress >= 0.85, true)}
          disabled={saving}
          className="touch-target-lg rounded-2xl bg-secondary font-semibold text-secondary-foreground disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="rounded-full bg-ink px-5 py-3 font-display text-sm font-bold text-background shadow-crayon">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
