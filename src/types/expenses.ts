import type { ExpenseStatus, PaymentMethod } from "./database";

export type ExpenseCategory = {
  id: string;
  businessId: string;
  name: string;
  createdAt: string;
};

export type Expense = {
  id: string;
  businessId: string;
  categoryId: string | null;
  categoryName: string | null;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  expenseDate: string;
  notes: string | null;
  status: ExpenseStatus;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseStats = {
  today: number;
  week: number;
  month: number;
  total: number;
};

export type ExpenseListFilters = {
  q?: string;
  period?: "today" | "week" | "month" | "previous_month" | "custom";
  from?: string;
  to?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod | "all";
  status?: ExpenseStatus | "all";
  page?: number;
};

export type ExpenseListResult = {
  items: Expense[];
  total: number;
  page: number;
  pageSize: number;
};

export type { ExpenseStatus };
