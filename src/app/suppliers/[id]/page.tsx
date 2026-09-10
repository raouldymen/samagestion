import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupplierPurchaseHistory } from "@/components/suppliers/supplier-purchase-history";
import { SupplierStats } from "@/components/suppliers/supplier-stats";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getSupplier, listSupplierPurchases } from "@/lib/purchases/queries";

export const metadata: Metadata = {
  title: "Fiche fournisseur",
};

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireBusinessSession();
  const { id } = await params;
  const [supplier, purchases] = await Promise.all([getSupplier(id), listSupplierPurchases(id)]);

  if (!supplier) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={supplier.name}
        description={supplier.isActive ? undefined : "Fournisseur inactif"}
        actions={
          can(session.role, "purchases.manage") ? (
            <Button href={`/suppliers/${supplier.id}/edit`} variant="outline">
              Modifier
            </Button>
          ) : null
        }
      />
      <div className="flex flex-col gap-4">
        <Card>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Téléphone</dt>
              <dd className="font-medium">{supplier.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{supplier.email ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Adresse</dt>
              <dd className="font-medium">{supplier.address ?? "—"}</dd>
            </div>
          </dl>
        </Card>
        <SupplierStats supplier={supplier} />
        <SupplierPurchaseHistory purchases={purchases} />
      </div>
    </>
  );
}
