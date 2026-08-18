import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  assetUrl,
  fetchDrawingPool,
  fetchPalette,
  saveVocabReview,
  type Drawing,
  type PaletteColor,
} from "@/lib/queries";
import { speak, speakBilingual } from "@/lib/speech";
import { useChild } from "@/lib/child-context";

export const Route = createFileRoute("/_app/juegos")({
  component: JuegosPage,
  head: () => ({
    meta: [
      { title: "Juegos · Pinturitas" },
      { name: "description", content: "Juega y repasa las palabras que aprendiste en inglés." },
    ],
  }),
});

type GameId = "listen" | "memory" | "who" | "colors" | "review";

const GAMES: { id: GameId; emoji: string; name: string; desc: string; color: string }[] = [
  { id: "listen", emoji: "👂", name: "Escucha y Toca", desc: "Escucha la palabra y toca el dibujo.", color: "var(--color-primary)" },
  { id: "memory", emoji: "🃏", name: "Memorama", desc: "Empareja el dibujo con su palabra.", color: "var(--color-secondary)" },
  { id: "who", emoji: "🕵️", name: "¿Quién soy?", desc: "Adivina el animal por su sombra.", color: "var(--color-achievement)" },
  { id: "colors", emoji: "🎨", name: "Pinta lo que escuchas", desc: "Escucha el color en inglés y tócalo.", color: "var(--color-primary)" },
  { id: "review", emoji: "⭐", name: "Repaso del día", desc: "Repasa tus palabras en inglés.", color: "var(--color-secondary)" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = <T,>(arr: T[], n: number) => shuffle(arr).slice(0, n);
const ANIMAL_RE = /^line-art\/(pets|farm|wild|forest|ocean|flying|bugs)\//;
const silUrl = (d: Drawing) => assetUrl((d.line_art_path ?? "").replace("line-art/", "silhouettes/"));

function JuegosPage() {
  const poolQ = useQuery({ queryKey: ["drawing-pool"], queryFn: fetchDrawingPool });
  const paletteQ = useQuery({ queryKey: ["palette"], queryFn: fetchPalette });
  const { activeChildId: childId } = useChild();
  const [active, setActive] = useState<GameId | null>(null);

  const pool = (poolQ.data ?? []).filter((d) => d.line_art_path);
  const palette = paletteQ.data ?? [];

  if (poolQ.isLoading) return <div className="grid min-h-[60vh] place-items-center text-ink-soft">Cargando…</div>;

  if (!active) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-5">
        <h1 className="mb-1 font-display text-3xl font-bold text-ink">Juegos</h1>
        <p className="mb-5 text-sm text-ink-soft">Cada juego repasa tus palabras en inglés.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {GAMES.map((g) => (
            <button
              key={g.id}
              onClick={() => setActive(g.id)}
              className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4 text-left shadow-soft active:scale-[.99]"
            >
              <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl text-3xl" style={{ background: `color-mix(in srgb, ${g.color} 15%, transparent)` }}>
                {g.emoji}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-bold text-ink">{g.name}</span>
                <span className="block text-sm text-ink-soft">{g.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const game = GAMES.find((g) => g.id === active)!;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => setActive(null)} aria-label="Volver a los juegos"
          className="touch-target-lg grid place-items-center rounded-2xl bg-surface text-ink shadow-soft">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display text-2xl font-bold text-ink">{game.name}</h1>
      </div>

      {active === "listen" && <ListenTap pool={pool} />}
      {active === "memory" && <Memory pool={pool} />}
      {active === "who" && <WhoAmI pool={pool} />}
      {active === "colors" && <ColorGame palette={palette} />}
      {active === "review" && <Review pool={pool} childId={childId} />}
    </div>
  );
}

/* ---------- marcador ---------- */
function Score({ value }: { value: number }) {
  return (
    <div className="mb-4 rounded-2xl bg-surface px-4 py-3 text-center font-display font-bold text-ink shadow-soft">
      Aciertos: <span className="text-secondary tabular-nums">{value}</span>
    </div>
  );
}

/* ---------- 1. Escucha y Toca ---------- */
function ListenTap({ pool }: { pool: Drawing[] }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);

  const { target, options } = useMemo(() => {
    const s = shuffle(pool);
    const target = s[0];
    return { target, options: shuffle([target, ...s.slice(1, 3)]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, pool]);

  useEffect(() => {
    const t = setTimeout(() => speak(target.name_en), 350);
    return () => clearTimeout(t);
  }, [target]);

  function choose(d: Drawing) {
    if (solved) return;
    if (d.id === target.id) {
      setSolved(true);
      setScore((s) => s + 1);
      speakBilingual(target.name_en, target.name_es);
      setTimeout(() => { setSolved(false); setWrongId(null); setRound((r) => r + 1); }, 1200);
    } else {
      setWrongId(d.id);
      setTimeout(() => setWrongId(null), 500);
    }
  }

  return (
    <div>
      <Score value={score} />
      <div className="mb-3 flex items-center justify-center gap-3">
        <p className="font-display text-lg font-bold text-ink">¿Dónde está <span className="text-primary">{target.name_en}</span>?</p>
        <button onClick={() => speak(target.name_en)} aria-label="Escuchar otra vez" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground active:scale-95">
          <SpeakerIcon />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {options.map((d) => (
          <button key={d.id} onClick={() => choose(d)}
            className={`overflow-hidden rounded-3xl border-4 bg-surface shadow-soft active:scale-95 ${solved && d.id === target.id ? "border-secondary" : wrongId === d.id ? "border-destructive" : "border-transparent"}`}
            style={wrongId === d.id ? { animation: "wiggle .4s" } : undefined}>
            <div className="canvas-paper aspect-square"><img src={assetUrl(d.line_art_path) ?? ""} alt="" className="h-full w-full object-contain" /></div>
          </button>
        ))}
      </div>
      {solved && <p className="mt-4 text-center font-display text-xl font-bold text-secondary">¡Muy bien! 🎉</p>}
      <Wiggle />
    </div>
  );
}

/* ---------- 2. Memorama ---------- */
type Card = { key: string; drawingId: string; kind: "img" | "word"; d: Drawing };
function Memory({ pool }: { pool: Drawing[] }) {
  const [round, setRound] = useState(0);
  const cards = useMemo<Card[]>(() => {
    const six = pick(pool, 6);
    const list: Card[] = [];
    six.forEach((d) => {
      list.push({ key: d.id + "-img", drawingId: d.id, kind: "img", d });
      list.push({ key: d.id + "-word", drawingId: d.id, kind: "word", d });
    });
    return shuffle(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, pool]);

  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const won = matched.length === cards.length && cards.length > 0;

  function flip(c: Card) {
    if (busy || flipped.includes(c.key) || matched.includes(c.drawingId)) return;
    const next = [...flipped, c.key];
    setFlipped(next);
    if (next.length === 2) {
      setBusy(true);
      const [a, b] = next.map((k) => cards.find((x) => x.key === k)!);
      if (a.drawingId === b.drawingId) {
        speakBilingual(a.d.name_en, a.d.name_es);
        setTimeout(() => { setMatched((m) => [...m, a.drawingId]); setFlipped([]); setBusy(false); }, 700);
      } else {
        setTimeout(() => { setFlipped([]); setBusy(false); }, 950);
      }
    }
  }

  return (
    <div>
      <p className="mb-3 text-center text-sm text-ink-soft">Encuentra cada dibujo con su palabra en inglés.</p>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {cards.map((c) => {
          const show = flipped.includes(c.key) || matched.includes(c.drawingId);
          return (
            <button key={c.key} onClick={() => flip(c)}
              className={`aspect-square overflow-hidden rounded-2xl shadow-soft transition ${matched.includes(c.drawingId) ? "opacity-40" : ""} ${show ? "bg-surface" : "bg-primary"}`}>
              {show ? (
                c.kind === "img"
                  ? <div className="canvas-paper h-full w-full"><img src={assetUrl(c.d.line_art_path) ?? ""} alt="" className="h-full w-full object-contain p-1" /></div>
                  : <div className="grid h-full w-full place-items-center p-1"><span className="font-display text-sm font-bold leading-tight text-ink">{c.d.name_en}</span></div>
              ) : (
                <span className="grid h-full w-full place-items-center text-2xl text-primary-foreground">?</span>
              )}
            </button>
          );
        })}
      </div>
      {won && (
        <div className="mt-5 text-center">
          <p className="font-display text-xl font-bold text-secondary">¡Todas emparejadas! 🎉</p>
          <button onClick={() => { setMatched([]); setFlipped([]); setRound((r) => r + 1); }}
            className="mt-3 rounded-2xl bg-primary px-6 py-3 font-display font-bold text-primary-foreground shadow-crayon active:scale-95">
            Jugar otra vez
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- 3. ¿Quién soy? (silueta) ---------- */
function WhoAmI({ pool }: { pool: Drawing[] }) {
  const animals = useMemo(() => pool.filter((d) => ANIMAL_RE.test(d.line_art_path ?? "")), [pool]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);

  const { target, options } = useMemo(() => {
    const s = shuffle(animals);
    const target = s[0];
    return { target, options: shuffle([target, ...s.slice(1, 3)]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, animals]);

  if (animals.length < 3) return <p className="text-ink-soft">Cargando…</p>;

  function choose(d: Drawing) {
    if (solved) return;
    if (d.id === target.id) {
      setSolved(true); setScore((s) => s + 1); speakBilingual(target.name_en, target.name_es);
      setTimeout(() => { setSolved(false); setWrongId(null); setRound((r) => r + 1); }, 1300);
    } else { setWrongId(d.id); setTimeout(() => setWrongId(null), 500); }
  }

  return (
    <div>
      <Score value={score} />
      <p className="mb-3 text-center font-display text-lg font-bold text-ink">¿Qué animal es esta sombra?</p>
      <div className="mx-auto mb-5 grid aspect-square w-48 place-items-center rounded-3xl bg-surface p-4 shadow-soft">
        <img src={(solved ? assetUrl(target.line_art_path) : silUrl(target)) ?? ""} alt="" className="h-full w-full object-contain transition-all" />
      </div>
      {solved && <p className="mb-3 text-center font-display text-xl font-bold text-secondary">¡Es {target.name_en}! 🎉</p>}
      <div className="grid grid-cols-3 gap-3">
        {options.map((d) => (
          <button key={d.id} onClick={() => choose(d)}
            className={`overflow-hidden rounded-3xl border-4 bg-surface shadow-soft active:scale-95 ${solved && d.id === target.id ? "border-secondary" : wrongId === d.id ? "border-destructive" : "border-transparent"}`}
            style={wrongId === d.id ? { animation: "wiggle .4s" } : undefined}>
            <div className="canvas-paper aspect-square"><img src={assetUrl(d.line_art_path) ?? ""} alt="" className="h-full w-full object-contain" /></div>
          </button>
        ))}
      </div>
      <Wiggle />
    </div>
  );
}

/* ---------- 4. Pinta lo que escuchas (colores) ---------- */
function ColorGame({ palette }: { palette: PaletteColor[] }) {
  const usable = palette.filter((c) => c.hex.toUpperCase() !== "#FFFFFF");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);

  const { target, options } = useMemo(() => {
    const s = shuffle(usable);
    const target = s[0];
    return { target, options: shuffle([target, ...s.slice(1, 6)]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, palette]);

  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => speak(target.name_en), 350);
    return () => clearTimeout(t);
  }, [target]);

  if (!target) return <p className="text-ink-soft">Cargando…</p>;

  function choose(c: PaletteColor) {
    if (solved) return;
    if (c.hex === target.hex) {
      setSolved(true); setScore((s) => s + 1); speakBilingual(target.name_en, target.name_es);
      setTimeout(() => { setSolved(false); setWrong(null); setRound((r) => r + 1); }, 1300);
    } else { setWrong(c.hex); setTimeout(() => setWrong(null), 500); }
  }

  return (
    <div>
      <Score value={score} />
      <div className="mb-5 flex flex-col items-center gap-3">
        <div className="grid h-24 w-24 place-items-center rounded-full shadow-crayon transition-colors" style={{ background: solved ? target.hex : "var(--color-muted)" }}>
          {!solved && <span className="text-3xl">🎨</span>}
        </div>
        <div className="flex items-center gap-2">
          <p className="font-display text-lg font-bold text-ink">Toca el color: <span className="text-primary">{target.name_en}</span></p>
          <button onClick={() => speak(target.name_en)} aria-label="Escuchar" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground active:scale-95"><SpeakerIcon /></button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {options.map((c) => (
          <button key={c.hex} onClick={() => choose(c)} aria-label={c.name_en}
            className={`aspect-square rounded-3xl border-4 shadow-soft active:scale-95 ${solved && c.hex === target.hex ? "border-secondary" : wrong === c.hex ? "border-destructive" : "border-transparent"}`}
            style={{ background: c.hex, ...(wrong === c.hex ? { animation: "wiggle .4s" } : {}) }} />
        ))}
      </div>
      {solved && <p className="mt-4 text-center font-display text-xl font-bold text-secondary">¡{target.name_en} · {target.name_es}! 🎉</p>}
      <Wiggle />
    </div>
  );
}

/* ---------- 5. Repaso del día (SRS) ---------- */
function Review({ pool, childId }: { pool: Drawing[]; childId: string | null }) {
  const deck = useMemo(() => pick(pool, 8), [pool]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  if (deck.length === 0) return <p className="text-ink-soft">Cargando…</p>;

  if (done) {
    return (
      <div className="text-center">
        <p className="font-display text-2xl font-bold text-secondary">¡Repaso completo! ⭐</p>
        <p className="mt-2 text-ink-soft">Repasaste {deck.length} palabras.</p>
        <button onClick={() => { setI(0); setRevealed(false); setDone(false); }}
          className="mt-5 rounded-2xl bg-primary px-6 py-3 font-display font-bold text-primary-foreground shadow-crayon active:scale-95">
          Repasar de nuevo
        </button>
      </div>
    );
  }

  const card = deck[i];
  function rate(knew: boolean) {
    if (childId) void saveVocabReview({ childId, drawingId: card.id, knew });
    if (i + 1 >= deck.length) setDone(true);
    else { setI(i + 1); setRevealed(false); }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 text-xs text-ink-soft">
        <span className="tabular-nums">{i + 1} / {deck.length}</span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-secondary transition-all" style={{ width: `${((i) / deck.length) * 100}%` }} />
        </span>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-5 text-center shadow-soft">
        <div className="canvas-paper mx-auto grid aspect-square w-48 place-items-center overflow-hidden rounded-2xl">
          <img src={assetUrl(card.line_art_path) ?? ""} alt="" className="h-full w-full object-contain p-2" />
        </div>
        {!revealed ? (
          <>
            <p className="mt-4 font-display text-lg font-bold text-ink">¿Cómo se dice en inglés?</p>
            <button onClick={() => { setRevealed(true); speak(card.name_en); }}
              className="mt-3 rounded-2xl bg-secondary px-6 py-3 font-display font-bold text-secondary-foreground active:scale-95">
              Mostrar
            </button>
          </>
        ) : (
          <>
            <div className="mt-4 font-display text-3xl font-bold text-ink">{card.name_en}</div>
            <div className="text-sm text-ink-soft">{card.name_es}{card.phonetic_es ? ` · se dice: ${card.phonetic_es}` : ""}</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => rate(false)} className="rounded-2xl border border-border py-3 font-display font-bold text-ink active:scale-95">Le costó</button>
              <button onClick={() => rate(true)} className="rounded-2xl bg-primary py-3 font-display font-bold text-primary-foreground shadow-crayon active:scale-95">¡La sabía!</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- utilidades ---------- */
function SpeakerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 010 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function Wiggle() {
  return <style>{`@keyframes wiggle{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>;
}
