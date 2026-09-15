import type { Metadata } from "next";
import { SaleForm } from "@/components/sales/sale-form";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { listCustomers } from "@/lib/sales/queries";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Nouvelle vente",
};

export default async function NewSalePage() {
  const session = await requireBusinessSession();

  if (!can(session.role, "sales.create")) {
    redirect("/sales");
  }

  const customers = await listCustomers();

  return (
    <>
      <PageHeader title="Nouvelle vente" description="Ajoutez des produits, le paiement, puis validez." />
      <SaleForm customers={customers} />
    </>
  );
}
