"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function SubscriptionActions({
  planSlug,
  cancelAtPeriodEnd,
  isPaid,
  canEdit,
}: {
  planSlug: string;
  cancelAtPeriodEnd: boolean;
  isPaid: boolean;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {planSlug === "free" ? (
        <Button href="/checkout?plan=pro">Passer à Pro</Button>
      ) : (
        <>
          <Button href="/upgrade" variant="outline">
            Changer de plan
          </Button>
          {cancelAtPeriodEnd ? (
            <Button
              type="button"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  await fetch("/api/subscription/reactivate", { method: "POST" });
                  window.location.reload();
                })
              }
            >
              Réactiver l&apos;abonnement
            </Button>
          ) : isPaid ? (
            <Button
              type="button"
              variant="outline"
              loading={pending}
              onClick={() => {
                if (
                  window.confirm(
                    "Annuler l'abonnement ? Vous gardez l'accès jusqu'à la fin de la période payée.",
                  )
                ) {
                  startTransition(async () => {
                    await fetch("/api/subscription/cancel", { method: "POST" });
                    window.location.reload();
                  });
                }
              }}
            >
              Annuler l&apos;abonnement
            </Button>
          ) : null}
        </>
      )}
      {planSlug !== "business" && planSlug !== "free" ? (
        <Button href="/checkout?plan=business" variant="ghost" size="sm">
          Passer à Business
        </Button>
      ) : null}
    </div>
  );
}
