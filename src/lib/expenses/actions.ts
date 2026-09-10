"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { mapExpenseError } from "@/lib/expenses/errors";
import { validateExpenseCategoryForm, validateExpenseForm } from "@/lib/expenses/validation";
import { isRedirectError } from "@/lib/products/errors";
import { createClient } from "@/lib/supabase/server";
import type { AuthResult } from "@/types";

function revalidateExpenses(expenseId?: string) {
  revalidatePath("/expenses");
  revalidatePath("/expenses/new");
  revalidatePath("/dashboard");

  if (expenseId) {
    revalidatePath(`/expenses/${expenseId}/edit`);
  }
}

export async function createExpenseAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateExpenseForm(formData, "create");

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const session = await requireBusinessSession();

    if (!can(session.role, "expenses.manage")) {
      return { error: "Vous n'avez pas l'autorisation de créer une dépense." };
    }

    const supabase = await createClient();
    const { data, error: rpcError } = await supabase.rpc("create_expense", {
      p_description: values.description,
      p_category_id: values.categoryId,
      p_amount: values.amount,
      p_payment_method: values.paymentMethod,
      p_expense_date: values.expenseDate,
      p_notes: values.notes || null,
    });

    const expense = Array.isArray(data) ? data[0] : data;

    if (rpcError || !expense?.id) {
      return { error: mapExpenseError(rpcError ?? new Error("EXPENSE_NOT_FOUND")) };
    }

    revalidateExpenses(expense.id);
    redirect("/expenses");
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapExpenseError(caught) };
  }
}

export async function updateExpenseAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateExpenseForm(formData, "edit");

  if (error || !values.expenseId) {
    return { error: error ?? "Dépense introuvable.", fieldErrors };
  }

  try {
    const session = await requireBusinessSession();

    if (!can(session.role, "expenses.manage")) {
      return { error: "Vous n'avez pas l'autorisation de modifier une dépense." };
    }

    const supabase = await createClient();
    const { data, error: rpcError } = await supabase.rpc("update_expense", {
      p_expense_id: values.expenseId,
      p_description: values.description,
      p_category_id: values.categoryId,
      p_amount: values.amount,
      p_payment_method: values.paymentMethod,
      p_expense_date: values.expenseDate,
      p_notes: values.notes || null,
    });

    const expense = Array.isArray(data) ? data[0] : data;

    if (rpcError || !expense?.id) {
      return { error: mapExpenseError(rpcError ?? new Error("EXPENSE_NOT_FOUND")) };
    }

    revalidateExpenses(expense.id);
    redirect("/expenses");
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapExpenseError(caught) };
  }
}

export async function cancelExpenseAction(expenseId: string): Promise<AuthResult> {
  try {
    const session = await requireBusinessSession();

    if (!can(session.role, "expenses.manage")) {
      return { error: "Vous n'avez pas l'autorisation d'annuler une dépense." };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_expense", { p_expense_id: expenseId });

    if (error) {
      return { error: mapExpenseError(error) };
    }

    revalidateExpenses(expenseId);
    return { error: null, success: true };
  } catch (caught) {
    return { error: mapExpenseError(caught) };
  }
}

export async function createExpenseCategoryAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateExpenseCategoryForm(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const session = await requireBusinessSession();

    if (!can(session.role, "expenses.manage")) {
      return { error: "Vous n'avez pas l'autorisation de gérer les catégories." };
    }

    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("create_expense_category", {
      p_name: values.name,
    });

    if (rpcError) {
      return { error: mapExpenseError(rpcError) };
    }

    revalidateExpenses();
    return { error: null, success: true, message: values.name };
  } catch (caught) {
    return { error: mapExpenseError(caught) };
  }
}

export async function updateExpenseCategoryAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateExpenseCategoryForm(formData);

  if (error || !values.categoryId) {
    return { error: error ?? "Catégorie introuvable.", fieldErrors };
  }

  try {
    const session = await requireBusinessSession();

    if (!can(session.role, "expenses.manage")) {
      return { error: "Vous n'avez pas l'autorisation de gérer les catégories." };
    }

    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("update_expense_category", {
      p_category_id: values.categoryId,
      p_name: values.name,
    });

    if (rpcError) {
      return { error: mapExpenseError(rpcError) };
    }

    revalidateExpenses();
    return { error: null, success: true };
  } catch (caught) {
    return { error: mapExpenseError(caught) };
  }
}
