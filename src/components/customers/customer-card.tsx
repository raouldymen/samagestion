import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { CustomerListItem } from "@/types/customers";

export function CustomerCard({
  customer,
  canEdit,
}: {
  customer: CustomerListItem;
  canEdit: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{customer.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {customer.phone ?? "Sans téléphone"}
          </p>
        </div>
        <Badge variant={customer.isActive ? "success" : "neutral"}>
          {customer.isActive ? "Actif" : "Archivé"}
        </Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Achats</dt>
          <dd className="font-medium">{formatFcfaAbsolute(customer.totalPurchased)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Dette</dt>
          <dd className={`font-medium ${customer.amountDue > 0 ? "text-danger" : ""}`}>
            {formatFcfaAbsolute(customer.amountDue)}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex gap-3 text-sm">
        <Link href={`/customers/${customer.id}`} className="font-medium text-primary">
          Voir
        </Link>
        {canEdit ? (
          <Link
            href={`/customers/${customer.id}/edit`}
            className="font-medium text-muted-foreground"
          >
            Modifier
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
