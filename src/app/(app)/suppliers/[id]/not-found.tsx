import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SupplierNotFound() {
  return (
    <>
      <PageHeader title="Fournisseur introuvable" />
      <Card className="max-w-lg">
        <p className="text-sm text-muted-foreground">
          Ce fournisseur n&apos;existe pas ou n&apos;appartient pas à votre commerce.
        </p>
        <Button href="/suppliers" className="mt-4">
          Retour aux fournisseurs
        </Button>
      </Card>
    </>
  );
}
