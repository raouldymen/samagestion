import type { Metadata } from "next";
import { SaleForm } from "@/components/sales/sale-form";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { isCashierCheckoutRequired, listCustomers, listSaleProductOptions } from "@/lib/sales/queries";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Nouvelle vente",
};

type SearchParams = Promise<{ edit?: string }>;

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireBusinessSession();

  if (!can(session.role, "sales.create")) {
    redirect("/sales");
  }

  const params = await searchParams;
  const editing = params.edit === "1";
  const [customers, cashierCheckoutRequired, products] = await Promise.all([
    listCustomers(),
    isCashierCheckoutRequired(),
    listSaleProductOptions(),
  ]);
  const ownerCanChooseCheckout = session.role === "owner" && cashierCheckoutRequired && !editing;
  const requiresCashierCheckout = session.role !== "cashier" && !ownerCanChooseCheckout && (session.role === "seller" || cashierCheckoutRequired || editing);

  return (
    <>
      <PageHeader
        title={editing ? "Modifier la vente" : "Nouvelle vente"}
        description={
          editing
            ? "Corrigez les produits, puis renvoyez la vente à la caisse."
            : requiresCashierCheckout
              ? "Ajoutez les produits puis envoyez la vente à la caisse."
              : ownerCanChooseCheckout
                ? "Choisissez de valider la vente ou de l'envoyer à la caisse."
                : "Ajoutez des produits, le paiement, puis validez."
        }
      />
      <SaleForm
        customers={customers}
        products={products}
        requiresCashierCheckout={requiresCashierCheckout}
        ownerCanChooseCheckout={ownerCanChooseCheckout}
        restoreDraft={editing}
      />
    </>
  );
}
