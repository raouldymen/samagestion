import Link from "next/link";
import { Card } from "@/components/ui/card";
import { paymentMethodLabel } from "@/lib/sales/constants";
import { formatCalendarDate, formatFcfaAbsolute } from "@/lib/utils/format";
import type { Expense } from "@/types/expenses";

export function ExpenseCard({ expense }: { expense: Expense }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{expense.description}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatCalendarDate(expense.expenseDate)}
          </p>
        </div>
        {expense.status === "cancelled" ? (
          <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
            Annulée
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-lg font-semibold">{formatFcfaAbsolute(expense.amount)}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {expense.categoryName ?? "Sans catégorie"} · {paymentMethodLabel(expense.paymentMethod)} ·{" "}
        {expense.creatorName}
      </p>
    </>
  );

  return (
    <Card className="p-4">
      <Link href={`/expenses/${expense.id}`} className="block">
        {content}
      </Link>
    </Card>
  );
}
