"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCashierCheckoutLiveDataAction } from "@/lib/sales/actions";
import { createClient } from "@/lib/supabase/client";
import type { CashierCheckoutSummary, CashierQueuedSale, CashierTodaySale, OwnerSaleCollection } from "@/lib/sales/queries";

export type CashierCheckoutLiveData = {
  sales: CashierQueuedSale[];
  summary: CashierCheckoutSummary;
  ownerCollections: OwnerSaleCollection[];
  todaySales: CashierTodaySale[];
};

function snapshotKey(data: CashierCheckoutLiveData) {
  return [
    data.sales.map((sale) => sale.id).join(","),
    data.todaySales.map((sale) => `${sale.id}:${sale.amountPaid}`).join(","),
    data.ownerCollections.map((collection) => collection.id).join(","),
    data.summary.count,
    data.summary.total,
  ].join("|");
}

/** Garde la file de caisse à jour dès qu'un vendeur envoie une vente, sans rechargement manuel. */
export function useCashierCheckoutLiveData(businessId: string, initial: CashierCheckoutLiveData): CashierCheckoutLiveData {
  const [data, setData] = useState(initial);
  const serverKey = snapshotKey(initial);
  const lastServerKey = useRef(serverKey);

  if (lastServerKey.current !== serverKey) {
    lastServerKey.current = serverKey;
    setData(initial);
  }

  const pull = useCallback(() => {
    void getCashierCheckoutLiveDataAction().then(setData);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = null;
        pull();
      }, 50);
    };

    const channel = supabase
      .channel(`cashier-checkout-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cashier_sale_queue", filter: `business_id=eq.${businessId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "owner_sale_cashier_collections", filter: `business_id=eq.${businessId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales", filter: `business_id=eq.${businessId}` },
        refresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });

    const fallback = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 4000);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);

    return () => {
      if (debounce) clearTimeout(debounce);
      window.clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      void supabase.removeChannel(channel);
    };
  }, [businessId, pull]);

  return data;
}
