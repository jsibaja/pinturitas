import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useChild } from "@/lib/child-context";
import { fetchMyAccess } from "@/lib/access";

/**
 * Layout de las pantallas principales (Hoy, Mundos, Juegos, Galería, Padres).
 * Tres guardas, en este orden:
 *   1. Sesión: sin usuario -> /auth
 *   2. Suscripción: sin acceso -> pantalla de suscripción pausada
 *   3. Perfil: sin ningún niño -> /onboarding
 * Las rutas públicas (auth, onboarding, perfil-nino...) viven fuera de aquí.
 */
export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

type SessionStatus = "loading" | "authenticated" | "anon";

function AppLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const { children: kids, isLoading: kidsLoading, isFetching: kidsFetching } = useChild();
  // Solo damos por buena la lista cuando ya no se está consultando: si no,
  // un resultado vacío momentáneo mandaría a crear perfil a quien ya tiene.
  const kidsReady = !kidsLoading && !kidsFetching;

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setStatus(data.session ? "authenticated" : "anon");
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "authenticated" : "anon");
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Red de seguridad: al volver a la pestaña, al recuperar la conexión y cada
  // minuto. El aviso instantáneo lo da el canal en vivo de abajo.
  const accessQ = useQuery({
    queryKey: ["my-access"],
    queryFn: fetchMyAccess,
    enabled: status === "authenticated",
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Cambiar el plan o el estado desde el panel llega aquí en el momento, sin
  // que el usuario tenga que refrescar: la base avisa por el canal en vivo y
  // se vuelve a preguntar por el acceso.
  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel(`acceso-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["my-access"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [userId, qc]);

  // Solo un "no" explícito cierra la puerta: si la consulta falla (un corte de
  // red, por ejemplo) no dejamos fuera a quien sí paga. El candado real está en
  // la base de datos, que no entrega las láminas sin suscripción activa.
  const blocked = accessQ.data === false;

  useEffect(() => {
    if (status === "anon") navigate({ to: "/auth" });
  }, [status, navigate]);

  useEffect(() => {
    if (status === "authenticated" && !blocked && kidsReady && kids.length === 0) {
      navigate({ to: "/onboarding" });
    }
  }, [status, blocked, kidsReady, kids.length, navigate]);

  if (status === "authenticated" && blocked) {
    return <AccessPaused onRetry={() => accessQ.refetch()} checking={accessQ.isFetching} />;
  }

  if (status !== "authenticated" || accessQ.isLoading || !kidsReady || kids.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <span className="text-3xl">🎨</span>
          <span className="animate-pulse text-sm">Un momento…</span>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

/**
 * Pantalla que ve una cuenta sin suscripción activa. Reemplaza a toda la app,
 * así que incluye las salidas: ver los planes y cerrar sesión.
 */
function AccessPaused({ onRetry, checking }: { onRetry: () => void; checking: boolean }) {
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 safe-top safe-bottom">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-crayon">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-muted text-3xl">⏸️</div>
        <h1 className="font-display text-2xl font-bold text-ink">Tu suscripción está pausada</h1>
        <p className="mt-2 text-ink-soft">
          Ahora mismo esta cuenta no tiene acceso a los dibujos. En cuanto se reactive, todo vuelve
          tal como estaba: los perfiles, la galería y el progreso siguen guardados.
        </p>

        <a
          href="/#planes"
          className="mt-6 block w-full rounded-2xl bg-primary py-3.5 font-display font-bold text-primary-foreground shadow-crayon transition active:scale-[.99]"
        >
          Ver los planes
        </a>

        <button
          onClick={onRetry}
          disabled={checking}
          className="mt-3 w-full rounded-2xl bg-muted py-3 text-sm font-semibold text-ink transition disabled:opacity-50"
        >
          {checking ? "Comprobando…" : "Ya reactivé mi suscripción"}
        </button>

        <button
          onClick={logout}
          className="mt-4 w-full text-center text-sm font-semibold text-ink-soft hover:text-ink"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
