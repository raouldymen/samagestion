import { parseReportPeriod } from "@/lib/reports/period";
import type { ReportPeriod } from "@/types/reports";

export function parseReportSearch(params: {
  period?: string;
  from?: string;
  to?: string;
}) {
  const period = parseReportPeriod(params.period);
  return {
    period,
    from: period === "custom" ? params.from : undefined,
    to: period === "custom" ? params.to : undefined,
  };
}

export function reportSearchQuery(period: ReportPeriod, from?: string, to?: string) {
  const params = new URLSearchParams();

  if (period !== "month") {
    params.set("period", period);
  }

  if (period === "custom") {
    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }
  }

  return params.toString();
}
