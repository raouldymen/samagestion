import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ExpenseCard } from "@/components/expenses/expense-card";
import { ExpenseCategoryManager } from "@/components/expenses/expense-category-manager";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseStatsCards } from "@/components/expenses/expense-stats";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { Pagination } from "@/components/products/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { isPaymentMethodFilter } from "@/lib/expenses/constants";
import { getExpenseStats, listExpenseCategories, listExpenses } from "@/lib/expenses/queries";
import type { ExpenseStatus, PaymentMethod } from "@/types/database";
import type { ExpenseListFilters } from "@/types/expenses";

export const metadata: Metadata = {
  title: "Dépenses",
};

type SearchParams = Promise<{
  q?: string;
  period?: string;
  from?: string;
  to?: string;
  category?: string;
  paymentMethod?: string;
  status?: string;
  page?: string;
}>;

function asPeriod(value?: string): ExpenseListFilters["period"] {
  if (
    value === "today" ||
    value === "week" ||
    value === "previous_month" ||
    value === "custom"
  ) {
    return value;
  }

  return "month";
}

function asPaymentMethod(value?: string): PaymentMethod | "all" | undefined {
  if (value && isPaymentMethodFilter(value)) {
    return value;
  }

  return undefined;
}

function asStatus(value?: string): ExpenseStatus | "all" | undefined {
  if (value === "active" || value === "cancelled" || value === "all") {
    return value;
  }

  return undefined;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireBusinessSession();
  const params = await searchParams;
  const canManage = can(session.role, "expenses.manage");
  const [stats, categories, result] = await Promise.all([
    getExpenseStats(),
    listExpenseCategories(),
    listExpenses({
      q: params.q,
      period: asPeriod(params.period),
      from: params.from,
      to: params.to,
      categoryId: params.category && params.category !== "all" ? params.category : undefined,
      paymentMethod: asPaymentMethod(params.paymentMethod),
      status: asStatus(params.status),
      page: Number(params.page ?? "1") || 1,
    }),
  ]);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Dépenses</h1>
        {canManage ? (
          <Button href="/expenses/new" size="icon" aria-label="Ajouter une dépense">
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div className="hidden lg:block">
        <PageHeader
          title="Dépenses"
          description="Suivez les dépenses de votre activité."
          actions={
            <>
              {canManage ? <ExpenseCategoryManager categories={categories} /> : null}
              {canManage ? (
                <Button href="/expenses/new">
                  <Plus className="size-4" aria-hidden="true" />
                  Ajouter une dépense
                </Button>
              ) : null}
            </>
          }
        />
      </div>
      <div className="flex flex-col gap-4">
        <ExpenseStatsCards stats={stats} />
        <ExpenseFilters categories={categories} />
        {result.items.length === 0 ? (
          <Card className="py-10 text-center">
            <p className="font-medium">Aucune dépense pour le moment.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Enregistrez une dépense pour suivre vos sorties d&apos;argent.
            </p>
            {canManage ? (
              <Button href="/expenses/new" className="mt-4">
                Ajouter une dépense
              </Button>
            ) : null}
          </Card>
        ) : (
          <>
            <div className="grid gap-3 lg:hidden">
              {result.items.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} canManage={canManage} />
              ))}
            </div>
            <ExpensesTable expenses={result.items} canManage={canManage} />
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
          href="/expenses/new"
          className="fixed right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
          style={{ bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)" }}
          aria-label="Ajouter une dépense"
        >
          <Plus className="size-6" aria-hidden="true" />
        </Link>
      ) : null}
    </>
  );
}
