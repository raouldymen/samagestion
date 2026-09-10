"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { purchaseLineTotal } from "@/lib/purchases/constants";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { PurchaseCartLine } from "@/types/purchases";

export function PurchaseCartItem({
  item,
  onQuantity,
  onCost,
  onRemove,
}: {
  item: PurchaseCartLine;
  onQuantity: (productId: string, quantity: number) => void;
  onCost: (productId: string, unitCost: number) => void;
  onRemove: (productId: string) => void;
}) {
  const total = purchaseLineTotal(item.quantity, item.unitCost);

  return (
    <article className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{item.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Stock actuel : {item.stockQuantity}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Retirer ${item.name}`}
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          id={`cost-${item.productId}`}
          label="Prix d'achat"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={item.unitCost}
          onChange={(event) => onCost(item.productId, Number(event.target.value) || 0)}
        />
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQuantity(item.productId, item.quantity - 1)}
              className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Diminuer la quantité"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span className="min-w-8 text-center text-base font-semibold">{item.quantity}</span>
            <button
              type="button"
              onClick={() => onQuantity(item.productId, item.quantity + 1)}
              className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Augmenter la quantité"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
          <p className="font-semibold">{formatFcfaAbsolute(total)}</p>
        </div>
      </div>
    </article>
  );
}
