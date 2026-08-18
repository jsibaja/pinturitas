import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ColoringCanvas, type ColoringCanvasHandle } from "@/components/coloring/ColoringCanvas";
import { speak } from "@/lib/speech";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Pinturitas · Aprende inglés dibujando" },
      {
        name: "description",
        content:
          "Aprender inglés nunca fue tan divertido. Tu hijo aprende inglés dibujando con el dedo, jugando y sin frustraciones. Para niños de 3 a 7 años: suscríbete y desbloquea los 33 mundos.",
      },
      { property: "og:title", content: "Pinturitas · Aprende inglés dibujando" },
      {
        property: "og:description",
        content: "Aprender inglés nunca fue tan divertido: tu hijo pinta con el dedo, escucha la palabra y la aprende jugando. Fácil y sin frustraciones. 3 a 7 años.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

/* ---------- datos estáticos (página pública, sin auth) ---------- */

const WORLDS = [
  { slug: "pets", name: "Mis Mascotas" },
  { slug: "farm", name: "La Granja" },
  { slug: "wild", name: "Animales Salvajes" },
  { slug: "forest", name: "El Bosque" },
  { slug: "ocean", name: "El Océano" },
  { slug: "flying", name: "Los que Vuelan" },
  { slug: "bugs", name: "Bichitos" },
  { slug: "dinosaurs", name: "Dinosaurios" },
  { slug: "vehicles", name: "Vehículos" },
  { slug: "space", name: "El Espacio" },
  { slug: "princesses-castle", name: "Princesas y Castillos" },
  { slug: "food", name: "Comida Rica" },
  { slug: "sports", name: "Deportes" },
  { slug: "jobs", name: "Profesiones" },
  { slug: "instruments", name: "Instrumentos" },
  { slug: "beach", name: "La Playa" },
  { slug: "holidays", name: "Fiestas" },
  { slug: "fruits", name: "Frutas" },
  { slug: "vegetables", name: "Verduras" },
  { slug: "family", name: "La Familia" },
  { slug: "body", name: "El Cuerpo" },
  { slug: "clothes", name: "La Ropa" },
  { slug: "colors", name: "Colores" },
  { slug: "shapes", name: "Formas" },
  { slug: "numbers", name: "Números" },
  { slug: "home", name: "La Casa" },
  { slug: "kitchen", name: "La Cocina" },
  { slug: "toys", name: "Juguetes" },
  { slug: "school", name: "La Escuela" },
  { slug: "nature", name: "Naturaleza" },
  { slug: "weather", name: "El Clima" },
  { slug: "city", name: "En la Ciudad" },
  { slug: "tools", name: "Herramientas" },
];

const STEPS = [
  { n: "1", title: "Elige un dibujo", body: "Más de 630 láminas en 33 mundos: animales, números, colores, el cuerpo, la comida y mucho más.", img: "/line-art/pets/dog.png" },
  { n: "2", title: "Coloréalo con el dedo", body: "El color nunca se sale de la línea. Toca una zona y se llena, o pinta libre. Cero frustración.", img: "/landing/dog-color.png" },
  { n: "3", title: "Aprende la palabra", body: "Al colorear, escucha el nombre en inglés y en español. Aprende sin darse cuenta.", img: null },
];

const BENEFITS = [
  ["🗣️", "Sus primeras palabras en inglés", "Nombra animales, colores y objetos en inglés desde pequeño, sin traducir ni memorizar de memoria."],
  ["✍️", "Una mano lista para escribir", "Colorear fortalece la motricidad fina y la coordinación ojo-mano que necesitará para tomar el lápiz."],
  ["🎯", "Más concentración", "Sesiones cortas y absorbentes que entrenan su atención, sin sobreestimularlo con ruido y pantallas rápidas."],
  ["🎨", "Creatividad y expresión", "Elige colores, decide, crea. Un espacio tranquilo donde no existen las respuestas incorrectas."],
  ["💛", "Confianza en sí mismo", "Cada dibujo terminado es un logro suyo. Lo completa, lo guarda en su galería y se siente orgulloso."],
  ["📚", "Amor por aprender", "Asocia el inglés con algo que disfruta. Aprender deja de ser una tarea y se convierte en su juego favorito."],
];

const PLANS = [
  {
    name: "Mensual",
    price: "4.99",
    per: "al mes",
    note: "Cancela cuando quieras.",
    best: false,
  },
  {
    name: "Anual",
    price: "29.99",
    per: "al año",
    note: "Equivale a $2.50/mes · Ahorras casi $30 al año.",
    best: true,
    tag: "Ahorra 50%",
  },
];

const PLAN_FEATURES = [
  "Los 33 mundos completos (630+ láminas)",
  "Cada palabra con audio en inglés y español",
  "Los juegos de vocabulario",
  "Galería con todas sus obras",
  "Hasta 4 perfiles de niño",
  "Panel de progreso para papás",
  "Mundos nuevos cada mes",
  "Sin anuncios ni enlaces externos",
];

const FAQS = [
  { q: "¿Para qué edad es?", a: "Para niños de 3 a 7 años. No necesita saber leer ni tener conocimientos previos de inglés." },
  { q: "¿Yo necesito saber inglés?", a: "No. Cada palabra se pronuncia sola dentro de la app, en inglés y en español, con la pronunciación escrita para que tu hijo también la diga." },
  { q: "¿De verdad aprende o solo se entretiene?", a: "Aprende jugando. Al colorear escucha y repite la palabra, la asocia a la imagen y al color. Es la forma más natural de adquirir vocabulario a esta edad — y tú ves su avance en el panel de padres." },
  { q: "¿Tiene anuncios o compras dentro del juego?", a: "No. No hay publicidad ni enlaces externos en la zona del niño. Los pagos viven detrás de una puerta para adultos." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Cancelas cuando quieras desde la zona de padres, sin permanencia ni penalizaciones. Mantienes el acceso hasta que termine el periodo que ya pagaste." },
  { q: "¿Funciona sin internet?", a: "Los mundos que ya visitaste quedan disponibles sin conexión, y lo que pinta se guarda al recuperar la señal." },
  { q: "¿Puedo tener varios hijos en una cuenta?", a: "Sí, hasta 4 perfiles, cada uno con su propio progreso y galería." },
];

/* ---------- página ---------- */

function LandingPage() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);
  const appLabel = authed ? "Ir a mi app" : "Entrar";

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-paper/85 backdrop-blur safe-top">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/brand/app-icon.png" alt="" className="h-9 w-9 rounded-xl object-cover" onError={hideImg} />
            <span className="font-display text-xl font-bold text-primary">Pinturitas</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="rounded-full px-4 py-2 font-display text-sm font-bold text-ink-soft hover:text-ink">
              {appLabel}
            </Link>
            <a href="#planes" className="rounded-full bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground shadow-crayon active:scale-95">
              Suscribirme
            </a>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-block rounded-full bg-secondary/15 px-3 py-1 font-display text-xs font-bold text-secondary">
              Para niños de 3 a 7 años
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] text-ink sm:text-5xl">
              Aprender inglés nunca fue tan <span className="text-primary">divertido</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-ink-soft">
              Tu hijo aprende inglés <strong className="text-ink">dibujando</strong> con el dedo: escucha cada palabra
              y la repite jugando. <strong className="text-ink">Fácil y sin frustraciones</strong> — querrá volver a
              aprender todos los días. Una ventaja que le durará toda la vida.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#planes" className="rounded-2xl bg-primary px-7 py-4 font-display text-lg font-bold text-primary-foreground shadow-crayon active:scale-95">
                Ver los planes
              </a>
              <a href="#beneficios" className="rounded-2xl border border-border px-6 py-4 font-display font-bold text-ink hover:bg-surface">
                ¿Por qué funciona?
              </a>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              Acceso completo para toda la familia ·{" "}
              <Link to="/auth" className="font-semibold text-primary">¿Ya tienes cuenta? Entra</Link>
            </p>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {["butterfly", "lion", "goldfish", "elephant"].map((s, i) => (
                <img key={s} src={`/landing/${s}-color.png`} alt="" onError={hideImg}
                  className={`w-full rounded-3xl bg-surface p-2 shadow-crayon ${i % 2 ? "translate-y-4" : ""}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-achievement/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />
      </section>

      {/* TRUST BAR */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-4 py-6 text-center">
          {[["33", "mundos"], ["+630", "dibujos"], ["+600", "palabras en inglés"]].map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-3xl font-bold text-primary">{n}</div>
              <div className="text-sm text-ink-soft">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* LA VENTANA DE ORO (por qué el inglés temprano) */}
      <section id="beneficios" className="mx-auto max-w-4xl px-4 py-16 text-center">
        <span className="font-display text-sm font-bold uppercase tracking-wide text-secondary">La ventana de oro</span>
        <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
          Los primeros años no se repiten
        </h2>
        <p className="mt-4 text-lg text-ink-soft">
          Entre los 3 y los 7 años, el cerebro de tu hijo vive su etapa más receptiva para los idiomas: absorbe
          sonidos y palabras con una naturalidad que después cuesta mucho más lograr. Pinturitas aprovecha justo
          esa ventana — y lo hace <strong className="text-ink">jugando</strong>, cuando su curiosidad está más despierta.
        </p>
        <p className="mt-3 font-display text-xl font-bold text-primary">
          Empezar hoy es regalarle años de ventaja.
        </p>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-ink sm:text-4xl">Aprende inglés dibujando</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-ink-soft">Así de simple: tres pasos que tu hijo entiende sin que le expliques.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.n} className="rounded-3xl border border-border bg-paper p-6 shadow-soft">
                <div className="canvas-paper mb-5 grid aspect-square place-items-center overflow-hidden rounded-2xl">
                  {s.img ? <img src={s.img} alt="" className="h-full w-full object-contain p-2" onError={hideImg} /> : <WordCardMock />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full font-display font-bold text-white"
                    style={{ background: i === 0 ? "var(--color-secondary)" : i === 1 ? "var(--color-primary)" : "var(--color-achievement)" }}>
                    {s.n}
                  </span>
                  <h3 className="font-display text-xl font-bold text-ink">{s.title}</h3>
                </div>
                <p className="mt-2 text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO INTERACTIVO */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <span className="font-display text-sm font-bold uppercase tracking-wide text-secondary">Pruébalo tú mismo</span>
        <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">Coloréalo aquí mismo</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">
          Elige un color, rellena o <strong className="text-ink">pinta con el dedo</strong>, y al colorear
          <strong className="text-ink"> escucha el nombre en inglés</strong>. Así de fácil aprende tu hijo — y el color nunca se sale de la línea.
        </p>
        <div className="mt-8">
          <DemoColoring />
        </div>
      </section>

      {/* LO QUE TU HIJO GANA (beneficios) */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Mucho más que aprender inglés</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-soft">
            Cada rato coloreando, tu hijo desarrolla habilidades que lo acompañarán el resto de su vida.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(([e, t, b]) => (
            <div key={t} className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-2xl">{e}</div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">{t}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DE LA CULPA AL ORGULLO (reencuadre del tiempo de pantalla) */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">El tiempo de pantalla, sin culpa</h2>
          <p className="mt-4 text-lg opacity-95">
            Sabemos lo que es ceder la tablet y sentir que pierdes la batalla. Con Pinturitas, esos minutos dejan
            de ser tiempo vacío: tu hijo colorea tranquilo mientras aprende algo que le servirá toda la vida.
          </p>
          <p className="mt-3 font-display text-xl font-bold">Tú respiras. Él crece.</p>
        </div>
      </section>

      {/* MUNDOS */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">33 mundos para explorar</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">De las mascotas al fondo del mar. Cada mundo, una aventura nueva y decenas de palabras que aprende sin darse cuenta.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {WORLDS.map((w) => (
            <div key={w.slug} className="relative overflow-hidden rounded-2xl shadow-soft">
              <img src={`/covers/${w.slug}.png`} alt={w.name} loading="lazy" decoding="async" className="aspect-square w-full object-cover" onError={hideImg} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                <span className="font-display text-xs font-bold text-white">{w.name}</span>
              </div>
            </div>
          ))}
          <div className="grid aspect-square place-items-center rounded-2xl bg-primary/10 text-center">
            <span className="px-2 font-display text-sm font-bold text-primary">+ vocabulario nuevo cada mes</span>
          </div>
        </div>
      </section>

      {/* JUEGOS */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <span className="font-display text-sm font-bold uppercase tracking-wide text-secondary">Además de colorear</span>
        <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">El inglés se vuelve su juego favorito</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">
          5 mini-juegos que repasan las palabras que tu hijo aprendió coloreando. Para él es solo diversión —
          para ti, vocabulario que se le queda.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["👂", "Escucha y Toca"],
            ["🃏", "Memorama"],
            ["🕵️", "¿Quién soy?"],
            ["🎨", "Pinta lo que escuchas"],
            ["⭐", "Repaso del día"],
          ].map(([e, t]) => (
            <div key={t} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
              <div className="text-3xl">{e}</div>
              <div className="mt-2 font-display text-sm font-bold leading-tight text-ink">{t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BILINGÜE HABLADO */}
      <section className="bg-surface py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <span className="font-display text-sm font-bold uppercase tracking-wide text-secondary">Bilingüe y hablado</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">Escucha, repite, aprende</h2>
            <p className="mt-4 text-lg text-ink-soft">
              Cada dibujo y cada color se pronuncian en inglés y en español. Tu hijo asocia la imagen, el sonido y
              el color a la vez — la forma más natural de aprender un idioma a esta edad.
            </p>
            <ul className="mt-5 space-y-2 text-ink">
              <li className="flex gap-2"><span className="text-secondary">✓</span> Pronunciación en inglés real, dentro de la app</li>
              <li className="flex gap-2"><span className="text-secondary">✓</span> La paleta también enseña los colores en inglés</li>
              <li className="flex gap-2"><span className="text-secondary">✓</span> Pronunciación escrita para que tu hijo también la diga</li>
            </ul>
          </div>
          <div className="order-1 flex justify-center md:order-2"><WordCardMock large /></div>
        </div>
      </section>

      {/* UN RATO QUE LOS UNE (vínculo) */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            {["turtle", "dolphin", "cow", "goldfish"].map((s) => (
              <img key={s} src={`/landing/${s}-color.png`} alt="" className="w-full rounded-3xl bg-surface p-2 shadow-soft" onError={hideImg} />
            ))}
          </div>
          <div>
            <span className="font-display text-sm font-bold uppercase tracking-wide text-secondary">Juntos</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">Un rato que los une</h2>
            <p className="mt-4 text-lg text-ink-soft">
              Siéntate a su lado, repite las palabras en inglés con él, celebra cada dibujo terminado. No necesitas
              saber inglés — la app lo pronuncia por ti. Aprenden juntos, y esos momentos son los que él recordará.
            </p>
          </div>
        </div>
      </section>

      {/* PARA PAPÁS */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-ink sm:text-4xl">Tranquilidad para ti</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["📈", "Ves su progreso", "Cuántas palabras domina y cuánto ha jugado, en un panel claro."],
              ["🔒", "Zona de padres", "Los ajustes y pagos viven detrás de una puerta que el niño no cruza."],
              ["🚫", "Sin anuncios", "Nada de publicidad ni enlaces externos mientras tu hijo colorea."],
              ["👨‍👩‍👧", "Hasta 4 hijos", "Un perfil por niño, cada uno con su galería y su progreso."],
            ].map(([e, t, b]) => (
              <div key={t} className="rounded-3xl border border-border bg-paper p-5 shadow-soft">
                <div className="text-3xl">{e}</div>
                <h3 className="mt-3 font-display text-lg font-bold text-ink">{t}</h3>
                <p className="mt-1 text-sm text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NUESTRA MISIÓN */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="text-4xl">💛</div>
        <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">Por qué hicimos Pinturitas</h2>
        <p className="mt-4 text-lg text-ink-soft">
          Creemos que las horas frente a una pantalla pueden ser algo más que ruido y colores que pasan. Nacimos
          con una idea simple: convertir el rato favorito de tu hijo —colorear— en su primera puerta al inglés, en
          los años en que su mente más lo aprovecha. Sin presión, sin tareas, sin apuros. Solo un niño, sus colores
          y una palabra nueva cada día.
        </p>
        <p className="mt-4 font-display text-lg font-bold text-primary">Ese es todo nuestro propósito.</p>
        <p className="mt-2 text-sm text-ink-soft">— El equipo de Pinturitas</p>
      </section>

      {/* PLANES (2) */}
      <section id="planes" className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-3 text-center">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Un precio, todo incluido</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">
            Los dos planes dan exactamente lo mismo. Al pagar anual, ahorras la mitad.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PLANS.map((p) => (
            <div key={p.name} className={`relative rounded-3xl border-2 bg-surface p-6 shadow-soft ${p.best ? "border-primary" : "border-border"}`}>
              {p.tag && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground">
                  {p.tag}
                </span>
              )}
              <div className="font-display text-lg font-bold text-ink">{p.name}</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="font-display text-4xl font-bold text-ink">${p.price}</span>
                <span className="pb-1 text-sm text-ink-soft">{p.per}</span>
              </div>
              <div className="min-h-[20px] text-xs text-ink-soft">{p.note}</div>
              <ul className="mt-4 space-y-1.5 text-sm text-ink">
                {PLAN_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-secondary">✓</span> {f}</li>
                ))}
              </ul>
              <button type="button" className={`mt-5 block w-full rounded-2xl py-3 text-center font-display font-bold active:scale-95 ${p.best ? "bg-primary text-primary-foreground shadow-crayon" : "border border-border text-ink"}`}>
                Suscribirme
              </button>
            </div>
          ))}
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-secondary">
          <span>✓</span> Cancela cuando quieras, sin permanencia ni letra chica.
        </p>
        <p className="mt-2 text-center text-sm text-ink-soft">
          El acceso es solo para suscriptores. ¿Ya tienes cuenta?{" "}
          <Link to="/auth" className="font-semibold text-primary">Entra aquí</Link>.
        </p>
      </section>

      {/* SIN RIESGO */}
      <section className="mx-auto max-w-4xl px-4 pb-2">
        <div className="rounded-3xl border border-border bg-surface p-6 text-center shadow-soft sm:p-8">
          <div className="text-3xl">🛡️</div>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink">Sin riesgo, sin ataduras</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              ["Cancela cuando quieras", "Sin permanencia ni letra chica."],
              ["Tú tienes el control", "Gestionas tu suscripción cuando lo decidas."],
              ["Acceso completo", "Desde el primer día, los 33 mundos."],
            ].map(([t, b]) => (
              <div key={t}>
                <div className="font-display font-bold text-ink">{t}</div>
                <div className="text-sm text-ink-soft">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-ink sm:text-4xl">Preguntas frecuentes</h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border bg-paper p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-display font-bold text-ink">
                  {f.q}
                  <span className="text-ink-soft transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="font-display text-4xl font-bold text-ink sm:text-5xl">
          Su ventaja empieza <span className="text-primary">hoy</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-ink-soft">
          Elige tu plan y desbloquea los 33 mundos para que tu hijo pinte su primera palabra en inglés.
        </p>
        <p className="mx-auto mt-3 max-w-lg font-display text-xl font-bold text-primary">
          El inglés deja de ser tarea y se vuelve su juego favorito.
        </p>
        <a href="#planes" className="mt-8 inline-block rounded-2xl bg-primary px-9 py-4 font-display text-lg font-bold text-primary-foreground shadow-crayon active:scale-95">
          Suscríbete ahora
        </a>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-ink-soft sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/brand/app-icon.png" alt="" className="h-7 w-7 rounded-lg object-cover" onError={hideImg} />
            <span className="font-display font-bold text-ink">Pinturitas</span>
          </div>
          <p>Colorea y aprende inglés · 3 a 7 años</p>
          <Link to="/auth" className="font-display font-bold text-primary">{appLabel}</Link>
        </div>
      </footer>
    </div>
  );
}

function hideImg(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.visibility = "hidden";
}

const DEMO_COLORS = [
  { hex: "#E2453C", en: "Red", es: "rojo" },
  { hex: "#F2842B", en: "Orange", es: "naranja" },
  { hex: "#FFC43D", en: "Yellow", es: "amarillo" },
  { hex: "#46B45C", en: "Green", es: "verde" },
  { hex: "#2F7FEA", en: "Blue", es: "azul" },
  { hex: "#8B5CF6", en: "Purple", es: "morado" },
  { hex: "#96613B", en: "Brown", es: "café" },
  { hex: "#2B2B2B", en: "Black", es: "negro" },
];

/** La palabra que enseña el dibujo del demo (lámina: perro). */
const DEMO_WORD = { en: "Dog", es: "perro" };

/** Mini estudio de coloreo en la landing: el mismo motor real de la app. */
function DemoColoring() {
  const ref = useRef<ColoringCanvasHandle>(null);
  const [color, setColor] = useState(DEMO_COLORS[1].hex);
  const [tool, setTool] = useState<"fill" | "brush">("fill");

  // El nombre se escucha SOLO al tocar la bocina, y SOLO en inglés.
  const sayWord = () => speak(DEMO_WORD.en);

  return (
    <div className="mx-auto max-w-sm">
      {/* Tarjeta de palabra: toca para escuchar el nombre en inglés */}
      <button
        type="button"
        onClick={sayWord}
        aria-label={`Escuchar "${DEMO_WORD.en}" en inglés`}
        className="mx-auto mb-4 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-soft transition-transform active:scale-95"
      >
        <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-primary text-primary-foreground">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            <path d="M16.5 8.5a5 5 0 010 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-left leading-tight">
          <span className="block font-display text-2xl font-bold text-ink">{DEMO_WORD.en}</span>
          <span className="block text-xs text-ink-soft">{DEMO_WORD.es} · toca para escuchar 🔊</span>
        </span>
      </button>

      <ColoringCanvas
        ref={ref}
        imageUrl="/line-art/pets/dog.png"
        color={color}
        tool={tool}
        className="shadow-crayon"
      />

      {/* Herramienta: rellenar (balde) o pintar libre con el dedo */}
      <div className="mt-3 flex justify-center gap-2">
        {([
          ["fill", "🪣 Rellenar"],
          ["brush", "✏️ Pintar con el dedo"],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTool(t)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              tool === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-8 gap-2">
        {DEMO_COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => setColor(c.hex)}
            aria-label={`${c.en}, ${c.es}`}
            className="aspect-square rounded-xl border-2 transition-transform active:scale-90"
            style={{ background: c.hex, borderColor: color === c.hex ? "var(--color-ink)" : "rgba(0,0,0,.14)" }}
          />
        ))}
      </div>

      <button
        onClick={() => ref.current?.clear()}
        className="mt-3 rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        Reiniciar
      </button>

      {/* Deja claro que es apenas una muestra de todo lo que hay dentro */}
      <p className="mx-auto mt-6 max-w-md rounded-2xl bg-surface px-5 py-4 text-sm text-ink-soft">
        Esto es <strong className="text-ink">solo una muestra</strong>. Dentro, tu hijo encuentra
        <strong className="text-ink"> cientos de dibujos</strong> en 33 mundos,{" "}
        <strong className="text-ink">juegos para reforzar el inglés</strong>, cada palabra hablada,
        pinceles, premios y su avance guardado. Ideal para niños de <strong className="text-ink">3 a 7 años</strong>.
      </p>
    </div>
  );
}

/** Maqueta de la tarjeta de palabra (feature bilingüe hablado). */
function WordCardMock({ large = false }: { large?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-3xl border border-border bg-surface shadow-crayon ${large ? "w-full max-w-xs p-5" : "p-4"}`}>
      <div className="min-w-0 flex-1">
        <div className={`font-display font-bold text-ink ${large ? "text-4xl" : "text-2xl"}`}>Dog</div>
        <div className="text-sm text-ink-soft">perro</div>
        <div className="font-mono text-xs text-secondary">se dice: dog</div>
      </div>
      <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-primary text-primary-foreground">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          <path d="M16.5 8.5a5 5 0 010 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}
