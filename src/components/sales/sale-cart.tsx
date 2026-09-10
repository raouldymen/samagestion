"use client";

import { SaleCartItem } from "@/components/sales/sale-cart-item";
import type { CartLine } from "@/types/sales";

export function SaleCart({
  items,
  error,
  onQuantity,
  onRemove,
}: {
  items: CartLine[];
  error?: string;
  onQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}) {
  return (
    <section aria-label="Produits sélectionnés" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Produits sélectionnés</h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Recherchez un produit pour commencer la vente.
        </p>
      ) : (
        items.map((item) => (
          <SaleCartItem
            key={item.productId}
            item={item}
            onQuantity={onQuantity}
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
