import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PurchaseNotFound() {
  return (
    <>
      <PageHeader title="Achat introuvable" />
      <Card className="max-w-lg">
        <p className="text-sm text-muted-foreground">
          Cet achat n&apos;existe pas ou n&apos;appartient pas à votre commerce.
        </p>
        <Button href="/purchases" className="mt-4">
          Retour aux achats
        </Button>
      </Card>
    </>
  );
}
