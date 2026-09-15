import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SaleNotFound() {
  return (
    <Card className="py-10 text-center">
      <h1 className="text-xl font-semibold">Vente introuvable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cette vente n&apos;existe pas ou n&apos;appartient pas à votre commerce.
      </p>
      <Button href="/sales" className="mt-4">
        Retour aux ventes
      </Button>
    </Card>
  );
}
