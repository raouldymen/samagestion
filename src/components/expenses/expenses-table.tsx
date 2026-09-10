import Link from "next/link";
import { paymentMethodLabel } from "@/lib/sales/constants";
import { formatCalendarDate, formatFcfaAbsolute } from "@/lib/utils/format";
import type { Expense } from "@/types/expenses";

export function ExpensesTable({
  expenses,
  canManage,
}: {
  expenses: Expense[];
  canManage: boolean;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm lg:block">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-border bg-muted/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Catégorie</th>
            <th className="px-4 py-3 font-medium">Montant</th>
            <th className="px-4 py-3 font-medium">Paiement</th>
            <th className="px-4 py-3 font-medium">Utilisateur</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {expenses.map((expense) => (
            <tr key={expense.id} className="hover:bg-muted/40">
              <td className="px-4 py-3 text-muted-foreground">
                {formatCalendarDate(expense.expenseDate)}
              </td>
              <td className="px-4 py-3 font-medium">
                {expense.description}
                {expense.status === "cancelled" ? (
                  <span className="ml-2 text-xs font-normal text-danger">Annulée</span>
                ) : null}
              </td>
              <td className="px-4 py-3">{expense.categoryName ?? "—"}</td>
              <td className="px-4 py-3">{formatFcfaAbsolute(expense.amount)}</td>
              <td className="px-4 py-3">{paymentMethodLabel(expense.paymentMethod)}</td>
              <td className="px-4 py-3">{expense.creatorName}</td>
              <td className="px-4 py-3">
                {canManage && expense.status === "active" ? (
                  <Link
                    href={`/expenses/${expense.id}/edit`}
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Modifier
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
