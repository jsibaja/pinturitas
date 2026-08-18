import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  canManage,
  computeStats,
  createUserAccount,
  deleteUserAccount,
  fetchAdminUsers,
  fetchMyRole,
  fetchPlans,
  isAdminRole,
  sendAccessEmail,
  setUserActive,
  updateUserAdmin,
  updateUserEmail,
  updateUserPassword,
  type AdminPlan,
  type AdminRole,
  type AdminUser,
  type SubStatus,
} from "@/lib/admin";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Administración · Pinturitas" }] }),
});

const STATUSES: SubStatus[] = ["activa", "pendiente", "vencida", "cancelada"];
const ROLES: AdminRole[] = ["user", "admin", "owner"];
const ROLE_LABEL: Record<AdminRole, string> = { user: "Usuario", admin: "Admin", owner: "Owner" };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

/* ---------------- página ---------------- */

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [access, setAccess] = useState<"loading" | "ok" | "denied">("loading");
  const [myRole, setMyRole] = useState<AdminRole | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; bad?: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function flash(msg: string, bad = false) {
    setToast({ msg, bad });
    setTimeout(() => setToast(null), 3000);
  }

  // Guarda: solo owner/admin.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (alive) navigate({ to: "/auth" });
        return;
      }
      const role = await fetchMyRole();
      if (!alive) return;
      setMyId(data.session.user.id);
      setMyRole(role);
      if (isAdminRole(role)) {
        setAccess("ok");
      } else {
        setAccess("denied");
        navigate({ to: "/hoy" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: fetchAdminUsers, enabled: access === "ok" });
  const plansQ = useQuery({ queryKey: ["admin-plans"], queryFn: fetchPlans, enabled: access === "ok" });

  const users = useMemo(() => usersQ.data ?? [], [usersQ.data]);
  const plans = useMemo(() => plansQ.data ?? [], [plansQ.data]);
  const stats = useMemo(() => computeStats(users, plans), [users, plans]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q),
    );
  }, [users, search]);

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function run(id: string, fn: () => Promise<void>, okMsg: string) {
    setBusyId(id);
    try {
      await fn();
      refresh();
      flash(okMsg);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Algo salió mal", true);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(u: AdminUser) {
    if (u.id === myId) return flash("No puedes eliminar tu propia cuenta", true);
    if (!confirm(`¿Eliminar la cuenta de ${u.email}? Esta acción no se puede deshacer.`)) return;
    await run(u.id, () => deleteUserAccount(u.id), "Cuenta eliminada");
  }

  if (access !== "ok") {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-ink-soft">
        <span className="animate-pulse text-sm">
          {access === "loading" ? "Comprobando permisos…" : "Sin acceso"}
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-x safe-top">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Encabezado */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Administración</h1>
            <p className="text-sm text-ink-soft">
              Gestiona cuentas, accesos y planes · tu rol: <strong className="text-ink">{ROLE_LABEL[myRole ?? "user"]}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/hoy" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink hover:bg-muted">
              Volver a la app
            </Link>
            <button
              onClick={() => setCreating(true)}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-crayon active:scale-95"
            >
              + Nuevo usuario
            </button>
          </div>
        </div>

        {/* Dashboard */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Usuarios totales" value={stats.total} hint={`+${stats.newLast7} en 7 días`} />
          <StatCard label="Suscriptores activos" value={stats.active} hint={`${stats.activePaid} de pago`} accent />
          <StatCard label="Inactivos" value={stats.inactive} hint="sin acceso" />
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Por plan</div>
            <div className="mt-2 space-y-1">
              {stats.byPlan.map((p) => (
                <div key={p.code} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{p.name}</span>
                  <span className="font-display font-bold tabular-nums text-ink">{p.count}</span>
                </div>
              ))}
              {stats.byPlan.length === 0 && <div className="text-sm text-ink-soft">—</div>}
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="mt-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por correo o nombre…"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-ink outline-none placeholder:text-ink-soft focus:border-primary"
          />
        </div>

        {/* Tabla */}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usersQ.isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">Cargando usuarios…</td></tr>
              )}
              {usersQ.isError && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-destructive">No se pudieron cargar los usuarios.</td></tr>
              )}
              {!usersQ.isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">Sin resultados.</td></tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{u.displayName || "—"}</div>
                    <div className="text-xs text-ink-soft">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {u.planName ?? "—"}
                    {u.isPaid && <span className="ml-1 text-[10px] font-bold text-secondary">de pago</span>}
                  </td>
                  <td className="px-4 py-3"><StatusPill user={u} /></td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      u.role === "owner" ? "bg-primary/15 text-primary"
                      : u.role === "admin" ? "bg-secondary/15 text-secondary"
                      : "bg-muted text-ink-soft"}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const manageable = canManage(myRole, myId, u);
                      const why = u.id === myId
                        ? "Tu propia cuenta no se puede desactivar ni eliminar"
                        : "Solo puedes gestionar cuentas de rango inferior al tuyo";
                      if (!manageable) {
                        return (
                          <div className="flex justify-end">
                            <span className="text-xs text-ink-soft" title={why}>
                              {u.id === myId ? "— tu cuenta —" : "— protegida —"}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            disabled={busyId === u.id}
                            onClick={() => run(u.id, () => setUserActive(u, !u.isActive, plans), u.isActive ? "Acceso desactivado" : "Acceso activado")}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-50 ${
                              u.isActive ? "border border-border text-ink hover:bg-muted" : "bg-secondary text-secondary-foreground"}`}
                          >
                            {u.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() => setEditing(u)}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-muted"
                          >
                            Editar
                          </button>
                          <button
                            disabled={busyId === u.id}
                            onClick={() => handleDelete(u)}
                            title="Eliminar cuenta"
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-40"
                          >
                            🗑️
                          </button>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditModal
          user={editing}
          plans={plans}
          myRole={myRole}
          onClose={() => setEditing(null)}
          onDone={(msg, bad) => { refresh(); flash(msg, bad); }}
        />
      )}
      {creating && (
        <CreateModal
          plans={plans}
          myRole={myRole}
          onClose={() => setCreating(false)}
          onDone={(msg, bad) => { refresh(); flash(msg, bad); }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-crayon ${
          toast.bad ? "bg-destructive text-destructive-foreground" : "bg-ink text-background"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ---------------- piezas ---------------- */

function StatCard({ label, value, hint, accent }: { label: string; value: number; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className={`mt-1 font-display text-3xl font-bold tabular-nums ${accent ? "text-secondary" : "text-ink"}`}>{value}</div>
      {hint && <div className="text-xs text-ink-soft">{hint}</div>}
    </div>
  );
}

function StatusPill({ user }: { user: AdminUser }) {
  if (user.isActive) {
    return <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-bold text-secondary">Activa</span>;
  }
  const label = user.status ? user.status[0].toUpperCase() + user.status.slice(1) : "Sin acceso";
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-ink-soft">{label}</span>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-surface p-6 shadow-crayon"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-2xl leading-none text-ink-soft hover:text-ink">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-ink outline-none focus:border-primary";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft";

function EditModal({
  user, plans, myRole, onClose, onDone,
}: {
  user: AdminUser; plans: AdminPlan[]; myRole: AdminRole | null;
  onClose: () => void; onDone: (msg: string, bad?: boolean) => void;
}) {
  const [name, setName] = useState(user.displayName);
  const [planCode, setPlanCode] = useState(user.planCode ?? plans[0]?.code ?? "");
  const [status, setStatus] = useState<SubStatus>(user.status ?? "activa");
  const [role, setRole] = useState<AdminRole>(user.role);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const canSetOwner = myRole === "owner";

  async function save() {
    setSaving(true);
    try {
      await updateUserAdmin({ user, displayName: name, planCode, status, role, plans });
      if (email.trim() && email.trim() !== user.email) await updateUserEmail(user.id, email.trim());
      if (password) await updateUserPassword(user.id, password);
      onDone("Cambios guardados");
      onClose();
    } catch (e) {
      onDone(e instanceof Error ? e.message : "No se pudo guardar", true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Editar usuario" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Correo</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Nueva contraseña (opcional)</label>
          <input
            value={password} onChange={(e) => setPassword(e.target.value)}
            type="text" placeholder="Dejar vacío para no cambiarla" className={inputCls}
          />
        </div>
        <button
          type="button"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            try {
              await sendAccessEmail(user.email);
              onDone(`Correo enviado a ${user.email}`);
            } catch (e) {
              onDone(e instanceof Error ? e.message : "No se pudo enviar el correo", true);
            } finally {
              setSending(false);
            }
          }}
          className="w-full rounded-xl border border-secondary/50 bg-secondary/10 py-2.5 text-sm font-bold text-secondary disabled:opacity-60"
        >
          {sending ? "Enviando…" : "✉️ Enviarle correo para crear su contraseña"}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Plan</label>
            <select value={planCode} onChange={(e) => setPlanCode(e.target.value)} className={inputCls}>
              {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as SubStatus)} className={inputCls}>
              {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className={inputCls}>
            {ROLES.filter((r) => r !== "owner" || canSetOwner).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          {!canSetOwner && <p className="mt-1 text-xs text-ink-soft">Solo un owner puede asignar el rol Owner.</p>}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-3 font-semibold text-ink hover:bg-muted">
            Cancelar
          </button>
          <button
            onClick={save} disabled={saving}
            className="flex-1 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CreateModal({
  plans, myRole, onClose, onDone,
}: {
  plans: AdminPlan[]; myRole: AdminRole | null;
  onClose: () => void; onDone: (msg: string, bad?: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [planCode, setPlanCode] = useState(plans[0]?.code ?? "");
  const [role, setRole] = useState<AdminRole>("user");
  const [status, setStatus] = useState<SubStatus>("activa");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!email.trim() || password.length < 6) {
      onDone("Correo obligatorio y contraseña de al menos 6 caracteres", true);
      return;
    }
    setSaving(true);
    try {
      await createUserAccount({
        email: email.trim(),
        password,
        display_name: name.trim(),
        plan_code: planCode || undefined,
        role,
        status,
      });
      if (notify) {
        // La cuenta ya quedó creada; si el correo falla lo decimos, pero no
        // damos el alta por fallida.
        try {
          await sendAccessEmail(email.trim());
          onDone("Usuario creado y correo enviado");
        } catch (e) {
          onDone(
            `Usuario creado, pero no se pudo enviar el correo: ${
              e instanceof Error ? e.message : "error desconocido"
            }`,
            true,
          );
        }
      } else {
        onDone("Usuario creado");
      }
      onClose();
    } catch (e) {
      onDone(e instanceof Error ? e.message : "No se pudo crear la cuenta", true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Correo *</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Contraseña * (mín. 6)</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="text" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Plan</label>
            <select value={planCode} onChange={(e) => setPlanCode(e.target.value)} className={inputCls}>
              {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as SubStatus)} className={inputCls}>
              {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className={inputCls}>
            {ROLES.filter((r) => r !== "owner" || myRole === "owner").map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-paper p-3">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm text-ink">
            Enviarle un correo para que cree su contraseña
            <span className="block text-xs text-ink-soft">
              Recibe un enlace y elige su propia clave. Si lo desactivas, tendrás que pasarle la
              contraseña tú mismo.
            </span>
          </span>
        </label>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-3 font-semibold text-ink hover:bg-muted">
            Cancelar
          </button>
          <button
            onClick={create} disabled={saving}
            className="flex-1 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Creando…" : "Crear cuenta"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
