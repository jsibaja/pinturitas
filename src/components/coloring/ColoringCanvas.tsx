import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/**
 * Motor de coloreo. Tres capas conceptuales sobre papel blanco:
 *   1. El papel (fondo del contenedor, SIEMPRE #FFFFFF aun en modo oscuro).
 *   2. fillCanvas: donde va el color del niño.
 *   3. lineCanvas: el contorno negro (con el blanco vuelto transparente),
 *      encima y sin capturar el puntero, para que las líneas siempre se vean.
 *
 * Herramientas:
 *   - fill  (balde): flood-fill limitado por las líneas negras. Toca una
 *     zona y se llena. Imposible salirse.
 *   - brush (dedo): trazo libre; con `clip` activo se recorta a la región
 *     donde empezó el trazo ("sin salirse de la línea").
 *   - eraser: borra el color de la zona.
 *
 * Trabaja a resolución fija (WORK) y escala por CSS, así el rendimiento no
 * depende del tamaño de pantalla.
 */

const WORK = 1000; // resolución interna del lienzo
const LINE_THRESHOLD = 120; // luminancia por debajo de la cual un píxel es "línea"

export type Tool = "fill" | "brush" | "eraser";

export type ColoringCanvasHandle = {
  undo: () => void;
  clear: () => void;
  exportPng: () => string | null;
  coverage: () => number;
};

