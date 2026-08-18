import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useChild } from "@/lib/child-context";
import { ChildForm } from "@/components/ChildForm";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Comencemos · Pinturitas" },
      { name: "description", content: "Crea el primer perfil de tu peque en pocos pasos." },
    ],
  }),
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { setActiveChild, refetch, children: kids, isLoading, isFetching } = useChild();
  const ready = !isLoading && !isFetching;

  // Necesita sesión.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
    });
  }, [navigate]);

  // Esta pantalla es solo para quien AÚN no tiene ningún perfil. Si la cuenta ya
  // tiene alguno, se entra a elegir perfil (antes se quedaba aquí atrapado: con
  // 4 perfiles el límite impedía crear otro y no había forma de avanzar).
  useEffect(() => {
    if (ready && kids.length > 0) {
      navigate({ to: "/perfil-nino" });
    }
  }, [ready, kids.length, navigate]);

  if (!ready || kids.length > 0) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <span className="text-3xl">🎨</span>
          <span className="animate-pulse text-sm">Un momento…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-primary text-3xl shadow-crayon">🎨</div>
          <h1 className="font-display text-3xl font-bold text-ink">¡Bienvenido a Pinturitas!</h1>
          <p className="mt-1 text-ink-soft">Creemos el perfil de tu peque para empezar.</p>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-crayon">
          <ChildForm
            submitLabel="¡Empezar a colorear!"
            onSaved={async (child) => {
              await refetch();
              setActiveChild(child.id);
              navigate({ to: "/hoy" });
            }}
          />
        </div>
      </div>
    </div>
  );
}
