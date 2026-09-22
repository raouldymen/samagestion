import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CashierExpenseDialog } from "@/components/sales/cashier-expense-dialog";
import { CashierSaleQueue } from "@/components/sales/cashier-sale-queue";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { ensureExpenseCategories, listExpenseCategories } from "@/lib/expenses/queries";
import { getCashierCheckoutSummary, getCashierClosureSummary, getCashierExpenseSummary, isCashierCheckoutRequired, listCashierSaleQueue, listCashierTodaySales, listOwnerSaleCollections } from "@/lib/sales/queries";
import { Button } from "@/components/ui/button";
import type { ExpenseCategory } from "@/types/expenses";

export const metadata: Metadata = { title: "Caisse" };

export default async function CashierCheckoutPage() {
  const session = await requireBusinessSession();
  const cashierCheckoutRequired = await isCashierCheckoutRequired();
  if (!can(session.role, "sales.create") || session.role === "seller" || (cashierCheckoutRequired && session.role !== "cashier")) {
    redirect("/sales");
  }

  const canCreateExpense = can(session.role, "expenses.create");
  const [sales, summary, ownerCollections, todaySales, expenses, closure, categories] = await Promise.all([
    listCashierSaleQueue(),
    getCashierCheckoutSummary(),
    listOwnerSaleCollections(),
    listCashierTodaySales(),
    getCashierExpenseSummary(),
    getCashierClosureSummary(),
    canCreateExpense
      ? ensureExpenseCategories().then(() => listExpenseCategories())
      : Promise.resolve([] as ExpenseCategory[]),
  ]);
  return (
    <>
      <PageHeader
        title="Caisse"
        description="Encaissez les ventes et enregistrez les sorties d’espèces."
        actions={
          <>
            {canCreateExpense ? <CashierExpenseDialog categories={categories} /> : null}
            <Button href="/sales/checkout/closures" variant="outline">Historique</Button>
          </>
        }
      />
      <CashierSaleQueue businessId={session.businessId} sales={sales} summary={summary} ownerCollections={ownerCollections} todaySales={todaySales} expenses={expenses} closure={session.role === "cashier" ? closure : null} />
    </>
  );
}
