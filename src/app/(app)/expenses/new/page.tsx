import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { listExpenseCategories } from "@/lib/expenses/queries";

export const metadata: Metadata = {
  title: "Ajouter une dépense",
};

export default async function NewExpensePage() {
  const session = await requireBusinessSession();

  if (!can(session.role, "expenses.manage")) {
    redirect("/expenses");
  }

  const categories = await listExpenseCategories();

  return (
    <>
      <PageHeader
        title="Ajouter une dépense"
        description="Enregistrez une sortie d'argent de votre activité."
      />
      <Card className="max-w-2xl">
        <ExpenseForm mode="create" categories={categories} />
      </Card>
    </>
  );
}
