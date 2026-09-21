"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoalescedRouterRefresh } from "@/hooks/use-coalesced-router-refresh";

/** Actualise la liste du vendeur dès que la caisse traite l'une de ses ventes. */
export function SellerSalesLiveRefresh({ userId }: { userId: string }) {
  const refresh = useCoalescedRouterRefresh();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`seller-sales-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "cashier_sale_queue", filter: `seller_id=eq.${userId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sales", filter: `user_id=eq.${userId}` },
        refresh,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  return null;
}
