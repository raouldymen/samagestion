"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Search } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [results, setResults] = useState<PurchaseProductOption[]>([]);
  const [resultsQuery, setResultsQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const cache = useRef(new Map<string, PurchaseProductOption[]>());

  useEffect(() => {
    const term = query.trim();

    if (!term && !menuOpen) {
      return;
    }

    const cached = cache.current.get(term);
    if (cached) {
      setResults(cached);
      setResultsQuery(term);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const products = await searchPurchaseProductsAction(term);

        if (active) {
          cache.current.set(term, products);
          setResults(products);
          setResultsQuery(term);
        }
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [menuOpen, query]);

  const hasCurrentResults = resultsQuery === query.trim();
  const showMenu = menuOpen || Boolean(query.trim());
  const availableResults = results.filter((product) => !cart.some((item) => item.productId === product.id));

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
        onChange={(event) => {
          setQuery(event.target.value);
          setMenuOpen(true);
        }}
        placeholder="Rechercher un produit"
        className="pr-12 pl-10"
      />
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-muted text-foreground shadow-sm hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Afficher la liste des produits"
        aria-expanded={showMenu}
      >
        <ChevronDown className={`size-5 transition-transform ${showMenu ? "rotate-180" : ""}`} strokeWidth={2.5} aria-hidden="true" />
      </button>
      {showMenu ? (
        <ul className="absolute top-full right-0 left-0 z-20 mt-2 max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {(!hasCurrentResults || pending) && <li className="px-4 py-3 text-sm text-muted-foreground">Recherche...</li>}
          {hasCurrentResults && !pending && availableResults.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              {results.length ? "Tous les produits trouvés sont déjà ajoutés." : "Aucun produit trouvé."}
            </li>
          ) : null}
          {hasCurrentResults ? availableResults.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(product);
                  setQuery("");
                  setMenuOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{product.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    Stock : {product.stockQuantity}
                    {product.sku ? ` · ${product.sku}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-semibold">
                  {formatFcfaAbsolute(product.purchasePrice)}
                </span>
              </button>
            </li>
          )) : null}
        </ul>
      ) : null}
    </div>
  );
}
