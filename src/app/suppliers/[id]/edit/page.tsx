import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getSupplier } from "@/lib/purchases/queries";

export const metadata: Metadata = {
  title: "Modifier le fournisseur",
};

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireBusinessSession();

  if (!can(session.role, "purchases.manage")) {
    redirect("/suppliers");
  }

  const { id } = await params;
  const supplier = await getSupplier(id);

  if (!supplier) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`Modifier ${supplier.name}`} />
      <Card className="max-w-2xl">
        <SupplierForm mode="edit" supplier={supplier} />
      </Card>
    </>
  );
}
