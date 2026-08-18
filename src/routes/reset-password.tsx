import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Restablecer contraseña · Pinturitas" },
      { name: "description", content: "Elige una nueva contraseña para tu cuenta de Pinturitas." },
      { property: "og:title", content: "Restablecer contraseña · Pinturitas" },
      { property: "og:description", content: "Elige una nueva contraseña para tu cuenta de Pinturitas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) {
        setHasSession(true);
        setReady(true);
      }
    });

    (async () => {
      // El enlace del correo puede llegar en tres formatos según la plantilla:
      //  1) #access_token=...        -> supabase-js lo canjea solo
      //  2) ?code=...        (PKCE)  -> hay que canjearlo
      //  3) ?token_hash=...&type=recovery -> hay que verificarlo
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");

      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch {
          /* se maneja abajo con getSession */
        }
      } else if (tokenHash && (type === "recovery" || type === "email")) {
        try {
          await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        } catch {
          /* se maneja abajo con getSession */
        }
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setHasSession(Boolean(data.session));
      setReady(true);
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/hoy" }), 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/should be different/i.test(msg)) setError("La nueva contraseña debe ser distinta a la anterior.");
      else if (/expired|invalid/i.test(msg)) setError("El enlace expiró. Pide uno nuevo desde “¿Olvidaste tu contraseña?”.");
      else setError("No pudimos actualizar la contraseña. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-primary text-3xl shadow-crayon">
            🎨
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">Nueva contraseña</h1>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-crayon">
          {!ready && <p className="text-sm text-ink-soft">Verificando el enlace…</p>}

          {ready && !hasSession && (
            <div className="space-y-3">
              <p className="text-sm text-ink">
                El enlace no es válido o ya expiró. Solicita uno nuevo desde la pantalla de inicio de sesión.
              </p>
              <button
                onClick={() => navigate({ to: "/auth" })}
                className="w-full rounded-2xl bg-primary py-3.5 font-display font-bold text-primary-foreground shadow-crayon"
              >
                Volver a entrar
              </button>
            </div>
          )}

          {ready && hasSession && !done && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Nueva contraseña</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-ink outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Repite la contraseña</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-ink outline-none focus:border-primary"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-primary py-3.5 font-display font-bold text-primary-foreground shadow-crayon transition active:scale-[.99] disabled:opacity-60"
              >
                {busy ? "Guardando…" : "Guardar contraseña"}
              </button>
            </form>
          )}

          {done && (
            <p className="rounded-xl bg-secondary/10 px-3 py-2 text-sm text-secondary">
              ¡Listo! Tu contraseña se actualizó. Te llevamos a la app…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
