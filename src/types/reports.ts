import type { FinancialSummary, Trend } from "@/types/dashboard";
import type { PaymentMethod } from "@/types/database";

export type ReportPeriod =
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "previous_month"
  | "year"
  | "custom";

export type ChartGranularity = "day" | "week" | "month";

export type ReportRange = {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  fromDate: string;
  toDateInclusive: string;
  days: number;
  granularity: ChartGranularity;
};

export type ReportSeriesPoint = {
  bucket: string;
  label: string;
  revenue: number;
  expenses: number;
};

export type ReportProductRow = {
  name: string;
  quantity: number;
  revenue: number;
  cogs: number;
  margin: number;
  marginRate: number;
};

export type ReportCustomerRow = {
  name: string;
  salesCount: number;
  spent: number;
  due: number;
};

export type ReportSupplierRow = {
  name: string;
  purchasesCount: number;
  spent: number;
  due: number;
};

export type ReportPaymentRow = {
  method: PaymentMethod;
  label: string;
  salesCount: number;
  amount: number;
  percent: number;
};

export type DebtBucket = {
  label: string;
  count: number;
  amount: number;
};

export type ReportsBundle = {
  range: ReportRange;
  current: FinancialSummary;
  previous: FinancialSummary;
  revenueTrend: Trend;
  marginRate: number;
  profitRate: number;
  series: ReportSeriesPoint[];
  topSold: ReportProductRow[];
  topMargin: ReportProductRow[];
  unsold: { name: string }[];
  lowSold: { name: string; quantity: number }[];
  shortPeriod: boolean;
  stock: {
    productsCount: number;
    stockValue: number;
    lowStock: number;
    outOfStock: number;
  };
  lowStockItems: { name: string; stockQuantity: number; minimumStock: number }[];
  outOfStockItems: { name: string; category: string | null; lastSaleAt: string | null }[];
  customers: {
    total: number;
    newCount: number;
    buyingCount: number;
    debtorsCount: number;
    receivablesOpen: number;
  };
  topCustomers: ReportCustomerRow[];
  aging: DebtBucket[];
  expenses: {
    total: number;
    count: number;
    average: number;
  };
  expenseCategories: { name: string; amount: number; percent: number }[];
  purchases: {
    total: number;
    count: number;
    suppliersCount: number;
    payablesOpen: number;
  };
  suppliers: ReportSupplierRow[];
  payments: ReportPaymentRow[];
};
