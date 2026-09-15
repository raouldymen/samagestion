import type { Metadata } from "next";
import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { createCustomerAndRedirect } from "@/lib/customers/actions";

export const metadata: Metadata = {
  title: "Nouveau client",
};

export default async function NewCustomerPage() {
  await requirePermission("customers.create");

  return (
    <>
      <PageHeader
        title="Ajouter un client"
        description="Le nom est obligatoire. Les autres champs sont optionnels."
      />
      <CustomerForm action={createCustomerAndRedirect} submitLabel="Enregistrer" />
    </>
  );
}
