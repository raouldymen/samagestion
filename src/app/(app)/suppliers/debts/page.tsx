import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SupplierCard } from "@/components/suppliers/supplier-card";
import { SupplierTable } from "@/components/suppliers/supplier-table";
import { getSupplierDebts } from "@/lib/purchases/queries";
import { formatFcfaAbsolute } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Dettes fournisseurs",
};

export default async function SupplierDebtsPage() {
  const debts = await getSupplierDebts();

  return (
    <>
      <PageHeader
        title="Dettes fournisseurs"
        description="Fournisseurs à payer, avec les retards affichés en priorité."
      />
      <section className="mb-4 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-sm text-muted-foreground">Fournisseurs débiteurs</p>
          <p className="mt-1 text-2xl font-semibold">{debts.suppliersCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Total à payer</p>
          <p className="mt-1 text-2xl font-semibold">{formatFcfaAbsolute(debts.totalDue)}</p>
        </Card>
      </section>
      {debts.items.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="font-medium">Aucune dette fournisseur.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {debts.items.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))}
          </div>
          <SupplierTable suppliers={debts.items} />
        </>
      )}
    </>
  );
}
