"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function UpgradeContinueButton({ plan }: { plan: string }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Button href={`/checkout?plan=${encodeURIComponent(plan)}`}>Continuer</Button>
      <Button href="/pricing" variant="outline">
        Comparer les offres
      </Button>
    </div>
  );
}

export function SubscriptionCancelButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        loading={pending}
        onClick={() => {
          if (
            !window.confirm(
              "Annuler l'abonnement ? Vous gardez l'accès jusqu'à la fin de la période payée.",
            )
          ) {
            return;
          }
          startTransition(async () => {
            const res = await fetch("/api/subscription/cancel", { method: "POST" });
            const data = (await res.json()) as { message?: string; error?: string };
            setMessage(data.message ?? data.error ?? null);
            if (res.ok) {
              window.location.reload();
            }
          });
        }}
      >
        Annuler l&apos;abonnement
      </Button>
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
