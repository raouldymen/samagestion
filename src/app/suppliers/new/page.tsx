import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Ajouter un fournisseur",
};

export default async function NewSupplierPage() {
  const session = await requireBusinessSession();

  if (!can(session.role, "purchases.manage")) {
    redirect("/suppliers");
  }

  return (
    <>
      <PageHeader title="Ajouter un fournisseur" description="Le fournisseur sera lié à votre commerce." />
      <Card className="max-w-2xl">
        <SupplierForm mode="create" />
      </Card>
    </>
  );
}
