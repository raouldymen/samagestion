import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { DebtPaymentForm } from "@/components/customers/debt-payment-form";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getCustomerDetail } from "@/lib/customers/queries";
import { formatFcfaAbsolute, formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Client",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireBusinessSession();
  const { id } = await params;
  const detail = await getCustomerDetail(id);

  if (!detail) {
    notFound();
  }

  const { customer, stats, sales } = detail;
  const canEdit = can(session.role, "customers.edit");
  const canSell = can(session.role, "sales.create");
  const canCollectDebt = canSell && session.role !== "seller";

  return (
    <>
      <PageHeader
        title={customer.name}
        description={customer.isActive ? "Fiche client" : "Client archivé"}
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button href={`/customers/${customer.id}/edit`} variant="outline">
                Modifier
              </Button>
            ) : null}
            {canSell ? (
              <Button href={`/sales/new?customer=${customer.id}`}>Nouvelle vente</Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Informations client</CardTitle>
            <Badge variant={customer.isActive ? "success" : "neutral"}>
              {customer.isActive ? "Actif" : "Archivé"}
            </Badge>
          </CardHeader>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Nom</dt>
              <dd className="font-medium">{customer.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Téléphone</dt>
              <dd className="font-medium">{customer.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{customer.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Adresse</dt>
              <dd className="font-medium">{customer.address ?? "—"}</dd>
            </div>
            {customer.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="font-medium">{customer.notes}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-muted-foreground">Total achats</p>
            <p className="mt-1 text-xl font-semibold">
              {formatFcfaAbsolute(stats.totalPurchased)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.salesCount} vente{stats.salesCount > 1 ? "s" : ""}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted-foreground">Total payé</p>
            <p className="mt-1 text-xl font-semibold">{formatFcfaAbsolute(stats.totalPaid)}</p>
          </Card>
          <Card>
            <p className="text-sm text-muted-foreground">Dette restante</p>
            <p
              className={`mt-1 text-xl font-semibold ${stats.amountDue > 0 ? "text-danger" : ""}`}
            >
              {formatFcfaAbsolute(stats.amountDue)}
            </p>
          </Card>
        </div>

        <section>
          <h2 className="mb-3 text-base font-semibold">Historique des achats</h2>
          {sales.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Aucune vente pour ce client.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {sales.map((sale) => (
                <li key={sale.id}>
                  <div className="px-4 py-3 hover:bg-muted">
                  <Link href={`/sales/${sale.id}`} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{sale.saleNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(sale.createdAt)}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{formatFcfaAbsolute(sale.total)}</p>
                      {sale.amountDue > 0 ? (
                        <p className="text-danger">Dû {formatFcfaAbsolute(sale.amountDue)}</p>
                      ) : (
                        <p className="text-muted-foreground">
                          Payé {formatFcfaAbsolute(sale.amountPaid)}
                        </p>
                      )}
                    </div>
                  </Link>
                  {sale.amountDue > 0 && canCollectDebt ? <DebtPaymentForm saleId={sale.id} customerId={customer.id} maximum={sale.amountDue} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">Paiements</h2>
          {sales.filter((s) => s.amountPaid > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {sales
                .filter((s) => s.amountPaid > 0)
                .map((sale) => (
                  <li
                    key={`pay-${sale.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{sale.saleNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(sale.createdAt)}
                      </p>
                    </div>
                    <p className="font-medium text-success">
                      {formatFcfaAbsolute(sale.amountPaid)}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
