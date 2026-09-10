import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export function TopProducts({ items }: { items: { name: string; quantity: number }[] }) {
  return (
    <section aria-labelledby="top-products-title">
      <Card>
        <CardHeader>
          <CardTitle id="top-products-title">Produits les plus vendus</CardTitle>
        </CardHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vente sur cette période.</p>
        ) : (
          <ol className="divide-y divide-border">
            {items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="truncate text-sm font-medium">{item.name}</p>
                </div>
                <p className="shrink-0 text-sm text-muted-foreground">
                  {item.quantity} unité{item.quantity > 1 ? "s" : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </section>
  );
}
