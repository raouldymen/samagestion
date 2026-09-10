import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PurchaseCard } from "@/components/purchases/purchase-card";
import { PurchaseFilters } from "@/components/purchases/purchase-filters";
import { PurchaseStatsCards } from "@/components/purchases/purchase-stats";
import { PurchaseTable } from "@/components/purchases/purchase-table";
import { Pagination } from "@/components/products/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getPurchaseStats, listPurchases, listSuppliers } from "@/lib/purchases/queries";
import type { PaymentStatus, PurchaseStatus } from "@/types/purchases";

export const metadata: Metadata = {
  title: "Achats",
};

type SearchParams = Promise<{
  q?: string;
  period?: string;
  from?: string;
  to?: string;
  paymentStatus?: string;
  status?: string;
  supplier?: string;
  page?: string;
}>;

function asPeriod(value?: string): "today" | "week" | "month" | "custom" {
  if (value === "today" || value === "week" || value === "custom") {
    return value;
  }

  return "month";
}

function asPaymentStatus(value?: string): PaymentStatus | "all" | undefined {
  if (value === "paid" || value === "partial" || value === "unpaid" || value === "all") {
    return value;
  }

  return undefined;
}

function asPurchaseStatus(value?: string): PurchaseStatus | "all" | undefined {
  if (value === "completed" || value === "cancelled" || value === "all") {
    return value;
  }

  return undefined;
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireBusinessSession();
  const params = await searchParams;
  const canManage = can(session.role, "purchases.manage");
  const [stats, suppliers, result] = await Promise.all([
    getPurchaseStats(),
    listSuppliers(),
    listPurchases({
      q: params.q,
      period: asPeriod(params.period),
      from: params.from,
      to: params.to,
      paymentStatus: asPaymentStatus(params.paymentStatus),
      status: asPurchaseStatus(params.status),
      supplierId: params.supplier && params.supplier !== "all" ? params.supplier : undefined,
      page: Number(params.page ?? "1") || 1,
    }),
  ]);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Achats</h1>
        {canManage ? (
          <Button href="/purchases/new" size="icon" aria-label="Nouvel achat">
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div className="hidden lg:block">
        <PageHeader
          title="Achats"
          description="Gérez vos approvisionnements et vos fournisseurs."
          actions={
            <>
              <Button href="/suppliers" variant="outline">
                Fournisseurs
              </Button>
              {canManage ? (
                <Button href="/purchases/new">
                  <Plus className="size-4" aria-hidden="true" />
                  Nouvel achat
                </Button>
              ) : null}
            </>
          }
        />
      </div>
      <div className="flex flex-col gap-4">
        <PurchaseStatsCards stats={stats} />
        <PurchaseFilters suppliers={suppliers} />
        {result.items.length === 0 ? (
          <Card className="py-10 text-center">
            <p className="font-medium">Aucun achat pour le moment.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Enregistrez un achat pour réapprovisionner le stock.
            </p>
            {canManage ? (
              <Button href="/purchases/new" className="mt-4">
                Nouvel achat
              </Button>
            ) : null}
          </Card>
        ) : (
          <>
            <div className="grid gap-3 lg:hidden">
              {result.items.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} />
              ))}
            </div>
            <PurchaseTable purchases={result.items} />
            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              query={params}
            />
          </>
        )}
      </div>
      {canManage ? (
        <Link
          href="/purchases/new"
          className="fixed right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
          style={{ bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)" }}
          aria-label="Nouvel achat"
        >
          <Plus className="size-6" aria-hidden="true" />
        </Link>
      ) : null}
    </>
  );
}
