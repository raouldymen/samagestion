import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Pagination } from "@/components/products/pagination";
import { SaleCard } from "@/components/sales/sale-card";
import { SaleFilters } from "@/components/sales/sale-filters";
import { SalesTable } from "@/components/sales/sales-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { listSales } from "@/lib/sales/queries";
import type { PaymentMethod, PaymentStatus, SaleStatus } from "@/types/sales";

export const metadata: Metadata = {
  title: "Ventes",
};

type SearchParams = Promise<{
  q?: string;
  period?: string;
  from?: string;
  to?: string;
  paymentStatus?: string;
  status?: string;
  paymentMethod?: string;
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

function asSaleStatus(value?: string): SaleStatus | "all" | undefined {
  if (value === "completed" || value === "cancelled" || value === "all") {
    return value;
  }

  return undefined;
}

function asPaymentMethod(value?: string): PaymentMethod | "all" | undefined {
  if (
    value === "cash" ||
    value === "wave" ||
    value === "orange_money" ||
    value === "bank" ||
    value === "card" ||
    value === "other" ||
    value === "all"
  ) {
    return value;
  }

  return undefined;
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireBusinessSession();
  const params = await searchParams;
  const result = await listSales({
    q: params.q,
    period: asPeriod(params.period),
    from: params.from,
    to: params.to,
    paymentStatus: asPaymentStatus(params.paymentStatus),
    status: asSaleStatus(params.status),
    paymentMethod: asPaymentMethod(params.paymentMethod),
    page: Number(params.page ?? "1") || 1,
  });

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Ventes</h1>
        {can(session.role, "sales.create") ? (
          <Button href="/sales/new" size="icon" aria-label="Nouvelle vente">
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div className="hidden lg:block">
        <PageHeader
          title="Ventes"
          description="Consultez et enregistrez vos ventes."
          actions={
            can(session.role, "sales.create") ? (
              <Button href="/sales/new">
                <Plus className="size-4" aria-hidden="true" />
                Nouvelle vente
              </Button>
            ) : null
          }
        />
      </div>
      <div className="flex flex-col gap-4">
        <SaleFilters />
        {result.items.length === 0 ? (
          <Card className="py-10 text-center">
            <p className="font-medium">Aucune vente pour le moment.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Enregistrez votre première vente pour suivre le chiffre d&apos;affaires.
            </p>
            {can(session.role, "sales.create") ? (
              <Button href="/sales/new" className="mt-4">
                Nouvelle vente
              </Button>
            ) : null}
          </Card>
        ) : (
          <>
            <div className="grid gap-3 lg:hidden">
              {result.items.map((sale) => (
                <SaleCard key={sale.id} sale={sale} />
              ))}
            </div>
            <SalesTable sales={result.items} />
            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              query={params}
            />
          </>
        )}
      </div>
      {can(session.role, "sales.create") ? (
        <Link
          href="/sales/new"
          className="fixed right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
          style={{ bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)" }}
          aria-label="Nouvelle vente"
        >
          <Plus className="size-6" aria-hidden="true" />
        </Link>
      ) : null}
    </>
  );
}
