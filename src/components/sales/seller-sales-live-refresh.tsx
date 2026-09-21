"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pagination } from "@/components/products/pagination";
import { SaleCard } from "@/components/sales/sale-card";
import { SalesTable } from "@/components/sales/sales-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listSalesAction } from "@/lib/sales/actions";
import { createClient } from "@/lib/supabase/client";
import type { Customer, SaleListFilters, SaleListResult } from "@/types/sales";

function resultKey(result: SaleListResult) {
  return [
    result.page,
    result.total,
    result.items.map((sale) => `${sale.id}:${sale.awaitingCashier ? "pending" : sale.paymentStatus}`).join(","),
  ].join("|");
}

export function SellerSalesLiveList({
  userId,
  businessId,
  filters,
  initial,
  query,
  canCreate,
  customers,
}: {
  userId: string;
  businessId: string;
  filters: SaleListFilters;
  initial: SaleListResult;
  query: Record<string, string | undefined>;
  canCreate: boolean;
  customers: Customer[];
}) {
  const [result, setResult] = useState(initial);
  const serverKey = resultKey(initial);
  const lastServerKey = useRef(serverKey);

  if (lastServerKey.current !== serverKey) {
    lastServerKey.current = serverKey;
    setResult(initial);
  }

  const pull = useCallback(() => {
    void listSalesAction(filters).then(setResult);
  }, [filters]);

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

    const markQueuePaid = (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const next = payload.new ?? {};
      const previous = payload.old ?? {};
      const queueId = String(next.id ?? previous.id ?? "");
      const status = String(next.status ?? "");
      const sellerId = String(next.seller_id ?? previous.seller_id ?? "");
      if (!queueId || sellerId !== userId || (status !== "completed" && status !== "cancelled")) {
        refresh();
        return;
      }

      setResult((current) => ({
        ...current,
        items: status === "cancelled"
          ? current.items.filter((sale) => sale.id !== queueId)
          : current.items.map((sale) =>
              sale.id === queueId && sale.awaitingCashier
                ? {
                    ...sale,
                    awaitingCashier: false,
                    paymentStatus: "paid",
                    status: "completed",
                    saleNumber: sale.saleNumber === "Vente en attente" ? "Vente" : sale.saleNumber,
                  }
                : sale,
            ),
        total: status === "cancelled" ? Math.max(0, current.total - 1) : current.total,
      }));
      refresh();
    };

    const channel = supabase
      .channel(`seller-sales-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cashier_sale_queue", filter: `seller_id=eq.${userId}` },
        markQueuePaid,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cashier_sale_queue", filter: `business_id=eq.${businessId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { seller_id?: string };
          if (row.seller_id === userId) markQueuePaid(payload as { new: Record<string, unknown>; old: Record<string, unknown> });
        },
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
  }, [businessId, pull, userId]);

  if (result.items.length === 0) {
    return (
      <Card className="py-10 text-center">
        <p className="font-medium">Aucune vente pour le moment.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enregistrez votre première vente pour suivre le chiffre d&apos;affaires.
        </p>
        {canCreate ? (
          <Button href="/sales/new" className="mt-4">
            Nouvelle vente
          </Button>
        ) : null}
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 lg:hidden">
        {result.items.map((sale) => (
          <SaleCard key={sale.id} sale={sale} customers={customers} />
        ))}
      </div>
      <SalesTable sales={result.items} customers={customers} />
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        query={query}
      />
    </>
  );
}
