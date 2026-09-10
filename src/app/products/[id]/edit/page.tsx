import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/products/product-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { getProduct, listCategories } from "@/lib/products/queries";

export const metadata: Metadata = {
  title: "Modifier un produit",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("products.edit");
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), listCategories()]);

  if (!product) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={`Modifier ${product.name}`}
        description="Le stock se modifie uniquement via un ajustement."
      />
      <Card className="max-w-2xl">
        <ProductForm mode="edit" product={product} categories={categories} />
      </Card>
    </>
  );
}
