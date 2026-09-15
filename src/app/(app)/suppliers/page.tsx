import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { SupplierCard } from "@/components/suppliers/supplier-card";
import { SupplierTable } from "@/components/suppliers/supplier-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { listSuppliersWithStats } from "@/lib/purchases/queries";

export const metadata: Metadata = {
  title: "Fournisseurs",
};

export default async function SuppliersPage() {
  const session = await requireBusinessSession();
  const canManage = can(session.role, "purchases.manage");
  const suppliers = await listSuppliersWithStats();

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Fournisseurs</h1>
        {canManage ? (
          <Button href="/suppliers/new" size="icon" aria-label="Ajouter un fournisseur">
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div className="hidden lg:block">
        <PageHeader
          title="Fournisseurs"
          description="Suivez vos partenaires d'approvisionnement."
          actions={
            <>
              <Button href="/suppliers/debts" variant="outline">
                Dettes
              </Button>
              {canManage ? (
                <Button href="/suppliers/new">
                  <Plus className="size-4" aria-hidden="true" />
                  Ajouter un fournisseur
                </Button>
              ) : null}
            </>
          }
        />
      </div>
      <div className="mb-4 lg:hidden">
        <Button href="/suppliers/debts" variant="outline" className="w-full">
          Voir les dettes fournisseurs
        </Button>
      </div>
      {suppliers.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="font-medium">Aucun fournisseur pour le moment.</p>
          {canManage ? (
            <Button href="/suppliers/new" className="mt-4">
              Ajouter un fournisseur
            </Button>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {suppliers.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))}
          </div>
          <SupplierTable suppliers={suppliers} />
        </>
      )}
      {canManage ? (
        <Link
          href="/suppliers/new"
          className="fixed right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
          style={{ bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)" }}
          aria-label="Ajouter un fournisseur"
        >
          <Plus className="size-6" aria-hidden="true" />
        </Link>
      ) : null}
    </>
  );
}
