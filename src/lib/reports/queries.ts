import { cache } from "react";
import { financialSummary, percentChange, ratioPercent } from "@/lib/finance/summary";
import { requireReportsSession } from "@/lib/reports/access";
import { formatPeriodLabel, reportPeriodRange, seriesLabel } from "@/lib/reports/period";
import { PAYMENT_METHODS, isPaymentMethod } from "@/lib/sales/constants";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { PaymentMethod } from "@/types/database";
import type { ReportPeriod, ReportProductRow, ReportsBundle } from "@/types/reports";

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return {};
}

function asList(value: Json | undefined): Json[] {
  return Array.isArray(value) ? value : [];
}

function parseSummary(value: Json | undefined) {
  const row = asRecord(value);
  return financialSummary({
    revenue: asNumber(row.revenue),
    collected: asNumber(row.collected),
    receivables: asNumber(row.receivables),
    salesCount: asNumber(row.sales_count),
    cogs: asNumber(row.cogs),
    expenses: asNumber(row.expenses),
  });
}

function parseProduct(row: Json, withQuantity: boolean): ReportProductRow {
  const item = asRecord(row);
  const revenue = asNumber(item.revenue);
  const cogs = asNumber(item.cogs);
  const margin = asNumber(item.margin);
  return {
    name: String(item.name ?? "Produit"),
    quantity: withQuantity ? asNumber(item.quantity) : 0,
    revenue,
    cogs,
    margin,
    marginRate: ratioPercent(margin, revenue),
  };
}

const emptyStock = {
  productsCount: 0,
  stockValue: 0,
  lowStock: 0,
  outOfStock: 0,
};

const emptyCustomers = {
  total: 0,
  newCount: 0,
  buyingCount: 0,
  debtorsCount: 0,
  receivablesOpen: 0,
};

const emptyExpenses = { total: 0, count: 0, average: 0 };
const emptyPurchases = { total: 0, count: 0, suppliersCount: 0, payablesOpen: 0 };

async function loadReportsBundle(
  period: ReportPeriod,
  from?: string,
  to?: string,
): Promise<ReportsBundle> {
  await requireReportsSession();
  const range = reportPeriodRange(period, from, to);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_reports_bundle", {
    p_from: range.from,
    p_to: range.to,
    p_prev_from: range.prevFrom,
    p_prev_to: range.prevTo,
    p_granularity: range.granularity,
  });

  const empty = financialSummary({
    revenue: 0,
    collected: 0,
    receivables: 0,
    salesCount: 0,
    cogs: 0,
    expenses: 0,
  });

  if (error || data == null) {
    return emptyBundle(range, empty);
  }

  const bundle = asRecord(data as Json);
  const current = parseSummary(bundle.current);
  const previous = parseSummary(bundle.previous);
  const expenseByBucket = new Map(
    asList(bundle.expense_series).map((item) => {
      const row = asRecord(item);
      return [String(row.bucket ?? "").slice(0, 10), asNumber(row.amount)];
    }),
  );

  const series = asList(bundle.series).map((item) => {
    const row = asRecord(item);
    const bucket = String(row.bucket ?? "").slice(0, 10);
    return {
      bucket,
      label: seriesLabel(bucket, range.granularity),
      revenue: asNumber(row.revenue),
      expenses: expenseByBucket.get(bucket) ?? 0,
    };
  });

  const expenseCategoriesRaw = asList(bundle.expense_categories).map((item) => {
    const row = asRecord(item);
    return { name: String(row.name ?? "Autre"), amount: asNumber(row.amount) };
  });
  const expenseTotal = expenseCategoriesRaw.reduce((sum, item) => sum + item.amount, 0);

  const paymentsRaw = asList(bundle.payments).map((item) => {
    const row = asRecord(item);
    const method = String(row.method ?? "other");
    return {
      method: (isPaymentMethod(method) ? method : "other") as PaymentMethod,
      salesCount: asNumber(row.sales_count),
      amount: asNumber(row.amount),
    };
  });
  const paymentsTotal = paymentsRaw.reduce((sum, item) => sum + item.amount, 0);

  const payments = PAYMENT_METHODS.map((method) => {
    const found = paymentsRaw.find((item) => item.method === method.value);
    const amount = found?.amount ?? 0;
    return {
      method: method.value,
      label: method.label,
      salesCount: found?.salesCount ?? 0,
      amount,
      percent: ratioPercent(amount, paymentsTotal),
    };
  });

  const agingRaw = asRecord(bundle.aging);
  const agingBucket = (key: string, label: string) => {
    const row = asRecord(agingRaw[key]);
    return { label, count: asNumber(row.count), amount: asNumber(row.amount) };
  };

  const stock = asRecord(bundle.stock);
  const customers = asRecord(bundle.customers);
  const expenses = asRecord(bundle.expenses);
  const purchases = asRecord(bundle.purchases);

  return {
    range,
    current,
    previous,
    revenueTrend: percentChange(current.revenue, previous.revenue),
    marginRate: ratioPercent(current.grossMargin, current.revenue),
    profitRate: ratioPercent(current.netProfit, current.revenue),
    series,
    topSold: asList(bundle.top_sold).map((item) => parseProduct(item, true)),
    topMargin: asList(bundle.top_margin).map((item) => parseProduct(item, false)),
    unsold: asList(bundle.unsold).map((item) => ({ name: String(asRecord(item).name ?? "Produit") })),
    lowSold: asList(bundle.low_sold).map((item) => {
      const row = asRecord(item);
      return { name: String(row.name ?? "Produit"), quantity: asNumber(row.quantity) };
    }),
    shortPeriod: range.days <= 7,
    stock: {
      productsCount: asNumber(stock.products_count),
      stockValue: asNumber(stock.stock_value),
      lowStock: asNumber(stock.low_stock),
      outOfStock: asNumber(stock.out_of_stock),
    },
    lowStockItems: asList(bundle.low_stock).map((item) => {
      const row = asRecord(item);
      return {
        name: String(row.name ?? "Produit"),
        stockQuantity: asNumber(row.stock_quantity),
        minimumStock: asNumber(row.minimum_stock),
      };
    }),
    outOfStockItems: asList(bundle.out_of_stock).map((item) => {
      const row = asRecord(item);
      return {
        name: String(row.name ?? "Produit"),
        category: row.category ? String(row.category) : null,
        lastSaleAt: row.last_sale_at ? String(row.last_sale_at) : null,
      };
    }),
    customers: {
      total: asNumber(customers.total),
      newCount: asNumber(customers.new_count),
      buyingCount: asNumber(customers.buying_count),
      debtorsCount: asNumber(customers.debtors_count),
      receivablesOpen: asNumber(customers.receivables_open),
    },
    topCustomers: asList(bundle.top_customers).map((item) => {
      const row = asRecord(item);
      return {
        name: String(row.name ?? "Client"),
        salesCount: asNumber(row.sales_count),
        spent: asNumber(row.spent),
        due: asNumber(row.due),
      };
    }),
    aging: [
      agingBucket("d0_7", "0–7 jours"),
      agingBucket("d8_30", "8–30 jours"),
      agingBucket("d31_90", "31–90 jours"),
      agingBucket("d90_plus", "+90 jours"),
    ],
    expenses: {
      total: asNumber(expenses.total),
      count: asNumber(expenses.count),
      average: asNumber(expenses.average),
    },
    expenseCategories: expenseCategoriesRaw.map((item) => ({
      ...item,
      percent: ratioPercent(item.amount, expenseTotal),
    })),
    purchases: {
      total: asNumber(purchases.total),
      count: asNumber(purchases.count),
      suppliersCount: asNumber(purchases.suppliers_count),
      payablesOpen: asNumber(purchases.payables_open),
    },
    suppliers: asList(bundle.suppliers).map((item) => {
      const row = asRecord(item);
      return {
        name: String(row.name ?? "Fournisseur"),
        purchasesCount: asNumber(row.purchases_count),
        spent: asNumber(row.spent),
        due: asNumber(row.due),
      };
    }),
    payments,
  };
}

