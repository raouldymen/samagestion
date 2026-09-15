"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DashboardPeriod } from "@/types/dashboard";

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 jours" },
  { value: "month", label: "Ce mois" },
  { value: "previous_month", label: "Mois précédent" },
];

export function PeriodSelector({ period }: { period: DashboardPeriod }) {
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

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Période"
      className={`mb-4 flex gap-2 overflow-x-auto pb-1 lg:mb-6 ${pending ? "opacity-70" : ""}`}
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
  );
}
