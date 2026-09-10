"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createCategoryAction, updateCategoryAction } from "@/lib/products/actions";
import type { Category } from "@/types/products";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [createState, createAction, createPending] = useActionState(createCategoryAction, {
    error: null,
  });
  const [updateState, updateAction, updatePending] = useActionState(updateCategoryAction, {
    error: null,
  });

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Catégories
      </Button>
      <Dialog
        open={open}
        title="Catégories"
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
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.productCount} produit{category.productCount > 1 ? "s" : ""}
                  </p>
                </div>
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
              id="edit-category-name"
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
          <form key={createState.message ?? "new-category"} action={createAction} className="flex flex-col gap-3">
            <Input
              id="new-category-name"
              name="name"
              label="Ajouter une catégorie"
              required
              placeholder="Vêtements"
              error={createState.fieldErrors?.name}
            />
            {createState.error ? (
              <p role="alert" className="text-sm text-danger">
                {createState.error}
              </p>
            ) : null}
            <Button type="submit" loading={createPending}>
              {createPending ? "Création..." : "Ajouter une catégorie"}
            </Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
