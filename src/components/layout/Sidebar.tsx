import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sun, Map, Gamepad2, Images, Lock, Shield } from "lucide-react";
import { fetchMyRole, isAdminRole } from "@/lib/admin";

const tabs = [
  { to: "/hoy", label: "Hoy", icon: Sun },
  { to: "/mundos", label: "Mundos", icon: Map },
  { to: "/juegos", label: "Juegos", icon: Gamepad2 },
  { to: "/galeria", label: "Galería", icon: Images },
  { to: "/padres", label: "Padres", icon: Lock },
] as const;

/** Sidebar de escritorio (>=md). Reemplaza al tab bar inferior. */
export function Sidebar() {
  // El acceso a Administración solo aparece si el usuario es owner/admin.
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: fetchMyRole, staleTime: 5 * 60 * 1000 });
  const showAdmin = isAdminRole(roleQ.data ?? null);

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-surface md:p-6">
      <Link to="/hoy" className="mb-8 flex items-center gap-3">
        <img src="/icon-512.png" alt="" className="size-10 rounded-xl" />
        <span className="font-display text-2xl text-primary">Pinturitas</span>
      </Link>
      <nav aria-label="Navegación principal">
        <ul className="space-y-1">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-ink-soft transition-colors hover:bg-muted"
                activeProps={{ className: "bg-muted text-primary" }}
              >
                <Icon className="size-5" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          ))}
          {showAdmin && (
            <li className="mt-2 border-t border-border pt-2">
              <Link
                to="/admin"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-ink-soft transition-colors hover:bg-muted"
                activeProps={{ className: "bg-muted text-primary" }}
              >
                <Shield className="size-5" aria-hidden />
                <span>Administración</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
