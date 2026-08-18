import { useState } from "react";
import { createChild, updateChild, type Child } from "@/lib/queries";

export const AVATARS = ["🦊", "🐻", "🐱", "🐶", "🦁", "🐸", "🐼", "🐰", "🐯", "🦄", "🐙", "🐧"];

/** Edad a partir del año de nacimiento, siempre dentro del rango del formulario. */
function ageOf(child: Child | null | undefined): number {
  if (!child?.birth_year) return 4;
  return Math.min(7, Math.max(3, new Date().getFullYear() - child.birth_year));
}

/**
 * Formulario de un perfil de niño: nombre, avatar (emoji) y edad.
 * Sin `child` crea uno nuevo; con `child` edita el que se le pase.
 * Lo usan el onboarding y el selector de perfiles.
 */
export function ChildForm({
  child,
  onSaved,
  submitLabel = child ? "Guardar cambios" : "Crear perfil",
}: {
  child?: Child | null;
  onSaved: (child: Child) => void | Promise<void>;
  submitLabel?: string;
}) {
  const [name, setName] = useState(child?.name ?? "");
  const [avatar, setAvatar] = useState(child?.avatar_key ?? AVATARS[0]);
  const [age, setAge] = useState(() => ageOf(child));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const values = {
      name: name.trim(),
      avatarKey: avatar,
      birthYear: new Date().getFullYear() - age,
    };
    try {
      const saved = child ? await updateChild(child.id, values) : await createChild(values);
      await onSaved(saved);
    } catch {
      setError("No se pudo guardar el perfil. Inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">¿Cómo se llama?</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoFocus
          placeholder="Nombre del peque"
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-lg text-ink outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Elige su avatar</label>
        <div className="grid grid-cols-6 gap-2">
          {AVATARS.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => setAvatar(a)}
              aria-pressed={avatar === a}
              className={`grid aspect-square place-items-center rounded-2xl text-2xl transition ${
                avatar === a ? "bg-primary/15 ring-2 ring-primary" : "bg-muted"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-ink">¿Qué edad tiene?</label>
        <div className="grid grid-cols-5 gap-2">
          {[3, 4, 5, 6, 7].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setAge(n)}
              aria-pressed={age === n}
              className={`touch-target-lg rounded-2xl font-display text-lg font-bold transition ${
                age === n ? "bg-primary text-primary-foreground shadow-crayon" : "bg-muted text-ink-soft"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="w-full rounded-2xl bg-primary py-3.5 font-display font-bold text-primary-foreground shadow-crayon transition active:scale-[.99] disabled:opacity-50"
      >
        {busy ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
