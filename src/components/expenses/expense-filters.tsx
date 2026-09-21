"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DateInput } from "@/components/ui/date-input";
import { ListSearch } from "@/components/ui/list-search";
import { Select } from "@/components/ui/select";
import { searchExpenseSuggestionsAction } from "@/lib/expenses/actions";
import { PAYMENT_METHODS } from "@/lib/sales/constants";
import type { ExpenseCategory } from "@/types/expenses";

export function ExpenseFilters({ categories }: { categories: ExpenseCategory[] }) {
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
      <ExpenseSearch key={urlQuery} initialQuery={urlQuery} />
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
          <option value="previous_month">Mois précédent</option>
          <option value="custom">Personnalisé</option>
        </Select>
        <Select
          id="category"
          label="Catégorie"
          value={searchParams.get("category") ?? "all"}
          onChange={(event) => updateFilter("category", event.target.value)}
        >
          <option value="all">Toutes</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
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
        <Select
          id="status"
          label="Statut"
          value={searchParams.get("status") ?? "active"}
          onChange={(event) => updateFilter("status", event.target.value)}
        >
          <option value="active">Actives</option>
          <option value="cancelled">Annulées</option>
          <option value="all">Toutes</option>
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

function ExpenseSearch({ initialQuery }: { initialQuery: string }) {
  return <ListSearch id="expense-search" label="Rechercher une dépense" placeholder="Description ou catégorie..." initialQuery={initialQuery} emptyLabel="Aucune dépense récente." searchSuggestions={searchExpenseSuggestionsAction} />;
}
