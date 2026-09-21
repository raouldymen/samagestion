import { hasPermission } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import {
  dashboardPeriodRange,
  financialSummary,
  percentChange,
  weekdayLabel,
} from "@/lib/finance/summary";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type {
  DashboardActivity,
  DashboardPeriod,
  DashboardStats,
  FinancialSummary,
} from "@/types/dashboard";

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

function parseSummary(value: Json | undefined): FinancialSummary {
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

function parseActivity(value: Json): DashboardActivity | null {
  const row = asRecord(value);
  const type = row.type;

  if (type !== "sale" && type !== "expense" && type !== "payment" && type !== "stock" && type !== "purchase") {
    return null;
  }

  return {
    id: String(row.id ?? crypto.randomUUID()),
    type,
    title: String(row.title ?? "Opération"),
    amount: asNumber(row.amount),
    occurredAt: String(row.occurred_at ?? new Date().toISOString()),
  };
}

export async function getDashboardStats(
  period: DashboardPeriod,
  from?: string,
  to?: string,
): Promise<DashboardStats> {
  const session = await requireBusinessSession();

  if (!hasPermission(session.role, "reports.financial")) {
    const empty = financialSummary({
      revenue: 0,
      collected: 0,
      receivables: 0,
      salesCount: 0,
      cogs: 0,
      expenses: 0,
    });
    const emptyTrend = percentChange(0, 0);

    return {
      current: empty,
      previous: empty,
      trends: {
        revenue: emptyTrend,
        grossMargin: emptyTrend,
        expenses: emptyTrend,
        netProfit: emptyTrend,
        receivables: emptyTrend,
      },
      topProducts: [],
      revenueDays: [],
      activity: [],
      receivablesOpen: 0,
      purchasesTotal: 0,
      payablesOpen: 0,
    };
  }
  const range = dashboardPeriodRange(period, new Date(), from, to);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard_bundle", {
    p_from: range.from,
    p_to: range.to,
    p_prev_from: range.prevFrom,
    p_prev_to: range.prevTo,
  });

  if (error || data == null) {
    const empty = financialSummary({
      revenue: 0,
      collected: 0,
      receivables: 0,
      salesCount: 0,
      cogs: 0,
      expenses: 0,
    });
    const emptyTrend = percentChange(0, 0);

    return {
      current: empty,
      previous: empty,
      trends: {
        revenue: emptyTrend,
        grossMargin: emptyTrend,
        expenses: emptyTrend,
        netProfit: emptyTrend,
        receivables: emptyTrend,
      },
      topProducts: [],
      revenueDays: [],
      activity: [],
      receivablesOpen: 0,
      purchasesTotal: 0,
      payablesOpen: 0,
    };
  }

  const bundle = asRecord(data as Json);
  const current = parseSummary(bundle.current);
  const previous = parseSummary(bundle.previous);
  const receivablesOpen = asNumber(bundle.receivables_open);
  const purchasesTotal = asNumber(bundle.purchases_total);
  const payablesOpen = asNumber(bundle.payables_open);

  return {
    current,
    previous,
    trends: {
      revenue: percentChange(current.revenue, previous.revenue),
      grossMargin: percentChange(current.grossMargin, previous.grossMargin),
      expenses: percentChange(current.expenses, previous.expenses),
      netProfit: percentChange(current.netProfit, previous.netProfit),
      receivables: percentChange(current.receivables, previous.receivables),
    },
    topProducts: asList(bundle.top_products).map((item) => {
      const row = asRecord(item);
      return {
        name: String(row.name ?? "Produit"),
        quantity: asNumber(row.quantity),
      };
    }),
    revenueDays: asList(bundle.revenue_days).map((item) => {
      const row = asRecord(item);
      const day = String(row.day ?? "").slice(0, 10);
      return {
        day,
        revenue: asNumber(row.revenue),
        label: weekdayLabel(day),
      };
    }),
    activity: asList(bundle.activity)
      .map(parseActivity)
      .filter((item): item is DashboardActivity => item !== null),
    receivablesOpen,
    purchasesTotal,
    payablesOpen,
  };
}

export async function getMySalesToday() {
  await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_sales_today");
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    return { salesCount: 0, total: 0 };
  }

  return {
    salesCount: asNumber(row.sales_count),
    total: asNumber(row.total),
  };
}

export async function getStockOverview() {
  await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_product_stats");
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    return { total: 0, active: 0, lowStock: 0, stockValue: 0 };
  }

  return {
    total: asNumber(row.total),
    active: asNumber(row.active),
    lowStock: asNumber(row.low_stock),
    stockValue: asNumber(row.stock_value),
  };
}
