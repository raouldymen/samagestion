"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { deactivateProductAction } from "@/lib/products/actions";
import type { Product } from "@/types/products";

export function DeactivateProductButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!product.isActive) {
    return null;
  }

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Désactiver
      </Button>
      <Dialog open={open} title="Désactiver le produit" onClose={() => setOpen(false)}>
        <p className="mb-4 text-sm text-muted-foreground">
          {product.name} ne sera plus proposé dans les ventes. Le stock et l&apos;historique
          sont conservés.
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
                const result = await deactivateProductAction(product.id);

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
            Annuler
          </Button>
        </div>
      </Dialog>
    </>
  );
}
