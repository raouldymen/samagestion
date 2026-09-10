import type { Metadata } from "next";
import { ProductForm } from "@/components/products/product-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { listCategories } from "@/lib/products/queries";

export const metadata: Metadata = {
  title: "Ajouter un produit",
};

export default async function NewProductPage() {
  await requirePermission("products.create");
  const categories = await listCategories();

  return (
    <>
      <PageHeader
        title="Ajouter un produit"
        description="Renseignez les informations et le stock initial."
      />
      <Card className="max-w-2xl">
        <ProductForm mode="create" categories={categories} />
      </Card>
    </>
  );
}
