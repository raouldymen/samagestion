import { Card } from "@/components/ui/card";

export function NotificationEmptyState() {
  return (
    <Card className="py-12 text-center">
      <p className="text-lg font-semibold">Tout est en ordre 🎉</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Vous n&apos;avez aucune nouvelle notification.
      </p>
    </Card>
  );
}
