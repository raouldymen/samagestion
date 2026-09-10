"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { NotificationFilter } from "@/types/notifications";

const FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "unread", label: "Non lues" },
];

export function NotificationFilters({ filter }: { filter: NotificationFilter }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(next: NotificationFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") {
      params.delete("filter");
    } else {
      params.set("filter", next);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div role="tablist" aria-label="Filtrer les notifications" className="flex gap-2">
      {FILTERS.map((item) => {
        const selected = item.value === filter;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => select(item.value)}
            className={
              selected
                ? "rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground"
                : "rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted"
            }
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
