import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { updateCustomerAndRedirect } from "@/lib/customers/actions";
import { getCustomerDetail } from "@/lib/customers/queries";

export const metadata: Metadata = {
  title: "Modifier le client",
};

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("customers.edit");
  const { id } = await params;
  const detail = await getCustomerDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Modifier le client"
        description={detail.customer.name}
      />
      <CustomerForm
        customer={detail.customer}
        action={updateCustomerAndRedirect}
        submitLabel="Enregistrer"
      />
    </>
  );
}
