"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createExpenseCategoryAction,
  updateExpenseCategoryAction,
} from "@/lib/expenses/actions";
import type { ExpenseCategory } from "@/types/expenses";

export function ExpenseCategoryManager({ categories }: { categories: ExpenseCategory[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [createState, createAction, createPending] = useActionState(createExpenseCategoryAction, {
    error: null,
  });
  const [updateState, updateAction, updatePending] = useActionState(updateExpenseCategoryAction, {
    error: null,
  });

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Catégories
      </Button>
      <Dialog
        open={open}
        title="Catégories de dépenses"
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      >
        <ul className="mb-4 max-h-48 divide-y divide-border overflow-y-auto">
          {categories.length === 0 ? (
            <li className="py-2 text-sm text-muted-foreground">Aucune catégorie.</li>
          ) : (
            categories.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-3 py-2">
                <p className="truncate text-sm font-medium">{category.name}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(category)}>
                  Modifier
                </Button>
              </li>
            ))
          )}
        </ul>
        {editing ? (
          <form key={editing.id} action={updateAction} className="flex flex-col gap-3">
            <input type="hidden" name="categoryId" value={editing.id} />
            <Input
              id="edit-expense-category-name"
              name="name"
              label="Modifier la catégorie"
              required
              defaultValue={editing.name}
              error={updateState.fieldErrors?.name}
            />
            {updateState.error ? (
              <p role="alert" className="text-sm text-danger">
                {updateState.error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" loading={updatePending}>
                Enregistrer
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <form
            key={createState.message ?? "new-expense-category"}
            action={createAction}
            className="flex flex-col gap-3"
          >
            <Input
              id="new-expense-category-name"
              name="name"
              label="Nouvelle catégorie"
              required
              placeholder="Loyer"
              error={createState.fieldErrors?.name}
            />
            {createState.error ? (
              <p role="alert" className="text-sm text-danger">
                {createState.error}
              </p>
            ) : null}
            <Button type="submit" loading={createPending}>
              Ajouter
            </Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
