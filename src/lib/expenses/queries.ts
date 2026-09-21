import { requireBusinessSession } from "@/lib/auth/session";
import { EXPENSE_PAGE_SIZE, shortDisplayName } from "@/lib/expenses/constants";
import { expenseDateRange, type ExpensePeriod } from "@/lib/finance/summary";
import { sanitizeSearch } from "@/lib/products/constants";
import { isPaymentMethod } from "@/lib/sales/constants";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseStatus, PaymentMethod } from "@/types/database";
import type {
  Expense,
  ExpenseCategory,
  ExpenseListFilters,
  ExpenseListResult,
  ExpenseStats,
} from "@/types/expenses";

function asNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  return Number(value);
}

function asPaymentMethod(value: string | null): PaymentMethod {
  if (isPaymentMethod(value ?? "")) {
    return value as PaymentMethod;
  }

  return "other";
}

function asStatus(value: string | null): ExpenseStatus {
  return value === "cancelled" ? "cancelled" : "active";
}

export async function ensureExpenseCategories() {
  await requireBusinessSession();
  const supabase = await createClient();
  await supabase.rpc("ensure_default_expense_categories");
}

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_expense_categories");

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export async function getExpenseStats(): Promise<ExpenseStats> {
  await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_expense_stats");
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    return { today: 0, week: 0, month: 0, total: 0 };
  }

  return {
    today: asNumber(row.today),
    week: asNumber(row.week),
    month: asNumber(row.month),
    total: asNumber(row.total),
  };
}

export async function listExpenses(filters: ExpenseListFilters = {}): Promise<ExpenseListResult> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * EXPENSE_PAGE_SIZE;
  const to = from + EXPENSE_PAGE_SIZE - 1;
  const search = sanitizeSearch(filters.q ?? "");
  const period = (filters.period ?? "month") as ExpensePeriod;
  const range = expenseDateRange(period, filters.from, filters.to);

  let query = supabase
    .from("expenses")
    .select(
      "id, business_id, category_id, description, amount, payment_method, expense_date, notes, status, created_by, created_at, updated_at",
      { count: "exact" },
    )
    .eq("business_id", session.businessId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (range.from) {
    query = query.gte("expense_date", range.from);
  }

  if (range.to) {
    query = query.lte("expense_date", range.to);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    query = query.eq("payment_method", filters.paymentMethod);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  } else if (filters.status !== "all") {
    query = query.eq("status", "active");
  }

  if (search) {
    const { data: matchedCategories } = await supabase
      .from("expense_categories")
      .select("id")
      .eq("business_id", session.businessId)
      .ilike("name", `%${search}%`);

    const categoryIds = (matchedCategories ?? []).map((category) => category.id);

    if (categoryIds.length > 0) {
      query = query.or(`description.ilike.%${search}%,category_id.in.(${categoryIds.join(",")})`);
    } else {
      query = query.ilike("description", `%${search}%`);
    }
  }

  const { data, count, error } = await query;

  if (error || !data) {
    return { items: [], total: 0, page, pageSize: EXPENSE_PAGE_SIZE };
  }

  const categoryIds = [
    ...new Set(data.map((row) => row.category_id).filter((id): id is string => Boolean(id))),
  ];
  const userIds = [...new Set(data.map((row) => row.created_by))];

  const [{ data: categories }, { data: profiles }] = await Promise.all([
    categoryIds.length
      ? supabase.from("expense_categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    userIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const creatorNames = new Map(
    (profiles ?? []).map((profile) => [profile.id, shortDisplayName(profile.full_name || "Membre")]),
  );

  const items: Expense[] = data.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    categoryId: row.category_id,
    categoryName: row.category_id ? (categoryNames.get(row.category_id) ?? null) : null,
    description: row.description,
    amount: asNumber(row.amount),
    paymentMethod: asPaymentMethod(row.payment_method),
    expenseDate: row.expense_date,
    notes: row.notes,
    status: asStatus(row.status),
    createdBy: row.created_by,
    creatorName: creatorNames.get(row.created_by) || "Membre",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    items,
    total: count ?? 0,
    page,
    pageSize: EXPENSE_PAGE_SIZE,
  };
}

export async function getExpense(expenseId: string): Promise<Expense | null> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, business_id, category_id, description, amount, payment_method, expense_date, notes, status, created_by, created_at, updated_at",
    )
    .eq("id", expenseId)
    .eq("business_id", session.businessId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const [{ data: category }, { data: profile }] = await Promise.all([
    data.category_id
      ? supabase.from("expense_categories").select("name").eq("id", data.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("full_name").eq("id", data.created_by).maybeSingle(),
  ]);

  return {
    id: data.id,
    businessId: data.business_id,
    categoryId: data.category_id,
    categoryName: category?.name ?? null,
    description: data.description,
    amount: asNumber(data.amount),
    paymentMethod: asPaymentMethod(data.payment_method),
    expenseDate: data.expense_date,
    notes: data.notes,
    status: asStatus(data.status),
    createdBy: data.created_by,
    creatorName: shortDisplayName(profile?.full_name || "Membre"),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
