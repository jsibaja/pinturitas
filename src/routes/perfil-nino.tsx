import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useChild } from "@/lib/child-context";
import { ChildForm } from "@/components/ChildForm";
import { MathGate } from "@/components/MathGate";
import { deleteChild, type Child } from "@/lib/queries";

export const Route = createFileRoute("/perfil-nino")({
  component: ChildProfilePage,
  head: () => ({
    meta: [
      { title: "Elige tu perfil · Pinturitas" },
      { name: "description", content: "Elige qué peque va a pintar hoy." },
    ],
  }),
});

const MAX_CHILDREN = 4;

/**
 * Vistas de la pantalla. Editar y eliminar quedan detrás de la puerta de
 * adulto para que un peque no borre por accidente las obras de su hermano.
 */
type View =
  | { kind: "pick" }
  | { kind: "gate" }
  | { kind: "manage" }
  | { kind: "add" }
  | { kind: "edit"; child: Child };

function ChildProfilePage() {
  const navigate = useNavigate();
  const { children: kids, setActiveChild, refetch, isLoading, isFetching } = useChild();
  const [view, setView] = useState<View>({ kind: "pick" });
  /** Una vez resuelta la puerta no se vuelve a pedir mientras dure la visita. */
  const [adultOk, setAdultOk] = useState(false);
  const ready = !isLoading && !isFetching;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
    });
  }, [navigate]);

  // Sin niños todavía -> al onboarding. Se espera a que la consulta termine
  // para no confundir un vacío momentáneo con "no tiene perfiles".
  useEffect(() => {
    if (ready && kids.length === 0) navigate({ to: "/onboarding" });
  }, [ready, kids.length, navigate]);

  function choose(id: string) {
    setActiveChild(id);
    navigate({ to: "/hoy" });
  }

  /** Al tocar "Editar perfiles": pide la suma solo la primera vez. */
  function openManage() {
    setView({ kind: adultOk ? "manage" : "gate" });
  }

  if (view.kind === "gate") {
    return (
      <Centered>
        <MathGate
          title="Solo para adultos"
          subtitle="Vas a editar los perfiles. Resuelve esto para continuar."
          onPass={() => {
            setAdultOk(true);
            setView({ kind: "manage" });
          }}
          onCancel={() => setView({ kind: "pick" })}
          cancelLabel="Cancelar"
        />
      </Centered>
    );
  }

  if (view.kind === "add") {
    return (
      <Centered>
        <Panel title="Nuevo perfil" subtitle="Agrega a otro de tus peques.">
          <ChildForm
            submitLabel="Crear y entrar"
            onSaved={async (child) => {
              await refetch();
              choose(child.id);
            }}
          />
          <CancelLink onClick={() => setView({ kind: adultOk ? "manage" : "pick" })} />
        </Panel>
      </Centered>
    );
  }

  if (view.kind === "edit") {
    return (
      <Centered>
        <Panel title="Editar perfil" subtitle={`Cambia los datos de ${view.child.name}.`}>
          <ChildForm
            child={view.child}
            onSaved={async () => {
              await refetch();
              setView({ kind: "manage" });
            }}
          />
          <DeleteChild
            child={view.child}
            onDeleted={async () => {
              await refetch();
              setView({ kind: "manage" });
            }}
          />
          <CancelLink onClick={() => setView({ kind: "manage" })} />
        </Panel>
      </Centered>
    );
  }

  const managing = view.kind === "manage";

  return (
    <Centered>
      <h1 className="mb-1 text-center font-display text-3xl font-bold text-ink">
        {managing ? "Editar perfiles" : "¿Quién va a pintar hoy?"}
      </h1>
      <p className="mb-8 text-center text-ink-soft">
        {managing ? "Toca un perfil para cambiarlo o eliminarlo." : "Toca tu perfil."}
      </p>

      <div className="flex flex-wrap items-start justify-center gap-5">
        {kids.map((k) => (
          <button
            key={k.id}
            onClick={() => (managing ? setView({ kind: "edit", child: k }) : choose(k.id))}
            className="group relative flex w-28 flex-col items-center gap-2"
          >
            <span className="grid h-24 w-24 place-items-center rounded-3xl bg-surface text-5xl shadow-crayon transition group-hover:ring-4 group-hover:ring-primary group-active:scale-95">
              {k.avatar_key ?? "🙂"}
            </span>
            {managing && (
              <span className="absolute -top-1 right-0 grid h-8 w-8 place-items-center rounded-full bg-primary text-sm shadow-crayon">
                ✏️
              </span>
            )}
            <span className="font-display font-bold text-ink">{k.name}</span>
          </button>
        ))}

        {kids.length < MAX_CHILDREN && (
          <button onClick={() => setView({ kind: "add" })} className="flex w-28 flex-col items-center gap-2">
            <span className="grid h-24 w-24 place-items-center rounded-3xl border-2 border-dashed border-border text-4xl text-ink-soft transition hover:border-primary hover:text-primary active:scale-95">
              +
            </span>
            <span className="font-display font-bold text-ink-soft">Agregar</span>
          </button>
        )}
      </div>

      {managing && kids.length >= MAX_CHILDREN && (
        <p className="mt-6 text-center text-sm text-ink-soft">
          Son {MAX_CHILDREN} perfiles como máximo. Elimina uno si quieres agregar otro.
        </p>
      )}

      <div className="mt-10 text-center">
        <button
          onClick={() => (managing ? setView({ kind: "pick" }) : openManage())}
          className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-muted hover:text-ink"
        >
          {managing ? "Listo" : "Editar perfiles"}
        </button>
      </div>
    </Centered>
  );
}

/** Eliminar un perfil: pide confirmación porque se lleva sus obras y su progreso. */
function DeleteChild({ child, onDeleted }: { child: Child; onDeleted: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await deleteChild(child.id);
      await onDeleted();
    } catch {
      setError("No se pudo eliminar el perfil. Inténtalo de nuevo.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="mt-5 w-full rounded-2xl border border-destructive/30 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
      >
        Eliminar este perfil
      </button>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
      <p className="text-sm text-ink">
        ¿Eliminar a <strong>{child.name}</strong>? Se borran también sus dibujos guardados y su
        progreso, y no se puede deshacer.
      </p>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="flex-1 rounded-2xl bg-muted py-3 text-sm font-semibold text-ink disabled:opacity-50"
        >
          Mejor no
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="flex-1 rounded-2xl bg-destructive py-3 text-sm font-bold text-destructive-foreground disabled:opacity-50"
        >
          {busy ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 safe-top safe-bottom">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-5 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
        <p className="mt-1 text-ink-soft">{subtitle}</p>
      </div>
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-crayon">{children}</div>
    </div>
  );
}

function CancelLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 w-full text-center text-sm font-semibold text-ink-soft hover:text-ink"
    >
      Cancelar
    </button>
  );
}
