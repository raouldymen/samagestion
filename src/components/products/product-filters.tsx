"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListSearch } from "@/components/ui/list-search";
import { Select } from "@/components/ui/select";
import { searchProductSuggestionsAction } from "@/lib/products/actions";
import type { Category } from "@/types/products";

export function ProductFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || (value === "all" && key !== "status")) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <ProductSearch key={urlQuery} initialQuery={urlQuery} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select
          id="category"
          label="Catégorie"
          value={searchParams.get("category") ?? "all"}
          onChange={(event) => updateFilter("category", event.target.value)}
        >
          <option value="all">Toutes</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.productCount})
            </option>
          ))}
        </Select>
        <Select
          id="stock"
          label="Stock"
          value={searchParams.get("stock") ?? "all"}
          onChange={(event) => updateFilter("stock", event.target.value)}
        >
          <option value="all">Tous</option>
          <option value="in_stock">Disponible</option>
          <option value="low">Stock faible</option>
          <option value="out">Rupture</option>
        </Select>
        <Select
          id="status"
          label="Statut"
          value={searchParams.get("status") ?? "active"}
          onChange={(event) => updateFilter("status", event.target.value)}
        >
          <option value="active">Actif</option>
          <option value="inactive">Produits inactifs</option>
          <option value="all">Tous</option>
        </Select>
      </div>
    </div>
  );
}

function ProductSearch({ initialQuery }: { initialQuery: string }) {
  return <ListSearch id="product-search" label="Rechercher un produit" placeholder="Rechercher un produit" initialQuery={initialQuery} emptyLabel="Aucun produit récent." searchSuggestions={searchProductSuggestionsAction} />;
}
