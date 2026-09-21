"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyInventoryAction } from "@/lib/products/actions";
import type { InventoryProduct } from "@/types/products";

export function InventoryForm({ products }: { products: InventoryProduct[] }) {
  const [query, setQuery] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [state, action, pending] = useActionState(applyInventoryAction, { error: null });
  const visible = useMemo(() => products.filter((product) => `${product.name} ${product.sku ?? ""}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))), [products, query]);
  const counted = products.flatMap((product) => counts[product.id] === undefined || counts[product.id] === "" ? [] : [{ productId: product.id, countedQuantity: Number(counts[product.id]) }]);
  const differences = counted.filter((item) => products.find((product) => product.id === item.productId)?.stockQuantity !== item.countedQuantity).length;
  return <form action={action} className="flex flex-col gap-4"><input type="hidden" name="items" value={JSON.stringify(counted)} /><Input id="inventory-search" label="Rechercher un produit" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom ou référence…" />
    <p className="text-sm text-muted-foreground">Saisissez uniquement les quantités réellement comptées. Les écarts seront affichés avant validation.</p>
    <div className="overflow-hidden rounded-xl border border-border">{visible.map((product) => { const value = counts[product.id] ?? ""; const countedValue = value === "" ? null : Number(value); const difference = countedValue === null ? null : countedValue - product.stockQuantity; return <div key={product.id} className="grid grid-cols-[1fr_5.5rem] gap-3 border-b border-border p-3 last:border-0 sm:grid-cols-[1fr_8rem_8rem]"><div><p className="font-medium">{product.name}</p><p className="text-sm text-muted-foreground">Théorique : {product.stockQuantity} {product.unit}{product.sku ? ` · ${product.sku}` : ""}</p>{difference !== null ? <p className={difference === 0 ? "text-sm text-success" : "text-sm text-amber-700"}>{difference === 0 ? "Aucun écart" : `Écart : ${difference > 0 ? "+" : ""}${difference}`}</p> : null}</div><Input id={`count-${product.id}`} label={`Compté ${product.name}`} hideLabel type="number" min="0" step="0.001" inputMode="decimal" value={value} onChange={(event) => setCounts({ ...counts, [product.id]: event.target.value })} placeholder="Compté" /></div>; })}</div>
    {visible.length === 0 ? <p className="text-sm text-muted-foreground">Aucun produit trouvé.</p> : null}
    {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}{state.success ? <p role="status" className="text-sm text-success">{state.message}</p> : null}
    <Button type="submit" size="lg" loading={pending} disabled={counted.length === 0}>{pending ? "Validation de l'inventaire…" : `Valider ${differences} écart${differences > 1 ? "s" : ""}`}</Button>
  </form>;
}
