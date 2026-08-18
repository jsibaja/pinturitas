import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchChildren, type Child } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

/**
 * Contexto del niño activo. Carga los perfiles de la cuenta (hasta 4) y
 * recuerda cuál está activo (en localStorage). Todas las pantallas de la
 * app leen de aquí para que el progreso y la galería sean por niño.
 */

const STORAGE_KEY = "pinturitas.activeChild";

type ChildContextValue = {
  children: Child[];
  activeChild: Child | null;
  activeChildId: string | null;
  setActiveChild: (id: string) => void;
  isLoading: boolean;
  /** true mientras la lista se está consultando (aunque ya haya datos viejos). */
  isFetching: boolean;
  refetch: () => void;
};

const ChildContext = createContext<ChildContextValue | null>(null);

export function ChildProvider({ children: node }: { children: ReactNode }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["children"], queryFn: fetchChildren, staleTime: 60_000 });
  const kids = useMemo(() => q.data ?? [], [q.data]);

  // El proveedor vive en la raíz, así que esta consulta corre también en la
  // pantalla de login, cuando todavía no hay sesión y devuelve una lista vacía.
  // Sin esto, ese vacío quedaba en caché y tras iniciar sesión la app creía que
  // la cuenta no tenía perfiles y mandaba a crear uno (con el límite de 4 ya
  // alcanzado, dejaba al usuario atrapado). Al cambiar la sesión, recargamos.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        void qc.invalidateQueries({ queryKey: ["children"] });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const [activeId, setActiveId] = useState<string | null>(null);

  // Cargar la selección guardada tras hidratar.
  useEffect(() => {
    try {
      setActiveId(localStorage.getItem(STORAGE_KEY));
    } catch {
      /* localStorage puede no estar disponible */
    }
  }, []);

  const activeChild = useMemo(
    () => kids.find((k) => k.id === activeId) ?? kids[0] ?? null,
    [kids, activeId],
  );

  function setActiveChild(id: string) {
    setActiveId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignorar */
    }
  }

  const value: ChildContextValue = {
    children: kids,
    activeChild,
    activeChildId: activeChild?.id ?? null,
    setActiveChild,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    refetch: q.refetch,
  };

  return <ChildContext.Provider value={value}>{node}</ChildContext.Provider>;
}

export function useChild() {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error("useChild debe usarse dentro de <ChildProvider>");
  return ctx;
}
