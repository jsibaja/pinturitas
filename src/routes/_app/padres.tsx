import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout de la Zona de Padres. Solo renderiza el Outlet para permitir
 * subrutas (/padres, /padres/progreso, /padres/ajustes, /padres/planes).
 *
 * La puerta con operación matemática vive en /padres (padres.index.tsx)
 * y debe recordar la "sesión de padre" en memoria (no persistir).
 */
export const Route = createFileRoute("/_app/padres")({
  component: () => <Outlet />,
});
