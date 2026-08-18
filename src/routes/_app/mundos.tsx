import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout de /mundos. Solo renderiza el Outlet para permitir subrutas. */
export const Route = createFileRoute("/_app/mundos")({
  component: () => <Outlet />,
});