type Props = {
  imageUrl: string;
  color: string;
  tool: Tool;
  brushSize?: number;
  clip?: boolean;
  onProgress?: (pct: number) => void;
  onReady?: () => void;
  className?: string;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const ColoringCanvas = forwardRef<ColoringCanvasHandle, Props>(function ColoringCanvas(
  { imageUrl, color, tool, brushSize = 26, clip = true, onProgress, onReady, className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLCanvasElement>(null);
  const lineRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  // Estado mutable del motor (no provoca re-render).
  const eng = useRef({
    w: WORK,
    h: WORK,
    lineMask: null as Uint8Array | null, // 1 = píxel de contorno
    nonLineTotal: 1, // píxeles pintables (para el progreso)
    fillData: null as ImageData | null, // buffer de color en memoria
    history: [] as Uint8ClampedArray[], // para deshacer
    // valores espejo de las props (para los handlers de puntero):
    color: [0, 0, 0] as [number, number, number],
    tool: "fill" as Tool,
    brush: 26,
    clip: true,
    // estado del trazo en curso:
    drawing: false,
    pointerId: null as number | null,
    lastX: 0,
    lastY: 0,
    regionMask: null as Uint8Array | null,
    rafPending: false,
  });

  // Mantener el espejo de props al día.
  useEffect(() => {
    eng.current.color = hexToRgb(color);
  }, [color]);
  useEffect(() => {
    eng.current.tool = tool;
  }, [tool]);
  useEffect(() => {
    eng.current.brush = brushSize;
  }, [brushSize]);
  useEffect(() => {
    eng.current.clip = clip;
  }, [clip]);

  // Cargar la lámina y preparar máscara de líneas + capa de contorno.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const e = eng.current;
      e.w = WORK;
      e.h = WORK;

      // Dibujar la imagen a resolución de trabajo.
      const off = document.createElement("canvas");
      off.width = WORK;
      off.height = WORK;
      const octx = off.getContext("2d", { willReadFrequently: true })!;
      octx.fillStyle = "#FFFFFF";
      octx.fillRect(0, 0, WORK, WORK);
      octx.drawImage(img, 0, 0, WORK, WORK);
      const src = octx.getImageData(0, 0, WORK, WORK);

      // Máscara de líneas + capa de contorno con blanco transparente.
      const mask = new Uint8Array(WORK * WORK);
      const lineData = new ImageData(WORK, WORK);
      let nonLine = 0;
      for (let i = 0; i < WORK * WORK; i++) {
        const p = i * 4;
        const lum = (src.data[p] * 299 + src.data[p + 1] * 587 + src.data[p + 2] * 114) / 1000;
        if (lum < LINE_THRESHOLD) mask[i] = 1;
        else nonLine++;
        // capa de contorno: negro con alfa = qué tan oscuro es (bordes suaves)
        const a = Math.max(0, 255 - Math.round(lum));
        lineData.data[p] = 20;
        lineData.data[p + 1] = 18;
        lineData.data[p + 2] = 16;
        lineData.data[p + 3] = a;
      }
      e.lineMask = mask;
      e.nonLineTotal = Math.max(1, nonLine);

      // Pintar la capa de contorno (visible, encima).
      const lineCanvas = lineRef.current!;
      lineCanvas.width = WORK;
      lineCanvas.height = WORK;
      lineCanvas.getContext("2d")!.putImageData(lineData, 0, 0);

      // Lienzo de color vacío (transparente => se ve el papel blanco).
      const fillCanvas = fillRef.current!;
      fillCanvas.width = WORK;
      fillCanvas.height = WORK;
      const fctx = fillCanvas.getContext("2d", { willReadFrequently: true })!;
      fctx.clearRect(0, 0, WORK, WORK);
      e.fillData = fctx.getImageData(0, 0, WORK, WORK);
      e.history = [];

      setReady(true);
      onReady?.();
      onProgress?.(0);
    };
    img.onerror = () => {
      if (!cancelled) setReady(false);
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // ---- utilidades del motor ----

  function blit() {
    const e = eng.current;
    const ctx = fillRef.current?.getContext("2d");
    if (ctx && e.fillData) ctx.putImageData(e.fillData, 0, 0);
  }

  function scheduleBlit() {
    const e = eng.current;
    if (e.rafPending) return;
    e.rafPending = true;
    requestAnimationFrame(() => {
      e.rafPending = false;
      blit();
    });
  }

  function pushHistory() {
    const e = eng.current;
    if (!e.fillData) return;
    e.history.push(new Uint8ClampedArray(e.fillData.data));
    if (e.history.length > 12) e.history.shift();
  }

  function reportProgress() {
    const e = eng.current;
    if (!e.fillData || !e.lineMask) return;
    const d = e.fillData.data;
    let filled = 0;
    for (let i = 0; i < e.w * e.h; i++) {
      if (!e.lineMask[i] && d[i * 4 + 3] > 0) filled++;
    }
    onProgress?.(Math.min(1, filled / e.nonLineTotal));
  }

  /** Región conexa de píxeles pintables a partir de (x,y). Devuelve máscara. */
  function computeRegion(x: number, y: number): Uint8Array | null {
    const e = eng.current;
    const { w, h, lineMask } = e;
    if (!lineMask) return null;
    const seed = y * w + x;
    if (lineMask[seed]) return null;
    const region = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    let sp = 0;
    stack[sp++] = seed;
    region[seed] = 1;
    while (sp > 0) {
      const idx = stack[--sp];
      const px = idx % w;
      const py = (idx / w) | 0;
      if (px > 0) {
        const n = idx - 1;
        if (!region[n] && !lineMask[n]) (region[n] = 1), (stack[sp++] = n);
      }
      if (px < w - 1) {
        const n = idx + 1;
        if (!region[n] && !lineMask[n]) (region[n] = 1), (stack[sp++] = n);
      }
      if (py > 0) {
        const n = idx - w;
        if (!region[n] && !lineMask[n]) (region[n] = 1), (stack[sp++] = n);
      }
      if (py < h - 1) {
        const n = idx + w;
        if (!region[n] && !lineMask[n]) (region[n] = 1), (stack[sp++] = n);
      }
    }
    return region;
  }

  function bucketFill(x: number, y: number) {
    const e = eng.current;
    const region = computeRegion(x, y);
    if (!region || !e.fillData) return;
    const [r, g, b] = e.color;
    const d = e.fillData.data;
    for (let i = 0; i < e.w * e.h; i++) {
      if (region[i]) {
        const p = i * 4;
        d[p] = r;
        d[p + 1] = g;
        d[p + 2] = b;
        d[p + 3] = 255;
      }
    }
    blit();
    reportProgress();
  }

  function stamp(x: number, y: number) {
    const e = eng.current;
    if (!e.fillData || !e.lineMask) return;
    const rad = e.brush / 2;
    const rad2 = rad * rad;
    const erase = e.tool === "eraser";
    const [cr, cg, cb] = e.color;
    const d = e.fillData.data;
    const x0 = Math.max(0, Math.floor(x - rad));
    const x1 = Math.min(e.w - 1, Math.ceil(x + rad));
    const y0 = Math.max(0, Math.floor(y - rad));
    const y1 = Math.min(e.h - 1, Math.ceil(y + rad));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dx = px - x;
        const dy = py - y;
        if (dx * dx + dy * dy > rad2) continue;
        const idx = py * e.w + px;
        if (e.lineMask[idx]) continue; // nunca pintar sobre la línea
        if (e.regionMask && !e.regionMask[idx]) continue; // "sin salirse"
        const p = idx * 4;
        if (erase) {
          d[p + 3] = 0;
        } else {
          d[p] = cr;
          d[p + 1] = cg;
          d[p + 2] = cb;
          d[p + 3] = 255;
        }
      }
    }
  }

  function strokeTo(x: number, y: number) {
    const e = eng.current;
    const dist = Math.hypot(x - e.lastX, y - e.lastY);
    const step = Math.max(1, e.brush / 4);
    const n = Math.max(1, Math.floor(dist / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      stamp(e.lastX + (x - e.lastX) * t, e.lastY + (y - e.lastY) * t);
    }
    e.lastX = x;
    e.lastY = y;
    scheduleBlit();
  }

  // ---- puntero ----

  function toWork(clientX: number, clientY: number) {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.round(((clientX - rect.left) / rect.width) * eng.current.w),
      y: Math.round(((clientY - rect.top) / rect.height) * eng.current.h),
    };
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !ready) return;

    const onDown = (ev: PointerEvent) => {
      const e = eng.current;
      if (e.pointerId !== null) return; // ignora dedos extra / apoyo de palma
      const { x, y } = toWork(ev.clientX, ev.clientY);
      if (x < 0 || y < 0 || x >= e.w || y >= e.h) return;

      if (e.tool === "fill") {
        pushHistory();
        bucketFill(x, y);
        return;
      }

      // brush / eraser
      e.pointerId = ev.pointerId;
      el.setPointerCapture(ev.pointerId);
      e.drawing = true;
      pushHistory();
      e.regionMask = e.clip ? computeRegion(x, y) : null;
      if (e.clip && !e.regionMask && e.tool === "brush") {
        // tocó una línea con clip activo: no pinta
        e.drawing = false;
        e.pointerId = null;
        return;
      }
      e.lastX = x;
      e.lastY = y;
      stamp(x, y);
      scheduleBlit();
    };

    const onMove = (ev: PointerEvent) => {
      const e = eng.current;
      if (!e.drawing || ev.pointerId !== e.pointerId) return;
      const { x, y } = toWork(ev.clientX, ev.clientY);
      strokeTo(x, y);
    };

    const onUp = (ev: PointerEvent) => {
      const e = eng.current;
      if (ev.pointerId !== e.pointerId) return;
      e.drawing = false;
      e.pointerId = null;
      e.regionMask = null;
      blit();
      reportProgress();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ---- API imperativa ----

  useImperativeHandle(ref, () => ({
    undo() {
      const e = eng.current;
      const prev = e.history.pop();
      if (!prev || !e.fillData) return;
      e.fillData.data.set(prev);
      blit();
      reportProgress();
    },
    clear() {
      const e = eng.current;
      if (!e.fillData) return;
      pushHistory();
      e.fillData.data.fill(0);
      blit();
      reportProgress();
    },
    exportPng() {
      const e = eng.current;
      const out = document.createElement("canvas");
      out.width = e.w;
      out.height = e.h;
      const o = out.getContext("2d")!;
      o.fillStyle = "#FFFFFF";
      o.fillRect(0, 0, e.w, e.h);
      if (fillRef.current) o.drawImage(fillRef.current, 0, 0);
      if (lineRef.current) o.drawImage(lineRef.current, 0, 0);
      return out.toDataURL("image/png");
    },
    coverage() {
      const e = eng.current;
      if (!e.fillData || !e.lineMask) return 0;
      const d = e.fillData.data;
      let filled = 0;
      for (let i = 0; i < e.w * e.h; i++) if (!e.lineMask[i] && d[i * 4 + 3] > 0) filled++;
      return filled / e.nonLineTotal;
    },
  }));

  return (
    <div
      ref={containerRef}
      className={`canvas-paper relative aspect-square w-full touch-none select-none overflow-hidden rounded-3xl ${className ?? ""}`}
      style={{ WebkitTapHighlightColor: "transparent", cursor: "crosshair" }}
    >
      <canvas ref={fillRef} className="absolute inset-0 h-full w-full" />
      <canvas
        ref={lineRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-ink-soft">
          <span className="animate-pulse text-sm">Cargando lámina…</span>
        </div>
      )}
    </div>
  );
});
