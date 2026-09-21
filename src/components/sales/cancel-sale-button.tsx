"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cancelSaleAction } from "@/lib/sales/actions";
import { canCancelSaleUntil } from "@/lib/sales/constants";
import type { Sale } from "@/types/sales";

export function CancelSaleButton({ sale }: { sale: Sale }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sale.status === "cancelled" || !canCancelSaleUntil(sale.createdAt)) {
    return null;
  }

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Annuler la vente
      </Button>
      <Dialog open={open} title="Annuler cette vente ?" onClose={() => setOpen(false)}>
        <p className="mb-4 text-sm text-muted-foreground">
          Le stock sera automatiquement restauré. Cette action sera enregistrée.
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
                const result = await cancelSaleAction(sale.id);

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
