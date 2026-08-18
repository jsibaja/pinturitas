import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar · Pinturitas" },
      { name: "description", content: "Inicia sesión en tu cuenta de Pinturitas." },
    ],
  }),
});

type Mode = "login" | "reset";

/**
 * Acceso a Pinturitas. SOLO para suscriptores: no hay registro libre.
 * Las cuentas se crean al contratar una suscripción (pasarela conectada
 * más adelante). Aquí solo se inicia sesión o se recupera la contraseña.
 */
function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/hoy" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("Si tu correo tiene una cuenta, te enviamos un enlace para restablecer la contraseña.");
        setMode("login");
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-primary text-3xl shadow-crayon">
            🎨
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink">Pinturitas</h1>
          <p className="mt-1 text-sm text-ink-soft">Colorea y aprende inglés</p>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-crayon">
          <h2 className="mb-1 font-display text-xl font-bold text-ink">
            {mode === "login" ? "Inicia sesión" : "Recuperar contraseña"}
          </h2>
          <p className="mb-5 text-sm text-ink-soft">
            {mode === "login"
              ? "Entra con la cuenta de tu suscripción."
              : "Te enviaremos un enlace a tu correo."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Correo</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-ink outline-none focus:border-primary"
              />
            </div>

            {mode === "login" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Contraseña</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-ink outline-none focus:border-primary"
                />
              </div>
            )}

            {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            {notice && <p className="rounded-xl bg-secondary/10 px-3 py-2 text-sm text-secondary">{notice}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-primary py-3.5 font-display font-bold text-primary-foreground shadow-crayon transition active:scale-[.99] disabled:opacity-60"
            >
              {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Enviar enlace"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            {mode === "login" ? (
              <button onClick={() => { setMode("reset"); setError(null); setNotice(null); }} className="text-ink-soft hover:text-primary">
                ¿Olvidaste tu contraseña?
              </button>
            ) : (
              <button onClick={() => { setMode("login"); setError(null); setNotice(null); }} className="font-semibold text-primary">
                Volver a entrar
              </button>
            )}
          </div>
        </div>

        {/* Sin registro libre: el acceso es solo para suscriptores */}
        <p className="mt-5 text-center text-sm text-ink-soft">
          ¿Aún no tienes acceso?{" "}
          <Link to="/" className="font-display font-bold text-primary">
            Conoce los planes
          </Link>
        </p>
      </div>
    </div>
  );
}

function translateAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos.";
  if (/email not confirmed/i.test(msg)) return "Debes confirmar tu correo antes de entrar.";
  if (/rate limit/i.test(msg)) return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  return "No pudimos completar la acción. Revisa los datos e inténtalo de nuevo.";
}
