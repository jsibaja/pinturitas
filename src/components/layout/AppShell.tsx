import { type ReactNode } from "react";
import { BottomTabs } from "./BottomTabs";
import { Sidebar } from "./Sidebar";

/**
 * Shell principal de la app: sidebar en desktop, tab bar inferior en móvil.
 * Respeta safe areas de iOS y reserva espacio para el tab bar en móvil.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen safe-x bg-background text-foreground">
      <div className="md:flex">
        <Sidebar />
        <main
          className="min-w-0 flex-1 safe-top"
          style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }}
        >
          <div className="md:pb-0">{children}</div>
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
