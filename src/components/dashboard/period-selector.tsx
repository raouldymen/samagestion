"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DateInput } from "@/components/ui/date-input";
import type { DashboardPeriod } from "@/types/dashboard";

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 jours" },
  { value: "month", label: "Ce mois" },
  { value: "previous_month", label: "Mois précédent" },
  { value: "custom", label: "Personnaliser" },
];

export function PeriodSelector({
  period,
  from,
  to,
}: {
  period: DashboardPeriod;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(next: DashboardPeriod) {
    const params = new URLSearchParams(searchParams.toString());

    if (next === "today") {
      params.delete("period");
    } else {
      params.set("period", next);
    }

    if (next !== "custom") {
      params.delete("from");
      params.delete("to");
    }

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  function updateDate(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div className={`mb-4 lg:mb-6 ${pending ? "opacity-70" : ""}`}>
      <div role="tablist" aria-label="Période" className="flex gap-2 overflow-x-auto pb-1">
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
          <DateInput
            id="dashboard-from"
            label="Du"
            defaultValue={from ?? ""}
            onChange={(event) => updateDate("from", event.target.value)}
          />
          <DateInput
            id="dashboard-to"
            label="Au"
            defaultValue={to ?? ""}
            onChange={(event) => updateDate("to", event.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
