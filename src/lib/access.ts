import { supabase } from "@/integrations/supabase/client";

/**
 * ¿Esta cuenta tiene acceso a la app?
 *
 * Lo decide la base de datos (`has_active_subscription`), nunca el navegador:
 * es cierto con una suscripción activa y sin vencer, y también para los
 * administradores (para que no puedan dejarse fuera).
 *
 * Ojo: esto solo sirve para mostrar la pantalla correcta. El candado de verdad
 * está en la propia base — sin suscripción activa, las láminas no se entregan.
 */
export async function fetchMyAccess(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return false;
  const { data, error } = await supabase.rpc("has_active_subscription", {
    _user_id: session.user.id,
  });
  if (error) throw error;
  return data === true;
}
