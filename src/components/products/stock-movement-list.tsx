import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { STOCK_MOVEMENT_LABELS } from "@/lib/products/constants";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { StockMovement } from "@/types/products";

export function StockMovementList({ movements }: { movements: StockMovement[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des mouvements</CardTitle>
      </CardHeader>
      {movements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun mouvement pour le moment.</p>
      ) : (
        <ul className="divide-y divide-border">
          {movements.map((movement) => (
            <li key={movement.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {STOCK_MOVEMENT_LABELS[movement.type]}
                  {movement.reason ? ` · ${movement.reason}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(movement.createdAt)} · {movement.creatorName}
                </p>
              </div>
              <div className="text-sm">
                <p
                  className={cn(
                    "font-semibold",
                    movement.quantity >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {movement.quantity > 0 ? "+" : ""}
                  {movement.quantity}
                </p>
                <p className="text-xs text-muted-foreground">
                  {movement.previousStock} → {movement.newStock}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
