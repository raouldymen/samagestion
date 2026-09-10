import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { CustomerListItem } from "@/types/customers";

export function CustomerTable({
  customers,
  canEdit,
}: {
  customers: CustomerListItem[];
  canEdit: boolean;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm lg:block">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="border-b border-border bg-muted/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Nom</th>
            <th className="px-4 py-3 font-medium">Téléphone</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Achats</th>
            <th className="px-4 py-3 font-medium">Total acheté</th>
            <th className="px-4 py-3 font-medium">Dette</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-muted/40">
              <td className="px-4 py-3 font-medium">{customer.name}</td>
              <td className="px-4 py-3">{customer.phone ?? "—"}</td>
              <td className="px-4 py-3">{customer.email ?? "—"}</td>
              <td className="px-4 py-3">{customer.salesCount}</td>
              <td className="px-4 py-3">{formatFcfaAbsolute(customer.totalPurchased)}</td>
              <td className="px-4 py-3">
                {customer.amountDue > 0 ? (
                  <span className="font-medium text-danger">
                    {formatFcfaAbsolute(customer.amountDue)}
                  </span>
                ) : (
                  formatFcfaAbsolute(0)
                )}
              </td>
              <td className="px-4 py-3">
                <Badge variant={customer.isActive ? "success" : "neutral"}>
                  {customer.isActive ? "Actif" : "Archivé"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-3">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Voir
                  </Link>
                  {canEdit ? (
                    <Link
                      href={`/customers/${customer.id}/edit`}
                      className="font-medium text-muted-foreground hover:underline"
                    >
                      Modifier
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
