"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/lib/sales/constants";

export function SaleFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const period = searchParams.get("period") ?? "month";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "all" || (key === "period" && value === "month")) {
      if (key === "period" && value === "month") {
        params.delete("period");
      } else if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    } else {
      params.set(key, value);
    }

    if (key === "period" && value !== "custom") {
      params.delete("from");
      params.delete("to");
    }

    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <SaleSearch key={urlQuery} initialQuery={urlQuery} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Select
          id="period"
          label="Période"
          value={period}
          onChange={(event) => updateFilter("period", event.target.value)}
        >
          <option value="today">Aujourd&apos;hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="custom">Personnalisé</option>
        </Select>
        <Select
          id="paymentStatus"
          label="Statut paiement"
          value={searchParams.get("paymentStatus") ?? "all"}
          onChange={(event) => updateFilter("paymentStatus", event.target.value)}
        >
          <option value="all">Toutes</option>
          <option value="paid">Payées</option>
          <option value="partial">Partiellement payées</option>
          <option value="unpaid">Impayées</option>
        </Select>
        <Select
          id="status"
          label="Statut vente"
          value={searchParams.get("status") ?? "completed"}
          onChange={(event) => updateFilter("status", event.target.value)}
        >
          <option value="all">Toutes</option>
          <option value="completed">Terminées</option>
          <option value="cancelled">Annulées</option>
        </Select>
        <Select
          id="paymentMethod"
          label="Mode de paiement"
          value={searchParams.get("paymentMethod") ?? "all"}
          onChange={(event) => updateFilter("paymentMethod", event.target.value)}
        >
          <option value="all">Tous</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </Select>
      </div>
      {period === "custom" ? (
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="from"
            label="Du"
            type="date"
            defaultValue={searchParams.get("from") ?? ""}
            onChange={(event) => updateFilter("from", event.target.value)}
          />
          <Input
            id="to"
            label="Au"
            type="date"
            defaultValue={searchParams.get("to") ?? ""}
            onChange={(event) => updateFilter("to", event.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}

function SaleSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const current = searchParams.get("q") ?? "";

      if (query === current || query.trim() === current) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());

      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }

      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, pathname, router, searchParams, startTransition]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id="sale-search"
        label="Rechercher une vente"
        hideLabel
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher..."
        className="pl-10"
      />
    </div>
  );
}
