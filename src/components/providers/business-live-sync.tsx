"use client";

import { useEffect } from "react";
import { useBusinessSession } from "@/components/providers/business-provider";
import { useCoalescedRouterRefresh } from "@/hooks/use-coalesced-router-refresh";
import { createClient } from "@/lib/supabase/client";

const BUSINESS_FILTERED_TABLES = [
  "sales",
  "cashier_sale_queue",
  "owner_sale_cashier_collections",
  "products",
  "categories",
  "customers",
  "expenses",
  "expense_categories",
  "purchases",
  "suppliers",
  "notifications",
  "business_members",
  "sale_returns",
  "customer_debt_payments",
  "supplier_debt_payments",
  "stock_movements",
  "business_invitations",
] as const;

/** Rafraîchit les pages serveur dès qu'un autre membre crée, modifie ou supprime une donnée. */
export function BusinessLiveSync() {
  const session = useBusinessSession();
  const refresh = useCoalescedRouterRefresh(150);

  useEffect(() => {
    const supabase = createClient();
    let channel = supabase.channel(`business-live-${session.businessId}`);

    for (const table of BUSINESS_FILTERED_TABLES) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `business_id=eq.${session.businessId}`,
        },
        refresh,
      );
    }

    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "businesses",
        filter: `id=eq.${session.businessId}`,
      },
      refresh,
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") refresh();
    });

    const fallback = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 8000);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);

    return () => {
      window.clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      void supabase.removeChannel(channel);
    };
  }, [refresh, session.businessId]);

  return null;
}
