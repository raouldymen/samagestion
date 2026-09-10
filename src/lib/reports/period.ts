import { dashboardPeriodRange } from "@/lib/finance/summary";
import type { ChartGranularity, ReportPeriod, ReportRange } from "@/types/reports";

const DAKAR_TZ = "Africa/Dakar";

export function chartGranularity(days: number): ChartGranularity {
  if (days <= 31) {
    return "day";
  }

  if (days <= 180) {
    return "week";
  }

  return "month";
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

function inclusiveEnd(exclusiveTo: Date) {
  return new Date(exclusiveTo.getTime() - 24 * 60 * 60 * 1000);
}

function daysBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
}

function toRange(from: Date, to: Date, prevFrom: Date, prevTo: Date): ReportRange {
  const days = daysBetween(from, to);
  return {
    from: iso(from),
    to: iso(to),
    prevFrom: iso(prevFrom),
    prevTo: iso(prevTo),
    fromDate: ymd(from),
    toDateInclusive: ymd(inclusiveEnd(to)),
    days,
    granularity: chartGranularity(days),
  };
}

export function reportPeriodRange(
  period: ReportPeriod,
  from?: string,
  to?: string,
  now = new Date(),
): ReportRange {
  const { year, month, day } = datePartsInDakar(now);
  const today = utcMidnight(year, month, day);
  const tomorrow = utcMidnight(year, month, day + 1);

  if (period === "today" || period === "7d" || period === "month" || period === "previous_month") {
    const range = dashboardPeriodRange(period === "7d" ? "7d" : period, now);
    return toRange(
      new Date(range.from),
      new Date(range.to),
      new Date(range.prevFrom),
      new Date(range.prevTo),
    );
  }

  if (period === "30d") {
    const fromDate = utcMidnight(year, month, day - 29);
    const prevFrom = utcMidnight(year, month, day - 59);
    return toRange(fromDate, tomorrow, prevFrom, fromDate);
  }

  if (period === "year") {
    const fromDate = utcMidnight(year, 1, 1);
    const toDate = utcMidnight(year + 1, 1, 1);
    const prevFrom = utcMidnight(year - 1, 1, 1);
    return toRange(fromDate, toDate, prevFrom, fromDate);
  }

  const customFrom = from
    ? utcMidnight(Number(from.slice(0, 4)), Number(from.slice(5, 7)), Number(from.slice(8, 10)))
    : utcMidnight(year, month, 1);
  const customInclusive = to
    ? utcMidnight(Number(to.slice(0, 4)), Number(to.slice(5, 7)), Number(to.slice(8, 10)))
    : today;
  const customTo = new Date(customInclusive.getTime() + 24 * 60 * 60 * 1000);
  const duration = customTo.getTime() - customFrom.getTime();
  const prevFrom = new Date(customFrom.getTime() - duration);

  return toRange(customFrom, customTo, prevFrom, customFrom);
}

export function parseReportPeriod(value?: string): ReportPeriod {
  if (
    value === "today" ||
    value === "7d" ||
    value === "30d" ||
    value === "previous_month" ||
    value === "year" ||
    value === "custom"
  ) {
    return value;
  }

  return "month";
}

export function seriesLabel(bucket: string, granularity: ChartGranularity) {
  const date = new Date(`${bucket.slice(0, 10)}T12:00:00Z`);

  if (granularity === "month") {
    return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" })
      .format(date)
      .replace(".", "");
  }

  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(date)
    .replace(".", "");
}

export function formatPeriodLabel(range: ReportRange) {
  const from = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${range.fromDate}T12:00:00Z`));
  const to = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${range.toDateInclusive}T12:00:00Z`));

  return `${from} → ${to}`;
}
