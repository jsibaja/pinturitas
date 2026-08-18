/**
 * Capa de datos del panel de administración.
 *
 * Reparto de responsabilidades:
 * - Lecturas y cambios de plan/estado/rol: van directo a la base de datos y
 *   están protegidos por RLS (solo pasan si quien llama es owner/admin).
 * - Operaciones de CUENTA (crear, eliminar, cambiar correo o contraseña):
 *   van a la edge function `admin-users`, que es la única que usa service_role.
 *   Nunca se maneja esa clave en el navegador.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * `user_roles` es una tabla nueva y los tipos generados de Supabase todavía no
 * la incluyen (ese archivo se regenera solo). Para no editar el archivo
 * generado, las consultas a esa tabla usan el cliente sin tipar.
 */
const db = supabase as unknown as SupabaseClient;

export type AdminRole = "owner" | "admin" | "user";
export type SubStatus = "pendiente" | "activa" | "vencida" | "cancelada";

export type AdminPlan = { id: string; code: string; name: string; months: number | null };

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  role: AdminRole;
  /** Estado de la suscripción; null si nunca tuvo uma. */
  status: SubStatus | null;
  planCode: string | null;
  planName: string | null;
  subscriptionId: string | null;
  /** true si la suscripción vino de una pasarela de pago (no activada a mano). */
  isPaid: boolean;
  renewsAt: string | null;
  /** Acceso efectivo a la app. */
  isActive: boolean;
};

export type AdminStats = {
  total: number;
  newLast7: number;
  active: number;
  activePaid: number;
  inactive: number;
  byPlan: { code: string; name: string; count: number }[];
};

/* ---------- rol del usuario actual ---------- */

export async function fetchMyRole(): Promise<AdminRole | null> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) return null;
  const { data, error } = await db.from("user_roles").select("role").eq("user_id", uid);
  if (error || !data?.length) return null;
  const roles = data.map((r) => r.role as AdminRole);
  if (roles.includes("owner")) return "owner";
  if (roles.includes("admin")) return "admin";
  return "user";
}

export function isAdminRole(role: AdminRole | null): boolean {
  return role === "owner" || role === "admin";
}

/** Jerarquía: owner(3) > admin(2) > usuario(1). */
export function roleRank(role: AdminRole): number {
  return role === "owner" ? 3 : role === "admin" ? 2 : 1;
}

/**
 * Solo se gestiona a cuentas de rango ESTRICTAMENTE inferior, y nunca a la
 * propia: así ningún administrador puede desactivarse ni eliminarse (si se va,
 * nadie quedaría con acceso). La base de datos aplica la misma regla.
 */
export function canManage(myRole: AdminRole | null, myId: string | null, target: AdminUser): boolean {
  if (!myRole || !myId) return false;
  if (target.id === myId) return false;
  return roleRank(myRole) > roleRank(target.role);
}

/* ---------- catálogo de planes ---------- */

export async function fetchPlans(): Promise<AdminPlan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, code, name, months")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as AdminPlan[];
}

/* ---------- listado de usuarios ---------- */

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  subscriptions: {
    id: string;
    status: SubStatus;
    renews_at: string | null;
    external_reference: string | null;
    plans: { code: string; name: string } | null;
  }[] | null;
};

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const [{ data: profiles, error }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, email, display_name, created_at, subscriptions(id, status, renews_at, external_reference, plans(code, name))",
      )
      .order("created_at", { ascending: false }),
    db.from("user_roles").select("user_id, role"),
  ]);
  if (error) throw error;

  const roleByUser = new Map<string, AdminRole>();
  for (const r of (roleRows ?? []) as { user_id: string; role: AdminRole }[]) {
    const prev = roleByUser.get(r.user_id);
    // owner manda sobre admin, y admin sobre user
    if (prev === "owner") continue;
    if (prev === "admin" && r.role === "user") continue;
    roleByUser.set(r.user_id, r.role);
  }

  return ((profiles ?? []) as ProfileRow[]).map((p) => {
    // La suscripción vigente: la activa si existe, si no la más reciente.
    const subs = p.subscriptions ?? [];
    const sub = subs.find((s) => s.status === "activa") ?? subs[0] ?? null;
    const notExpired = !sub?.renews_at || new Date(sub.renews_at) > new Date();
    return {
      id: p.id,
      email: p.email ?? "",
      displayName: p.display_name ?? "",
      createdAt: p.created_at,
      role: roleByUser.get(p.id) ?? "user",
      status: sub?.status ?? null,
      planCode: sub?.plans?.code ?? null,
      planName: sub?.plans?.name ?? null,
      subscriptionId: sub?.id ?? null,
      isPaid: !!sub?.external_reference,
      renewsAt: sub?.renews_at ?? null,
      isActive: sub?.status === "activa" && notExpired,
    };
  });
}

