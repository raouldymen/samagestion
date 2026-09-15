import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CategoryManager } from "@/components/products/category-manager";
import { Pagination } from "@/components/products/pagination";
import { ProductCard } from "@/components/products/product-card";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductStats } from "@/components/products/product-stats";
import { ProductTable } from "@/components/products/product-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { listCategories, listProducts, getProductStats } from "@/lib/products/queries";
import { hasPermission } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import type { StockStatus } from "@/types/products";

export const metadata: Metadata = {
  title: "Produits",
};

type SearchParams = Promise<{
  q?: string;
  category?: string;
  stock?: string;
  status?: string;
  page?: string;
}>;

function asStockFilter(value?: string): StockStatus | "all" | undefined {
  if (value === "in_stock" || value === "low" || value === "out" || value === "all") {
    return value;
  }

  return undefined;
}

function asStatusFilter(value?: string): "active" | "inactive" | "all" | undefined {
  if (value === "active" || value === "inactive" || value === "all") {
    return value;
  }

  return undefined;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireBusinessSession();
  const params = await searchParams;
  const canManage = hasPermission(session.role, "products.create");
  const canViewStock = hasPermission(session.role, "stock.view");
  const page = Number(params.page ?? "1") || 1;
  const [stats, categories, result] = await Promise.all([
    canViewStock ? getProductStats() : Promise.resolve({ total: 0, active: 0, lowStock: 0, stockValue: 0 }),
    listCategories(),
    listProducts({
      q: params.q,
      categoryId: params.category,
      stock: asStockFilter(params.stock),
      status: asStatusFilter(params.status),
      page,
    }),
  ]);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Produits</h1>
        {canManage ? (
          <Button href="/products/new" size="icon" aria-label="Ajouter un produit">
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div className="hidden lg:block">
        <PageHeader
          title="Produits"
          description="Gérez votre catalogue et votre stock."
          actions={
            canManage ? (
              <>
                <CategoryManager categories={categories} />
                <Button href="/products/new">
                  <Plus className="size-4" aria-hidden="true" />
                  Ajouter un produit
                </Button>
              </>
            ) : undefined
          }
        />
      </div>
      <div className="mb-4 flex justify-end lg:hidden">
        {canManage ? <CategoryManager categories={categories} /> : null}
      </div>
      <div className="flex flex-col gap-4">
        <ProductFilters categories={categories} />
        {canViewStock ? <ProductStats stats={stats} /> : null}
        {result.items.length === 0 ? (
          <Card className="py-10 text-center">
            <p className="font-medium">Aucun produit pour le moment.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoutez votre premier article pour suivre le stock.
            </p>
            {canManage ? (
              <Button href="/products/new" className="mt-4">
                Ajouter un produit
              </Button>
            ) : null}
          </Card>
        ) : (
          <>
            <div className="grid gap-3 lg:hidden">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <ProductTable products={result.items} />
            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              query={params}
            />
          </>
        )}
      </div>
      <Link
        href="/products/new"
        className="fixed right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
        style={{ bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)" }}
        aria-label="Ajouter un produit"
      >
        <Plus className="size-6" aria-hidden="true" />
      </Link>
    </>
  );
}
