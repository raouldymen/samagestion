"use client";

import { useEffect, useState } from "react";
import { Receipt } from "@/components/receipts/receipt";
import { ReceiptActions } from "@/components/receipts/receipt-actions";
import { Button } from "@/components/ui/button";
import { getSaleReceiptAction } from "@/lib/sales/actions";
import type { ReceiptView } from "@/types/receipts";

export function CashierCompletedReceipt({
  saleId,
  onClose,
}: {
  saleId: string | null;
  onClose: () => void;
}) {
  const [receipt, setReceipt] = useState<ReceiptView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saleId) {
      document.body.style.overflow = "";
      setReceipt(null);
      setError(null);
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [saleId]);

  useEffect(() => {
    if (!saleId) {
      setReceipt(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setReceipt(null);
    setError(null);
    void getSaleReceiptAction(saleId).then((view) => {
      if (cancelled) return;
      if (!view) {
        setError("Le reçu n'a pas pu être chargé.");
        return;
      }
      setReceipt(view);
    });

    return () => {
      cancelled = true;
    };
  }, [saleId]);

  if (!saleId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cashier-receipt-title"
        className="relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="cashier-receipt-title" className="text-lg font-semibold">
            {receipt ? `Reçu ${receipt.saleNumber}` : "Reçu"}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          {!receipt && !error ? <p className="text-sm text-muted-foreground">Préparation du reçu…</p> : null}
          {receipt ? (
            <div className="grid gap-4">
              <ReceiptActions receipt={receipt} />
              <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3">
                <Receipt receipt={receipt} />
              </div>
            </div>
          ) : null}
        </div>
        <div className="border-t border-border px-5 py-4">
          <Button type="button" className="w-full sm:w-auto" onClick={onClose}>
            Retour à la caisse
          </Button>
        </div>
      </div>
    </div>
  );
}
