import type { CartLine } from "@/types/sales";

export type PendingSaleDraft = {
  cart: CartLine[];
  discount: number;
  customerId: string;
  notes: string;
  sellerId?: string;
};

const KEY = "pending-sale-draft";

export function savePendingSaleDraft(draft: PendingSaleDraft) {
  window.sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function readPendingSaleDraft(): PendingSaleDraft | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<PendingSaleDraft>;
    if (!Array.isArray(value.cart)) return null;
    return {
      cart: value.cart.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const line = item as CartLine;
        const productId = String(line.productId ?? "").trim();
        if (!productId) return [];
        return [{
          productId,
          name: String(line.name ?? "Produit"),
          unitPrice: Number(line.unitPrice) || 0,
          stockQuantity: Number(line.stockQuantity) || 0,
          quantity: Number(line.quantity) || 0,
        }];
      }),
      discount: Number(value.discount) || 0,
      customerId: String(value.customerId ?? ""),
      notes: String(value.notes ?? ""),
      sellerId: value.sellerId ? String(value.sellerId) : undefined,
    };
  } catch {
    return null;
  }
}

export function clearPendingSaleDraft() {
  window.sessionStorage.removeItem(KEY);
}

export function draftFromQueuedSale(sale: {
  customerId?: string | null;
  discount: number;
  notes?: string | null;
  sellerId?: string | null;
  items: Array<{ productId: string; name: string; unitPrice: number; stockQuantity: number; quantity: number }>;
}): PendingSaleDraft {
  return {
    cart: sale.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      unitPrice: item.unitPrice,
      stockQuantity: item.stockQuantity,
      quantity: item.quantity,
    })),
    discount: sale.discount,
    customerId: sale.customerId ?? "",
    notes: sale.notes ?? "",
    sellerId: sale.sellerId ?? undefined,
  };
}