export function computeStats(users: AdminUser[], plans: AdminPlan[]): AdminStats {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const active = users.filter((u) => u.isActive);
  return {
    total: users.length,
    newLast7: users.filter((u) => new Date(u.createdAt).getTime() >= weekAgo).length,
    active: active.length,
    activePaid: active.filter((u) => u.isPaid).length,
    inactive: users.length - active.length,
    byPlan: plans.map((pl) => ({
      code: pl.code,
      name: pl.name,
      count: active.filter((u) => u.planCode === pl.code).length,
    })),
  };
}

/* ---------- cambios de plan / estado / rol (RLS) ---------- */

function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/** Prende o apaga el acceso. Ideal para pagos por transferencia. */
export async function setUserActive(user: AdminUser, active: boolean, plans: AdminPlan[]): Promise<void> {
  if (!active) {
    if (!user.subscriptionId) return; // sin suscripción ya está sin acceso
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelada", canceled_at: new Date().toISOString() })
      .eq("id", user.subscriptionId);
    if (error) throw error;
    return;
  }

  const plan = plans.find((p) => p.code === user.planCode) ?? plans[0];
  if (!plan) throw new Error("No hay planes disponibles");
  const renews = addMonths(plan.months ?? 1);

  if (user.subscriptionId) {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "activa", canceled_at: null, renews_at: renews, plan_id: plan.id })
      .eq("id", user.subscriptionId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      plan_id: plan.id,
      status: "activa",
      started_at: new Date().toISOString(),
      renews_at: renews,
    });
    if (error) throw error;
  }
}

export async function updateUserAdmin(params: {
  user: AdminUser;
  displayName: string;
  planCode: string | null;
  status: SubStatus | null;
  role: AdminRole;
  plans: AdminPlan[];
}): Promise<void> {
  const { user, displayName, planCode, status, role, plans } = params;

  if (displayName !== user.displayName) {
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
    if (error) throw error;
  }

  // Plan / estado de la suscripción
  if (planCode && status) {
    const plan = plans.find((p) => p.code === planCode);
    if (!plan) throw new Error("Plan no válido");
    const patch = {
      plan_id: plan.id,
      status,
      renews_at: status === "activa" ? addMonths(plan.months ?? 1) : user.renewsAt,
      canceled_at: status === "cancelada" ? new Date().toISOString() : null,
    };
    if (user.subscriptionId) {
      const { error } = await supabase.from("subscriptions").update(patch).eq("id", user.subscriptionId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("subscriptions")
        .insert({ user_id: user.id, started_at: new Date().toISOString(), ...patch });
      if (error) throw error;
    }
  }

  // Rol: se guarda una sola fila por usuario en user_roles
  if (role !== user.role) {
    const { error: delErr } = await db.from("user_roles").delete().eq("user_id", user.id);
    if (delErr) throw delErr;
    if (role !== "user") {
      const { error } = await db.from("user_roles").insert({ user_id: user.id, role });
      if (error) throw error;
    }
  }
}

/* ---------- operaciones de cuenta ----------
 * Corren dentro de la base de datos (funciones SECURITY DEFINER) que comprueban
 * el rol de quien llama antes de hacer nada. El navegador nunca maneja claves
 * privilegiadas: solo invoca la función y la base decide si tiene permiso.
 */

async function rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export async function createUserAccount(input: {
  email: string;
  password: string;
  display_name: string;
  plan_code?: string;
  role?: AdminRole;
  status?: SubStatus;
}): Promise<void> {
  await rpc("admin_create_user", {
    _email: input.email,
    _password: input.password,
    _display_name: input.display_name || null,
    _plan_code: input.plan_code ?? null,
    _role: input.role ?? "user",
    _status: input.status ?? "activa",
  });
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await rpc("admin_delete_user", { _user_id: userId });
}

export async function updateUserEmail(userId: string, email: string): Promise<void> {
  await rpc("admin_update_email", { _user_id: userId, _email: email });
}

export async function updateUserPassword(userId: string, password: string): Promise<void> {
  await rpc("admin_update_password", { _user_id: userId, _password: password });
}

/**
 * Envía al usuario un correo con un enlace para que cree (o restablezca) su
 * contraseña. Usa el servicio de correo de Supabase, así que no depende de un
 * proveedor externo. El enlace abre /reset-password.
 */
export async function sendAccessEmail(email: string): Promise<void> {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}
