import Link from "next/link";
import { auditActionLabel, auditEntityRef } from "@/lib/team/labels";
import { formatDateTime } from "@/lib/utils/format";
import type { AuditLog } from "@/types/team";

export function ActivityLog({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Aucune activité enregistrée pour ces filtres.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {logs.map((log) => {
        const ref = auditEntityRef(log.action, log.metadata);
        const href =
          log.entityType === "sale" && log.entityId
            ? `/sales/${log.entityId}`
            : log.entityType === "product" && log.entityId
              ? `/products/${log.entityId}`
              : log.entityType === "purchase" && log.entityId
                ? `/purchases/${log.entityId}`
                : null;

        return (
          <li key={log.id} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
            <p className="mt-1 font-medium">{log.actorName}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {auditActionLabel(log.action)}
              {ref ? (
                <>
                  {" "}
                  {href ? (
                    <Link href={href} className="font-medium text-primary hover:underline">
                      {ref}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{ref}</span>
                  )}
                </>
              ) : null}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
