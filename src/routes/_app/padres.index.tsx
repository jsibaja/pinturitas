import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchPlans } from "@/lib/queries";
import { fetchMyRole, isAdminRole } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { useTheme, type Theme } from "@/lib/theme-provider";
import { MathGate } from "@/components/MathGate";

export const Route = createFileRoute("/_app/padres/")({
  component: PadresPage,
  head: () => ({
    meta: [
      { title: "Zona de Padres · Pinturitas" },
      { name: "description", content: "Planes y ajustes de la cuenta." },
    ],
  }),
});

function PadresPage() {
  const [unlocked, setUnlocked] = useState(false);
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-5">
      {unlocked ? (
        <ParentPanel />
      ) : (
        <MathGate title="Zona de Padres" onPass={() => setUnlocked(true)} />
      )}
    </div>
  );
}

function ParentPanel() {
  const navigate = useNavigate();
  const plansQ = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const { theme, setTheme } = useTheme();
  const plans = plansQ.data ?? [];

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: fetchMyRole, staleTime: 5 * 60 * 1000 });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold text-ink">Zona de Padres</h1>
      <p className="mb-6 text-sm text-ink-soft">Gestiona la suscripción y los ajustes.</p>

      {/* Acceso al panel de administración (solo owner/admin) */}
      {isAdminRole(roleQ.data ?? null) && (
        <Link
          to="/admin"
          className="mb-6 flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3"
        >
          <span className="font-display font-bold text-primary">🛡️ Panel de administración</span>
          <span className="text-primary">›</span>
        </Link>
      )}

      {/* Planes */}
      <section className="mb-8">
        <h2 className="mb-1 font-display text-xl font-bold text-ink">Elige tu plan</h2>
        <p className="mb-4 text-sm text-ink-soft">Ambos dan acceso completo. Solo cambia cada cuánto pagas.</p>

        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((p) => {
            const monthly = p.months > 0 ? p.price_usd / p.months : p.price_usd;
            return (
              <div
                key={p.id}
                className={`relative rounded-3xl border-2 bg-surface p-4 shadow-soft ${
                  p.is_best_value ? "border-primary" : "border-border"
                }`}
              >
                {p.is_best_value && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground">
                    MEJOR VALOR
                  </span>
                )}
                <div className="font-display text-lg font-bold text-ink">{p.name}</div>
                <div className="mt-1 font-display text-3xl font-bold text-ink">
                  ${p.price_usd.toFixed(2)}
                </div>
                <div className="text-xs text-ink-soft">
                  {p.billing_interval} · ${monthly.toFixed(2)}/mes
                </div>
                <ul className="mt-3 space-y-1 text-sm text-ink">
                  <li>✓ Todo incluido</li>
                  <li>✓ Los 33 mundos</li>
                  <li>✓ Sin anuncios</li>
                </ul>
                <button
                  disabled
                  className="mt-4 w-full cursor-not-allowed rounded-2xl bg-muted py-2.5 font-display text-sm font-bold text-ink-soft"
                  title="La pasarela de pago se conecta próximamente"
                >
                  Próximamente
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mi cuenta */}
      <AccountSettings />

      {/* Ajustes */}
      <section>
        <h2 className="mb-3 font-display text-xl font-bold text-ink">Ajustes</h2>

        <div className="rounded-3xl border border-border bg-surface p-4 shadow-soft">
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-ink">Tema</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "light", label: "Claro" },
                  { id: "dark", label: "Oscuro" },
                  { id: "system", label: "Sistema" },
                ] as { id: Theme; label: string }[]
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  aria-pressed={theme === t.id}
                  className={`rounded-2xl py-2.5 font-display text-sm font-bold transition-colors ${
                    theme === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-ink-soft"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full rounded-2xl border border-border py-3 font-display font-bold text-ink active:scale-95"
          >
            Cerrar sesión
          </button>
        </div>
      </section>
    </div>
  );
}

/**
 * Mi cuenta: cualquier usuario puede cambiar su propio nombre y su contraseña.
 * El nombre va a profiles (la política RLS permite editar el propio perfil) y la
 * contraseña usa la sesión activa, sin pasar por el panel de administración.
 */
function AccountSettings() {
  const qc = useQueryClient();
  const meQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      if (!uid) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .eq("id", uid)
        .maybeSingle();
      return data;
    },
  });

  const [name, setName] = useState("");
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const loadedName = meQ.data?.display_name ?? "";

  function flash(text: string, bad = false) {
    setMsg({ text, bad });
    setTimeout(() => setMsg(null), 3000);
  }

  async function saveName() {
    const value = (name || loadedName).trim();
    if (!value) return flash("Escribe un nombre", true);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: value })
      .eq("id", meQ.data!.id);
    setSaving(false);
    if (error) return flash("No se pudo guardar el nombre", true);
    void qc.invalidateQueries({ queryKey: ["my-profile"] });
    flash("Nombre actualizado");
  }

  async function savePassword() {
    if (pass1.length < 6) return flash("La contraseña debe tener al menos 6 caracteres", true);
    if (pass1 !== pass2) return flash("Las contraseñas no coinciden", true);
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pass1 });
    setSaving(false);
    if (error) return flash(error.message, true);
    setPass1("");
    setPass2("");
    flash("Contraseña actualizada");
  }

  if (!meQ.data) return null;

  const field =
    "w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-ink outline-none focus:border-primary";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft";

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-xl font-bold text-ink">Mi cuenta</h2>
      <div className="space-y-4 rounded-3xl border border-border bg-surface p-4 shadow-soft">
        <div>
          <span className={label}>Correo</span>
          <p className="text-sm text-ink-soft">{meQ.data.email}</p>
        </div>

        <div>
          <label className={label} htmlFor="acc-name">Tu nombre</label>
          <div className="flex gap-2">
            <input
              id="acc-name"
              value={name || loadedName}
              onChange={(e) => setName(e.target.value)}
              className={field}
            />
            <button
              onClick={saveName}
              disabled={saving}
              className="shrink-0 rounded-xl bg-secondary px-4 font-bold text-secondary-foreground disabled:opacity-60"
            >
              Guardar
            </button>
          </div>
        </div>

        <div>
          <label className={label} htmlFor="acc-pass">Cambiar contraseña</label>
          <div className="space-y-2">
            <input
              id="acc-pass"
              type="password"
              value={pass1}
              onChange={(e) => setPass1(e.target.value)}
              placeholder="Nueva contraseña (mín. 6)"
              className={field}
            />
            <input
              type="password"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
              placeholder="Repite la contraseña"
              className={field}
            />
            <button
              onClick={savePassword}
              disabled={saving || !pass1}
              className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground disabled:opacity-60"
            >
              Actualizar contraseña
            </button>
          </div>
        </div>

        {msg && (
          <p className={`text-sm font-semibold ${msg.bad ? "text-destructive" : "text-secondary"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </section>
  );
}
