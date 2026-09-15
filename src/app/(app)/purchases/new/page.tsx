import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getPurchaseProduct, listSuppliers } from "@/lib/purchases/queries";

export const metadata: Metadata = {
  title: "Nouvel achat",
};

type SearchParams = Promise<{ product?: string }>;

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireBusinessSession();

  if (!can(session.role, "purchases.manage")) {
    redirect("/purchases");
  }

  const params = await searchParams;
  const [suppliers, initialProduct] = await Promise.all([
    listSuppliers(true),
    params.product ? getPurchaseProduct(params.product) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        title="Nouvel achat"
        description="Sélectionnez les produits, le fournisseur, puis validez l'entrée en stock."
      />
      <PurchaseForm suppliers={suppliers} initialProduct={initialProduct} />
    </>
  );
}
