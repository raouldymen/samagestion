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

export default async function NewSalePage() {
  const session = await requireBusinessSession();

  if (!can(session.role, "sales.create")) {
    redirect("/sales");
  }

  const [customers, cashierCheckoutRequired, products] = await Promise.all([
    listCustomers(),
    isCashierCheckoutRequired(),
    listSaleProductOptions(),
  ]);
  const ownerCanChooseCheckout = session.role === "owner" && cashierCheckoutRequired;
  const requiresCashierCheckout = session.role !== "cashier" && !ownerCanChooseCheckout && (session.role === "seller" || cashierCheckoutRequired);

  return (
    <>
      <PageHeader
        title="Nouvelle vente"
        description={requiresCashierCheckout ? "Ajoutez les produits puis envoyez la vente à la caisse." : ownerCanChooseCheckout ? "Choisissez de valider la vente ou de l'envoyer à la caisse." : "Ajoutez des produits, le paiement, puis validez."}
      />
      <SaleForm
        customers={customers}
        products={products}
        requiresCashierCheckout={requiresCashierCheckout}
        ownerCanChooseCheckout={ownerCanChooseCheckout}
      />
    </>
  );
}
