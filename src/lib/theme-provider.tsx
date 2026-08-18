import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolved: Resolved;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "pinturitas.theme";

function resolveSystem(): Resolved {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Lee la preferencia guardada. En el servidor devuelve "system". */
function readStored(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "light" || s === "dark" || s === "system") return s;
  } catch {
    /* localStorage puede no estar disponible */
  }
  return "system";
}

/**
 * Proveedor de tema. Por defecto sigue al sistema del dispositivo.
 * El interruptor manual vive en Ajustes (Zona de Padres) y persiste
 * la elección en localStorage bajo la clave "pinturitas.theme".
 * El primer pintado lo resuelve el script inline de <head> (ver __root),
 * para que no haya parpadeo claro→oscuro al cargar.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Se inicializa ya con la preferencia guardada para no re-aplicar el tema
  // tras hidratar (el script de <head> ya pintó el correcto).
  const [theme, setThemeState] = useState<Theme>(readStored);
  const [resolved, setResolved] = useState<Resolved>(() =>
    typeof window === "undefined" ? "light" : readStored() === "system" ? resolveSystem() : (readStored() as Resolved),
  );

  // Aplicar clase .dark al <html> según el tema efectivo.
  useEffect(() => {
    const apply = () => {
      const next: Resolved = theme === "system" ? resolveSystem() : theme;
      setResolved(next);
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.style.colorScheme = next;
    };
    apply();
    if (theme === "system" && typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply();
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignorar */
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
