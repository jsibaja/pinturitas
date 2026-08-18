import { useState } from "react";

/**
 * Puerta con una operación simple para asegurar que quien continúa es un
 * adulto. La usan la Zona de Padres y la gestión de perfiles de niño.
 */
export function MathGate({
  title,
  subtitle = "Resuelve esto para continuar.",
  onPass,
  onCancel,
  cancelLabel = "Volver",
}: {
  title: string;
  subtitle?: string;
  onPass: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const [a] = useState(() => 3 + Math.floor(Math.random() * 6));
  const [b] = useState(() => 2 + Math.floor(Math.random() * 6));
  const [value, setValue] = useState("");
  const [fails, setFails] = useState(0);

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (Number(value) === a + b) {
      onPass();
    } else {
      setFails((f) => f + 1);
      setValue("");
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-border bg-surface p-8 text-center shadow-crayon">
      <div className="mb-2 text-4xl">🔒</div>
      <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>

      <form onSubmit={check} className="mt-6">
        <div className="font-display text-4xl font-bold text-ink">
          {a} + {b} = ?
        </div>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="mt-4 w-32 rounded-2xl border border-input bg-background px-4 py-3 text-center text-2xl font-bold text-ink outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="mt-4 block w-full rounded-2xl bg-primary py-3 font-display font-bold text-primary-foreground shadow-crayon active:scale-95"
        >
          Entrar
        </button>
      </form>

      {fails > 0 && (
        <p className="mt-3 text-sm text-destructive">Ups, esa no es. Inténtalo otra vez.</p>
      )}

      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 w-full text-center text-sm font-semibold text-ink-soft hover:text-ink"
        >
          {cancelLabel}
        </button>
      )}
    </div>
  );
}
