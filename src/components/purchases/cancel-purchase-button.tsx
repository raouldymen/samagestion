"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cancelPurchaseAction } from "@/lib/purchases/actions";
import type { Purchase } from "@/types/purchases";

export function CancelPurchaseButton({ purchase }: { purchase: Purchase }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (purchase.status === "cancelled") {
    return null;
  }

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Annuler l&apos;achat
      </Button>
      <Dialog open={open} title="Annuler cet achat ?" onClose={() => setOpen(false)}>
        <p className="mb-4 text-sm text-muted-foreground">
          Les produits seront retirés du stock. Cette action sera enregistrée.
        </p>
        {error ? (
          <p role="alert" className="mb-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="danger"
            loading={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await cancelPurchaseAction(purchase.id);

                if (result.error) {
                  setError(result.error);
                  return;
                }

                setOpen(false);
              });
            }}
          >
            Confirmer
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Retour
          </Button>
        </div>
      </Dialog>
    </>
  );
}
