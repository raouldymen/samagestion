"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListSearch } from "@/components/ui/list-search";
import { searchCustomerSuggestionsAction } from "@/lib/customers/actions";

export function CustomerSearch({
  q,
  includeArchived,
  debtOnly,
}: {
  q?: string;
  includeArchived?: boolean;
  debtOnly?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateArchived(checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());

    if (checked) {
      params.set("archived", "1");
    } else {
      params.delete("archived");
    }

    router.replace(`${pathname}?${params.toString()}`);
  }

  function updateDebtOnly(checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) params.set("debt", "open");
    else params.delete("debt");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <ListSearch
          id="customer-search"
          label="Rechercher un client"
          placeholder="Rechercher (nom, téléphone, email)..."
          initialQuery={q ?? ""}
          emptyLabel="Aucun client récent."
          searchSuggestions={searchCustomerSuggestionsAction}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={debtOnly} onChange={(event) => updateDebtOnly(event.target.checked)} className="size-4 rounded border-border" />
          Avec dette
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={includeArchived} onChange={(event) => updateArchived(event.target.checked)} className="size-4 rounded border-border" />
          Inclure archivés
        </label>
      </div>
    </div>
  );
}
