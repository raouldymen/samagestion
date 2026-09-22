"use client";

import { useState } from "react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ExpenseCategory } from "@/types/expenses";

export function CashierExpenseDialog({
  categories,
  variant = "outline",
}: {
  categories: ExpenseCategory[];
  variant?: "outline" | "primary";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        Dépense
      </Button>
      <Dialog open={open} title="Enregistrer une dépense" onClose={() => setOpen(false)}>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune catégorie. Demandez au propriétaire d’en créer une dans Dépenses.
          </p>
        ) : (
          <ExpenseForm
            mode="create"
            categories={categories}
            redirectTo="/sales/checkout"
            cancelHref={null}
            compact
            submitLabel="Enregistrer"
          />
        )}
      </Dialog>
    </>
  );
}
