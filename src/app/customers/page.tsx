import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CustomerCard } from "@/components/customers/customer-card";
import { CustomerSearch } from "@/components/customers/customer-search";
import { CustomerTable } from "@/components/customers/customer-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { listCustomersWithStats } from "@/lib/customers/queries";

export const metadata: Metadata = {
  title: "Clients",
};

type SearchParams = Promise<{ q?: string; archived?: string }>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireBusinessSession();
  const params = await searchParams;
  const includeArchived = params.archived === "1";
  const canCreate = can(session.role, "customers.create");
  const canEdit = can(session.role, "customers.edit");
  const { items, error } = await listCustomersWithStats({
    q: params.q,
    includeArchived,
  });

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        {canCreate ? (
          <Button href="/customers/new" size="icon" aria-label="Ajouter un client">
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div className="hidden lg:block">
        <PageHeader
          title="Clients"
          description="Suivez vos clients, leurs achats et leurs dettes."
          actions={
            canCreate ? (
              <Button href="/customers/new">
                <Plus className="size-4" aria-hidden="true" />
                Ajouter un client
              </Button>
            ) : null
          }
        />
      </div>

      <CustomerSearch q={params.q} includeArchived={includeArchived} />

      {error ? (
        <Card className="py-10 text-center">
          <p className="font-medium text-danger">{error}</p>
          <Button href="/customers" className="mt-4" variant="outline">
            Réessayer
          </Button>
        </Card>
      ) : items.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="font-medium">Aucun client</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez votre premier client pour commencer à suivre vos ventes et vos dettes.
          </p>
          {canCreate ? (
            <Button href="/customers/new" className="mt-4">
              Ajouter un client
            </Button>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {items.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} canEdit={canEdit} />
            ))}
          </div>
          <CustomerTable customers={items} canEdit={canEdit} />
        </>
      )}

      {canCreate ? (
        <Link
          href="/customers/new"
          className="fixed right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
          style={{ bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)" }}
          aria-label="Ajouter un client"
        >
          <Plus className="size-6" aria-hidden="true" />
        </Link>
      ) : null}
    </>
  );
}
