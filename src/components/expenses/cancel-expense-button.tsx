"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cancelExpenseAction } from "@/lib/expenses/actions";
import type { Expense } from "@/types/expenses";

export function CancelExpenseButton({ expense }: { expense: Expense }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (expense.status === "cancelled") {
    return null;
  }

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Annuler la dépense
      </Button>
      <Dialog open={open} title="Annuler la dépense" onClose={() => setOpen(false)}>
        <p className="mb-4 text-sm text-muted-foreground">
          {expense.description} ne sera plus comptabilisée dans les totaux. L&apos;historique est
          conservé.
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
                const result = await cancelExpenseAction(expense.id);

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
