import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeactivateProductButton } from "@/components/products/deactivate-product-button";
import { StockAdjustmentDialog } from "@/components/products/stock-adjustment-dialog";
import { StockBadge } from "@/components/products/stock-badge";
import { StockMovementList } from "@/components/products/stock-movement-list";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { unitLabel } from "@/lib/products/constants";
import { getProduct, listStockMovements } from "@/lib/products/queries";
import { formatFcfaAbsolute } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Détail produit",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const movements = await listStockMovements(product.id);
  const purchaseValue = product.stockQuantity * product.purchasePrice;
  const sellingValue = product.stockQuantity * product.sellingPrice;
  const margin = sellingValue - purchaseValue;

  return (
    <>
      <PageHeader
        title={product.name}
        description={product.categoryName ?? "Sans catégorie"}
        actions={
          <div className="flex flex-wrap gap-2">
            <StockAdjustmentDialog product={product} />
            <Button href={`/products/${product.id}/edit`} variant="outline">
              Modifier
            </Button>
            <DeactivateProductButton product={product} />
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="size-20 rounded-xl object-cover"
          />
        ) : null}
        <StockBadge status={product.stockStatus} isActive={product.isActive} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <Info label="Nom" value={product.name} />
            <Info label="Catégorie" value={product.categoryName ?? "—"} />
            <Info label="SKU" value={product.sku ?? "—"} />
            <Info label="Unité" value={unitLabel(product.unit)} />
            <Info label="Prix d'achat" value={formatFcfaAbsolute(product.purchasePrice)} />
            <Info label="Prix de vente" value={formatFcfaAbsolute(product.sellingPrice)} />
            <Info label="Description" value={product.description ?? "—"} />
          </dl>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock</CardTitle>
            </CardHeader>
            <p className="text-sm">
              Stock actuel : <span className="font-semibold">{product.stockQuantity}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Stock minimum : {product.minimumStock}
            </p>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Valeur</CardTitle>
            </CardHeader>
            <dl className="grid gap-2 text-sm">
              <Info label="Valeur d'achat" value={formatFcfaAbsolute(purchaseValue)} />
              <Info
                label="Valeur potentielle de vente"
                value={formatFcfaAbsolute(sellingValue)}
              />
              <Info label="Marge potentielle" value={formatFcfaAbsolute(margin)} />
            </dl>
          </Card>
        </div>
      </div>
      <div className="mt-4">
        <StockMovementList movements={movements} />
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}
