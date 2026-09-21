"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createExpenseAction, updateExpenseAction } from "@/lib/expenses/actions";
import { PAYMENT_METHODS } from "@/lib/sales/constants";
import type { Expense, ExpenseCategory } from "@/types/expenses";

function todayInDakar() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Dakar" }).format(new Date());
}

export function ExpenseForm({
  mode,
  expense,
  categories,
}: {
  mode: "create" | "edit";
  expense?: Expense;
  categories: ExpenseCategory[];
}) {
  const action = mode === "create" ? createExpenseAction : updateExpenseAction;
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "edit" && expense ? (
        <input type="hidden" name="expenseId" value={expense.id} />
      ) : null}
      <Input
        id="description"
        name="description"
        label="Description"
        required
        defaultValue={expense?.description}
        placeholder="Transport marchandises"
        error={state.fieldErrors?.description}
      />
      <Select
        id="categoryId"
        name="categoryId"
        label="Catégorie"
        required
        defaultValue={expense?.categoryId ?? ""}
        error={state.fieldErrors?.categoryId}
      >
        <option value="">Choisir une catégorie</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="amount"
          name="amount"
          label="Montant"
          type="number"
          inputMode="decimal"
          min={1}
          step="0.01"
          required
          defaultValue={expense?.amount ?? ""}
          placeholder="15000"
          error={state.fieldErrors?.amount}
        />
        <Select
          id="paymentMethod"
          name="paymentMethod"
          label="Mode de paiement"
          required
          defaultValue={expense?.paymentMethod ?? "cash"}
          error={state.fieldErrors?.paymentMethod}
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </Select>
      </div>
      <DateInput
        id="expenseDate"
        name="expenseDate"
        label="Date"
        required
        defaultValue={expense?.expenseDate ?? todayInDakar()}
        error={state.fieldErrors?.expenseDate}
        showToday
      />
      <Textarea
        id="notes"
        name="notes"
        label="Note"
        defaultValue={expense?.notes ?? ""}
        placeholder="Détail optionnel..."
        error={state.fieldErrors?.notes}
      />
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={pending}>
          {mode === "create" ? "Enregistrer la dépense" : "Enregistrer les modifications"}
        </Button>
        <Button href="/expenses" variant="outline">
          Annuler
        </Button>
      </div>
    </form>
  );
}
