import Link from "next/link";
import { StockBadge } from "@/components/products/stock-badge";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { Product } from "@/types/products";

export function ProductTable({ products }: { products: Product[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm lg:block">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-border bg-muted/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Produit</th>
            <th className="px-4 py-3 font-medium">SKU</th>
            <th className="px-4 py-3 font-medium">Catégorie</th>
            <th className="px-4 py-3 font-medium">Prix achat</th>
            <th className="px-4 py-3 font-medium">Prix vente</th>
            <th className="px-4 py-3 font-medium">Stock</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-muted/40">
              <td className="px-4 py-3 font-medium text-foreground">{product.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{product.sku ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {product.categoryName ?? "—"}
              </td>
              <td className="px-4 py-3">{formatFcfaAbsolute(product.purchasePrice)}</td>
              <td className="px-4 py-3">{formatFcfaAbsolute(product.sellingPrice)}</td>
              <td className="px-4 py-3">{product.stockQuantity}</td>
              <td className="px-4 py-3">
                <StockBadge status={product.stockStatus} isActive={product.isActive} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-3">
                  <Link
                    href={`/products/${product.id}`}
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Voir
                  </Link>
                  <Link
                    href={`/products/${product.id}/edit`}
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Modifier
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
