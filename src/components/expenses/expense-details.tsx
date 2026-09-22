import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { paymentMethodLabel } from "@/lib/sales/constants";
import { formatCalendarDate, formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";
import type { Expense } from "@/types/expenses";

export function ExpenseDetails({ expense }: { expense: Expense }) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{expense.description}</CardTitle>
        {expense.status === "cancelled" ? (
          <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger">
            Annulée
          </span>
        ) : null}
      </CardHeader>
      <p className={`text-2xl font-semibold ${expense.status === "cancelled" ? "text-muted-foreground line-through" : ""}`}>
        {formatFcfaAbsolute(expense.amount)}
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Catégorie</dt>
          <dd className="font-medium">{expense.categoryName ?? "Sans catégorie"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paiement</dt>
          <dd className="font-medium">{paymentMethodLabel(expense.paymentMethod)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Date</dt>
          <dd className="font-medium">{formatCalendarDate(expense.expenseDate)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Enregistrée par</dt>
          <dd className="font-medium">{expense.creatorName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Enregistrée le</dt>
          <dd className="font-medium">{formatDateTime(expense.createdAt)}</dd>
        </div>
      </dl>
      {expense.notes ? (
        <div className="mt-4 text-sm">
          <p className="text-muted-foreground">Note</p>
          <p className="mt-1 whitespace-pre-wrap">{expense.notes}</p>
        </div>
      ) : null}
    </Card>
  );
}
