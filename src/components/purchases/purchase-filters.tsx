"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DateInput } from "@/components/ui/date-input";
import { ListSearch } from "@/components/ui/list-search";
import { Select } from "@/components/ui/select";
import { searchPurchaseSuggestionsAction } from "@/lib/purchases/actions";
import type { Supplier } from "@/types/purchases";

export function PurchaseFilters({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const period = searchParams.get("period") ?? "month";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || (value === "all" && key !== "status") || (key === "period" && value === "month")) {
      if (key === "period" && value === "month") {
        params.delete("period");
      } else if (!value || (value === "all" && key !== "status")) {
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
          <DateInput
            id="from"
            label="Du"
            defaultValue={searchParams.get("from") ?? ""}
            onChange={(event) => updateFilter("from", event.target.value)}
          />
          <DateInput
            id="to"
            label="Au"
            defaultValue={searchParams.get("to") ?? ""}
            onChange={(event) => updateFilter("to", event.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}

function PurchaseSearch({ initialQuery }: { initialQuery: string }) {
  return <ListSearch id="purchase-search" label="Rechercher un achat" placeholder="N° d'achat ou fournisseur..." initialQuery={initialQuery} emptyLabel="Aucun achat récent." searchSuggestions={searchPurchaseSuggestionsAction} />;
}
