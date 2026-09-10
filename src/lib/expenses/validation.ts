import type { FieldErrors } from "@/types";
import { isPaymentMethod } from "@/lib/sales/constants";
import type { PaymentMethod } from "@/types/database";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function toNumber(value: string) {
  if (!value) {
    return Number.NaN;
  }

  return Number(value.replace(",", "."));
}

export type ExpenseFormValues = {
  expenseId?: string;
  description: string;
  categoryId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  expenseDate: string;
  notes: string;
};

export function validateExpenseForm(formData: FormData, mode: "create" | "edit") {
  const description = readString(formData, "description");
  const categoryId = readString(formData, "categoryId");
  const amount = toNumber(readString(formData, "amount"));
  const paymentMethod = readString(formData, "paymentMethod");
  const expenseDate = readString(formData, "expenseDate");
  const notes = readString(formData, "notes");
  const expenseId = readString(formData, "expenseId");
  const fieldErrors: FieldErrors = {};

  if (!description) {
    fieldErrors.description = "La description est obligatoire.";
  }

  if (!categoryId) {
    fieldErrors.categoryId = "La catégorie est obligatoire.";
  }

  if (Number.isNaN(amount) || amount <= 0) {
    fieldErrors.amount = "Le montant doit être supérieur à 0.";
  }

  if (!isPaymentMethod(paymentMethod)) {
    fieldErrors.paymentMethod = "Le mode de paiement est obligatoire.";
  }

  if (!expenseDate) {
    fieldErrors.expenseDate = "La date est obligatoire.";
  }

  if (mode === "edit" && !expenseId) {
    fieldErrors.expenseId = "Dépense introuvable.";
  }

  const error = Object.keys(fieldErrors).length > 0 ? "Veuillez corriger les champs indiqués." : null;

  return {
    error,
    fieldErrors,
    values: {
      expenseId: expenseId || undefined,
      description,
      categoryId,
      amount,
      paymentMethod: isPaymentMethod(paymentMethod) ? paymentMethod : "cash",
      expenseDate,
      notes,
    } satisfies ExpenseFormValues,
  };
}

export function validateExpenseCategoryForm(formData: FormData) {
  const name = readString(formData, "name");
  const categoryId = readString(formData, "categoryId");
  const fieldErrors: FieldErrors = {};

  if (!name) {
    fieldErrors.name = "Le nom de la catégorie est obligatoire.";
  }

  return {
    error: Object.keys(fieldErrors).length > 0 ? "Veuillez corriger les champs indiqués." : null,
    fieldErrors,
    values: { name, categoryId: categoryId || undefined },
  };
}
