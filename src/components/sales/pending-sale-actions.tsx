"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelCashierSaleAction } from "@/lib/sales/actions";
import { draftFromQueuedSale, savePendingSaleDraft } from "@/lib/sales/pending-draft";
import type { SaleListItem } from "@/types/sales";

export function PendingSaleActions({ sale }: { sale: SaleListItem }) {
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        loading={busy}
        onClick={() => startBusy(async () => {
          savePendingSaleDraft(draftFromQueuedSale({
            items: sale.pendingItems ?? [],
            discount: sale.discount,
            customerId: sale.customerId,
            notes: sale.notes,
            sellerId: sale.userId,
          }));
          const result = await cancelCashierSaleAction(sale.id);
          if (result.error) {
            setError(result.error);
            return;
          }
          setError(null);
          router.push("/sales/new?edit=1");
        })}
      >
        Modifier
      </Button>
      <Button
        type="button"
        size="sm"
        variant="danger"
        loading={busy}
        onClick={() => {
          if (!window.confirm("Annuler cette vente en attente ? Elle disparaîtra de la file de caisse.")) {
            return;
          }
          startBusy(async () => {
            const result = await cancelCashierSaleAction(sale.id);
            if (result.error) {
              setError(result.error);
              return;
            }
            setError(null);
            router.refresh();
          });
        }}
      >
        Annuler
      </Button>
      {error ? <p className="basis-full text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
