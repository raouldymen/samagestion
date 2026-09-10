"use client";

import { PurchaseCartItem } from "@/components/purchases/purchase-cart-item";
import type { PurchaseCartLine } from "@/types/purchases";

export function PurchaseCart({
  items,
  error,
  onQuantity,
  onCost,
  onRemove,
}: {
  items: PurchaseCartLine[];
  error?: string;
  onQuantity: (productId: string, quantity: number) => void;
  onCost: (productId: string, unitCost: number) => void;
  onRemove: (productId: string) => void;
}) {
  return (
    <section aria-label="Produits sélectionnés" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Produits sélectionnés</h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Recherchez un produit pour commencer l&apos;achat.
        </p>
      ) : (
        items.map((item) => (
          <PurchaseCartItem
            key={item.productId}
            item={item}
            onQuantity={onQuantity}
            onCost={onCost}
            onRemove={onRemove}
          />
        ))
      )}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
