"use client";

import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchPurchaseProductsAction } from "@/lib/purchases/actions";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { PurchaseCartLine, PurchaseProductOption } from "@/types/purchases";

export function PurchaseProductSearch({
  onAdd,
  cart,
}: {
  onAdd: (product: PurchaseProductOption) => void;
  cart: PurchaseCartLine[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PurchaseProductOption[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const products = await searchPurchaseProductsAction(query);
        setResults(products);
      });
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id="purchase-product-search"
        label="Rechercher un produit"
        hideLabel
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher un produit"
        className="pl-10"
      />
      <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {pending && results.length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">Recherche...</li>
        ) : null}
        {results.map((product) => {
          const inCart = cart.find((item) => item.productId === product.id);

          return (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onAdd(product)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{product.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    Stock : {product.stockQuantity}
                    {product.sku ? ` · ${product.sku}` : ""}
                    {inCart ? ` · Dans l'achat : ${inCart.quantity}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-semibold">
                  {formatFcfaAbsolute(product.purchasePrice)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
