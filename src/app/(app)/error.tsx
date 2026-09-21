"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur de l'espace de gestion", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border border-border bg-card p-8 text-center shadow-sm">
      <h1 className="text-xl font-semibold">Impossible de charger cette page</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Une erreur temporaire est survenue. Vérifiez votre connexion puis réessayez.
      </p>
      <div className="mt-5 flex gap-3">
        <Button type="button" onClick={() => reset()}>Réessayer</Button>
        <Button href="/dashboard" variant="outline">Accueil</Button>
      </div>
    </div>
  );
}
