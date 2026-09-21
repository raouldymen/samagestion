import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CashierSaleQueue } from "@/components/sales/cashier-sale-queue";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getCashierCheckoutSummary, getCashierClosureSummary, isCashierCheckoutRequired, listCashierSaleQueue, listCashierTodaySales, listCustomers, listOwnerSaleCollections } from "@/lib/sales/queries";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Caisse" };

export default async function CashierCheckoutPage() {
  const session = await requireBusinessSession();
  const cashierCheckoutRequired = await isCashierCheckoutRequired();
  if (!can(session.role, "sales.create") || session.role === "seller" || (cashierCheckoutRequired && session.role !== "cashier")) {
    redirect("/sales");
  }

  const [sales, summary, customers, ownerCollections, todaySales, closure] = await Promise.all([listCashierSaleQueue(), getCashierCheckoutSummary(), listCustomers(), listOwnerSaleCollections(), listCashierTodaySales(), getCashierClosureSummary()]);
  return (
    <>
      <PageHeader title="Caisse" description="Encaissez et validez les ventes préparées par les vendeurs." actions={<Button href="/sales/checkout/closures" variant="outline">Historique</Button>} />
      <CashierSaleQueue businessId={session.businessId} sales={sales} summary={summary} customers={customers} ownerCollections={ownerCollections} todaySales={todaySales} closure={session.role === "cashier" ? closure : null} />
    </>
  );
}
