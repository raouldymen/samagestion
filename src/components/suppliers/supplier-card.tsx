import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { SupplierListItem } from "@/types/purchases";

export function SupplierCard({ supplier }: { supplier: SupplierListItem }) {
  return (
    <Card className="p-4">
      <Link href={`/suppliers/${supplier.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold">{supplier.name}</p>
          <Badge variant={supplier.isActive ? "success" : "neutral"}>
            {supplier.isActive ? "Actif" : "Inactif"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{supplier.phone ?? "Pas de téléphone"}</p>
        <p className="mt-3 text-lg font-semibold">{formatFcfaAbsolute(supplier.purchasesTotal)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {supplier.purchasesCount} achat{supplier.purchasesCount > 1 ? "s" : ""} · Dette{" "}
          {formatFcfaAbsolute(supplier.amountDue)}
        </p>
      </Link>
    </Card>
  );
}
