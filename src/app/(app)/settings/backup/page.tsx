import type { Metadata } from "next";
import { Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireBusinessSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sauvegarde des données" };

export default async function BackupPage() {
  const session = await requireBusinessSession();
  if (session.role !== "owner") redirect("/settings");

  return (
    <>
      <PageHeader title="Sauvegarde des données" description="Téléchargez une copie complète des données essentielles de votre boutique." />
      <Card className="max-w-2xl space-y-5 p-5 sm:p-6">
        <div className="flex gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><ShieldCheck className="size-6" aria-hidden="true" /></span>
          <div>
            <h2 className="font-semibold">Copie Excel complète</h2>
            <p className="mt-1 text-sm text-muted-foreground">Le fichier contient les produits, clients, fournisseurs, ventes, achats, articles et dépenses.</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Conservez ce fichier dans un endroit sûr. Il permet de garder une trace de vos données si vous devez les consulter ou les transmettre.</p>
        <Button href="/settings/backup/download"><Download className="size-4" aria-hidden="true" />Télécharger la sauvegarde</Button>
      </Card>
    </>
  );
}
