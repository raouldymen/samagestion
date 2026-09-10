"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Supplier } from "@/types/purchases";

export function PurchaseFilters({ suppliers }: { suppliers: Supplier[] }) {
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
      <PurchaseSearch key={urlQuery} initialQuery={urlQuery} />
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
          id="supplier"
          label="Fournisseur"
          value={searchParams.get("supplier") ?? "all"}
          onChange={(event) => updateFilter("supplier", event.target.value)}
        >
          <option value="all">Tous</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </Select>
        <Select
          id="paymentStatus"
          label="Paiement"
          value={searchParams.get("paymentStatus") ?? "all"}
          onChange={(event) => updateFilter("paymentStatus", event.target.value)}
        >
          <option value="all">Tous</option>
          <option value="paid">Payés</option>
          <option value="partial">Partiels</option>
          <option value="unpaid">Impayés</option>
        </Select>
        <Select
          id="status"
          label="Statut"
          value={searchParams.get("status") ?? "completed"}
          onChange={(event) => updateFilter("status", event.target.value)}
        >
          <option value="completed">Terminés</option>
          <option value="cancelled">Annulés</option>
          <option value="all">Tous</option>
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

function PurchaseSearch({ initialQuery }: { initialQuery: string }) {
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
        id="purchase-search"
        label="Rechercher un achat"
        hideLabel
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="N° d'achat ou fournisseur..."
        className="pl-10"
      />
    </div>
  );
}
