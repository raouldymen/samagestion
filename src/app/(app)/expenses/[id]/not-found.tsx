import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ExpenseNotFound() {
  return (
    <>
      <PageHeader title="Dépense introuvable" />
      <Card className="max-w-lg">
        <p className="text-sm text-muted-foreground">
          Cette dépense n&apos;existe pas ou n&apos;appartient pas à votre commerce.
        </p>
        <Button href="/expenses" className="mt-4">
          Retour aux dépenses
        </Button>
      </Card>
    </>
  );
}
