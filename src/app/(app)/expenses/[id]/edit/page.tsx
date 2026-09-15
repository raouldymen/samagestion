import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CancelExpenseButton } from "@/components/expenses/cancel-expense-button";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getExpense, listExpenseCategories } from "@/lib/expenses/queries";

export const metadata: Metadata = {
  title: "Modifier une dépense",
};

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireBusinessSession();

  if (!can(session.role, "expenses.manage")) {
    redirect("/expenses");
  }

  const { id } = await params;
  const [expense, categories] = await Promise.all([getExpense(id), listExpenseCategories()]);

  if (!expense) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Modifier la dépense"
        description={
          expense.status === "cancelled"
            ? "Cette dépense est annulée et n'est plus comptabilisée."
            : "Mettez à jour les informations. L'annulation conserve l'historique."
        }
        actions={expense.status === "active" ? <CancelExpenseButton expense={expense} /> : null}
      />
      <Card className="max-w-2xl">
        {expense.status === "cancelled" ? (
          <p className="text-sm text-muted-foreground">
            Impossible de modifier une dépense annulée.
          </p>
        ) : (
          <ExpenseForm mode="edit" expense={expense} categories={categories} />
        )}
      </Card>
    </>
  );
}
