import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { SupplierListItem } from "@/types/purchases";

export function SupplierTable({ suppliers }: { suppliers: SupplierListItem[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm lg:block">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-border bg-muted/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Nom</th>
            <th className="px-4 py-3 font-medium">Téléphone</th>
            <th className="px-4 py-3 font-medium">Nombre d&apos;achats</th>
            <th className="px-4 py-3 font-medium">Montant acheté</th>
            <th className="px-4 py-3 font-medium">Dette</th>
            <th className="px-4 py-3 font-medium">Échéance</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {suppliers.map((supplier) => (
            <tr key={supplier.id} className="hover:bg-muted/40">
              <td className="px-4 py-3 font-medium">{supplier.name}</td>
              <td className="px-4 py-3">{supplier.phone ?? "—"}</td>
              <td className="px-4 py-3">{supplier.purchasesCount}</td>
              <td className="px-4 py-3">{formatFcfaAbsolute(supplier.purchasesTotal)}</td>
              <td className="px-4 py-3">{formatFcfaAbsolute(supplier.amountDue)}</td>
              <td className={`px-4 py-3 ${((supplier.overdueAmount ?? 0) > 0) ? "font-medium text-danger" : ""}`}>{(supplier.overdueAmount ?? 0) > 0 ? "En retard" : supplier.nextDueDate ?? "—"}</td>
              <td className="px-4 py-3">
                <Badge variant={supplier.isActive ? "success" : "neutral"}>
                  {supplier.isActive ? "Actif" : "Inactif"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/suppliers/${supplier.id}`}
                  className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Voir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
