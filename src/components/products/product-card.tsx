import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StockBadge } from "@/components/products/stock-badge";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { Product } from "@/types/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="relative p-4">
      <Link href={`/products/${product.id}`} className="flex min-w-0 gap-3 pr-8">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            className="size-14 shrink-0 rounded-lg object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">{product.name}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {product.categoryName ?? "Sans catégorie"}
          </p>
          <p className="mt-3 text-base font-semibold text-foreground">
            {formatFcfaAbsolute(product.sellingPrice)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Stock : {product.stockQuantity}
          </p>
          <div className="mt-3">
            <StockBadge status={product.stockStatus} isActive={product.isActive} />
          </div>
        </div>
      </Link>
      <Link
        href={`/products/${product.id}`}
        className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Actions pour ${product.name}`}
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </Link>
    </Card>
  );
}
