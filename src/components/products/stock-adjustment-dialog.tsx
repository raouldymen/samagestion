"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { adjustStockAction } from "@/lib/products/actions";
import type { Product } from "@/types/products";

export function StockAdjustmentDialog({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(adjustStockAction, {
    error: null,
  });

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Ajuster le stock
      </Button>
      <Dialog open={open} title="Ajuster le stock" onClose={() => setOpen(false)}>
        <p className="mb-4 text-sm text-muted-foreground">
          Stock actuel : <span className="font-medium text-foreground">{product.stockQuantity}</span>
        </p>
        <form key={product.stockQuantity} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="productId" value={product.id} />
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Opération</legend>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="direction" value="add" defaultChecked className="size-4 accent-primary" />
              Ajouter du stock
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="direction" value="remove" className="size-4 accent-primary" />
              Retirer du stock
            </label>
          </fieldset>
          <Input
            id="quantity"
            name="quantity"
            label="Quantité"
            type="number"
            min={0.001}
            step="0.001"
            required
            placeholder="20"
            error={state.fieldErrors?.quantity}
          />
          <Input
            id="reason"
            name="reason"
            label="Motif"
            required
            placeholder="Réapprovisionnement"
            error={state.fieldErrors?.reason}
          />
          {state.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p role="status" className="text-sm text-success">
              {state.message}
            </p>
          ) : null}
          <Button type="submit" size="lg" loading={pending}>
            {pending ? "Mise à jour du stock..." : "Valider"}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
