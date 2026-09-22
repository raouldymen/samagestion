import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CancelExpenseButton } from "@/components/expenses/cancel-expense-button";
import { ExpenseDetails } from "@/components/expenses/expense-details";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getExpense } from "@/lib/expenses/queries";

export const metadata: Metadata = {
  title: "Détail de la dépense",
};

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireBusinessSession();
  const { id } = await params;
  const expense = await getExpense(id);

  if (!expense) {
    notFound();
  }

  const canManage = can(session.role, "expenses.manage") && expense.status === "active";

  return (
    <>
      <PageHeader
        title="Détail de la dépense"
        description={expense.status === "cancelled" ? "Cette dépense a été annulée." : undefined}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button href={`/expenses/${expense.id}/edit`} variant="outline">
                Modifier
              </Button>
              <CancelExpenseButton expense={expense} />
            </div>
          ) : null
        }
      />
      <ExpenseDetails expense={expense} />
    </>
  );
}
