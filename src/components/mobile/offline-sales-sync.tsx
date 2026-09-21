"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBusinessSession } from "@/components/providers/business-provider";
import { listOfflineSales, removeOfflineSale } from "@/lib/offline/sales-queue";
import { syncOfflineSaleAction } from "@/lib/sales/actions";

export function OfflineSalesSync() {
  const session = useBusinessSession();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const synchronizingRef = useRef(false);

  const synchronize = useCallback(async () => {
    if (!navigator.onLine || synchronizingRef.current) return;
    synchronizingRef.current = true;
    try {
      const sales = await listOfflineSales(session.businessId, session.user.id);
      setPendingCount(sales.length);
      if (sales.length === 0) return;

      setSyncing(true);
      setError(null);
      let remaining = sales.length;
      for (const sale of sales) {
        const formData = new FormData();
        formData.set("items", JSON.stringify(sale.items));
        formData.set("discount", String(sale.discount));
        formData.set("customerId", sale.customerId);
        formData.set("paymentMethod", sale.paymentMethod);
        formData.set("amountPaid", String(sale.amountPaid));
        formData.set("checkoutMode", sale.checkoutMode);
        const result = await syncOfflineSaleAction(formData);
        if (result.error) {
          setError("Une vente enregistrée hors connexion nécessite votre attention.");
          break;
        }
        await removeOfflineSale(sale.id);
        remaining -= 1;
        setPendingCount(remaining);
      }
    } catch {
      setError("La synchronisation des ventes enregistrées n'a pas pu démarrer.");
    } finally {
      synchronizingRef.current = false;
      setSyncing(false);
    }
  }, [session.businessId, session.user.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void synchronize(), 0);
    window.addEventListener("online", synchronize);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("online", synchronize);
    };
  }, [synchronize]);

  if (pendingCount === 0 && !syncing && !error) return null;

  return (
    <p className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.75rem)] z-[60] rounded-lg bg-primary px-3 py-2 text-center text-xs font-medium text-primary-foreground shadow-lg">
      {syncing ? "Synchronisation des ventes enregistrées…" : error ?? `${pendingCount} vente${pendingCount > 1 ? "s" : ""} à synchroniser dès le retour du réseau.`}
    </p>
  );
}
