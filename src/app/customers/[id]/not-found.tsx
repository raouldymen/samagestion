import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CustomerNotFound() {
  return (
    <Card className="py-10 text-center">
      <h1 className="text-xl font-semibold">Client introuvable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ce client n&apos;existe pas ou n&apos;appartient pas à votre commerce.
      </p>
      <Button href="/customers" className="mt-4">
        Retour
      </Button>
    </Card>
  );
}
