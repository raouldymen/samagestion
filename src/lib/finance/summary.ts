import type { DashboardPeriod } from "@/types/dashboard";
import type { FinancialSummary, Trend } from "@/types/dashboard";

const DAKAR_TZ = "Africa/Dakar";

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function financialSummary(input: {
  revenue: number;
  collected: number;
  receivables: number;
  salesCount: number;
  cogs: number;
  expenses: number;
}): FinancialSummary {
  const revenue = roundMoney(input.revenue);
  const collected = roundMoney(input.collected);
  const receivables = roundMoney(input.receivables);
  const cogs = roundMoney(input.cogs);
  const expenses = roundMoney(input.expenses);
  const grossMargin = roundMoney(revenue - cogs);
  const netProfit = roundMoney(grossMargin - expenses);
  const avgBasket = input.salesCount === 0 ? 0 : roundMoney(revenue / input.salesCount);

  return {
    revenue,
    collected,
    receivables,
    salesCount: input.salesCount,
    cogs,
    grossMargin,
    expenses,
    netProfit,
    avgBasket,
  };
}

export function ratioPercent(part: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((part / total) * 1000) / 10;
}

export function percentChange(current: number, previous: number): Trend {
  if (previous === 0) {
    if (current === 0) {
      return { percent: null, label: "—", direction: "flat" };
    }

    return { percent: null, label: "Nouveau", direction: "new" };
  }

  const percent = ((current - previous) / previous) * 100;
  const rounded = Math.round(percent * 10) / 10;

  if (rounded === 0) {
    return { percent: 0, label: "0 %", direction: "flat" };
  }

  const sign = rounded > 0 ? "+" : "";
  const formatted = `${sign}${rounded.toFixed(1).replace(".", ",")} %`;

  return {
    percent: rounded,
    label: formatted,
    direction: rounded > 0 ? "up" : "down",
  };
}

function datePartsInDakar(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DAKAR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
  };
}

function utcMidnight(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function iso(date: Date) {
  return date.toISOString();
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function dashboardPeriodRange(period: DashboardPeriod, now = new Date()) {
  const { year, month, day } = datePartsInDakar(now);
  const today = utcMidnight(year, month, day);
  const tomorrow = utcMidnight(year, month, day + 1);

  if (period === "today") {
    return {
      from: iso(today),
      to: iso(tomorrow),
      prevFrom: iso(utcMidnight(year, month, day - 1)),
      prevTo: iso(today),
    };
  }

  if (period === "7d") {
    const from = utcMidnight(year, month, day - 6);
    return {
      from: iso(from),
      to: iso(tomorrow),
      prevFrom: iso(utcMidnight(year, month, day - 13)),
      prevTo: iso(from),
    };
  }

  if (period === "month") {
    const from = utcMidnight(year, month, 1);
    return {
      from: iso(from),
      to: iso(utcMidnight(year, month + 1, 1)),
      prevFrom: iso(utcMidnight(year, month - 1, 1)),
      prevTo: iso(from),
    };
  }

  const from = utcMidnight(year, month - 1, 1);
  return {
    from: iso(from),
    to: iso(utcMidnight(year, month, 1)),
    prevFrom: iso(utcMidnight(year, month - 2, 1)),
    prevTo: iso(from),
  };
}

export type ExpensePeriod = "today" | "week" | "month" | "previous_month" | "custom";

export function expenseDateRange(
  period: ExpensePeriod,
  from?: string,
  to?: string,
  now = new Date(),
) {
  const { year, month, day } = datePartsInDakar(now);
  const today = utcMidnight(year, month, day);

  if (period === "today") {
    return { from: ymd(today), to: ymd(today) };
  }

  if (period === "week") {
    const weekday = (today.getUTCDay() + 6) % 7;
    const start = utcMidnight(year, month, day - weekday);
    return { from: ymd(start), to: ymd(today) };
  }

  if (period === "month") {
    return { from: ymd(utcMidnight(year, month, 1)), to: ymd(today) };
  }

  if (period === "previous_month") {
    const start = utcMidnight(year, month - 1, 1);
    const end = utcMidnight(year, month, 0);
    return { from: ymd(start), to: ymd(end) };
  }

  return {
    from: from || undefined,
    to: to || undefined,
  };
}

export function weekdayLabel(isoDate: string) {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" })
    .format(date)
    .replace(".", "")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function parseDashboardPeriod(value?: string): DashboardPeriod {
  if (value === "7d" || value === "month" || value === "previous_month") {
    return value;
  }

  return "today";
}
