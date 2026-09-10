import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <span className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Inbox className="size-5" aria-hidden="true" />
        </span>
        <Badge>Bientôt disponible</Badge>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Cette fonctionnalité sera développée dans une prochaine étape.
        </p>
      </Card>
    </>
  );
}