function emptyBundle(range: ReturnType<typeof reportPeriodRange>, empty: ReturnType<typeof financialSummary>): ReportsBundle {
  return {
    range,
    current: empty,
    previous: empty,
    revenueTrend: percentChange(0, 0),
    marginRate: 0,
    profitRate: 0,
    series: [],
    topSold: [],
    topMargin: [],
    unsold: [],
    lowSold: [],
    shortPeriod: range.days <= 7,
    stock: emptyStock,
    lowStockItems: [],
    outOfStockItems: [],
    customers: emptyCustomers,
    topCustomers: [],
    aging: [
      { label: "0–7 jours", count: 0, amount: 0 },
      { label: "8–30 jours", count: 0, amount: 0 },
      { label: "31–90 jours", count: 0, amount: 0 },
      { label: "+90 jours", count: 0, amount: 0 },
    ],
    expenses: emptyExpenses,
    expenseCategories: [],
    purchases: emptyPurchases,
    suppliers: [],
    payments: PAYMENT_METHODS.map((method) => ({
      method: method.value,
      label: method.label,
      salesCount: 0,
      amount: 0,
      percent: 0,
    })),
  };
}

export const getReportsBundle = cache(loadReportsBundle);

export async function getFinancialReport(period: ReportPeriod, from?: string, to?: string) {
  const bundle = await getReportsBundle(period, from, to);
  return {
    current: bundle.current,
    previous: bundle.previous,
    marginRate: bundle.marginRate,
    profitRate: bundle.profitRate,
    revenueTrend: bundle.revenueTrend,
    periodLabel: formatPeriodLabel(bundle.range),
  };
}

export async function getSalesReport(period: ReportPeriod, from?: string, to?: string) {
  const bundle = await getReportsBundle(period, from, to);
  return bundle.current;
}

export async function getTopProducts(period: ReportPeriod, from?: string, to?: string) {
  const bundle = await getReportsBundle(period, from, to);
  return { topSold: bundle.topSold, topMargin: bundle.topMargin };
}

export async function getTopCustomers(period: ReportPeriod, from?: string, to?: string) {
  const bundle = await getReportsBundle(period, from, to);
  return bundle.topCustomers;
}

export async function getExpenseReport(period: ReportPeriod, from?: string, to?: string) {
  const bundle = await getReportsBundle(period, from, to);
  return {
    expenses: bundle.expenses,
    categories: bundle.expenseCategories,
    series: bundle.series,
  };
}

export async function getPurchaseReport(period: ReportPeriod, from?: string, to?: string) {
  const bundle = await getReportsBundle(period, from, to);
  return { purchases: bundle.purchases, suppliers: bundle.suppliers };
}

export async function getStockReport(period: ReportPeriod, from?: string, to?: string) {
  const bundle = await getReportsBundle(period, from, to);
  return {
    stock: bundle.stock,
    lowStockItems: bundle.lowStockItems,
    outOfStockItems: bundle.outOfStockItems,
  };
}

export async function getPaymentMethodsReport(period: ReportPeriod, from?: string, to?: string) {
  const bundle = await getReportsBundle(period, from, to);
  return bundle.payments;
}
