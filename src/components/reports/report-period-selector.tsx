"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import type { ReportPeriod } from "@/types/reports";

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "month", label: "Ce mois" },
  { value: "previous_month", label: "Mois précédent" },
  { value: "year", label: "Cette année" },
  { value: "custom", label: "Personnalisé" },
];

export function ReportPeriodSelector({
  period,
  from,
  to,
}: {
  period: ReportPeriod;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(next: ReportPeriod) {
    const params = new URLSearchParams(searchParams.toString());

    if (next === "month") {
      params.delete("period");
    } else {
      params.set("period", next);
    }

    if (next !== "custom") {
      params.delete("from");
      params.delete("to");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function updateDate(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="print:hidden">
      <div
        role="tablist"
        aria-label="Période"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {PERIODS.map((item) => {
          const selected = item.value === period;

          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => select(item.value)}
              className={
                selected
                  ? "shrink-0 rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground"
                  : "shrink-0 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {period === "custom" ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Input
            id="report-from"
            label="Du"
            type="date"
            defaultValue={from ?? ""}
            onChange={(event) => updateDate("from", event.target.value)}
          />
          <Input
            id="report-to"
            label="Au"
            type="date"
            defaultValue={to ?? ""}
            onChange={(event) => updateDate("to", event.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
