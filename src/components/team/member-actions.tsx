"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { EditMemberRoleDialog } from "@/components/team/edit-member-role-dialog";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permissions";
import { useBusiness } from "@/hooks/use-business";
import {
  removeMemberAction,
  setMemberStatusAction,
} from "@/lib/team/actions";
import type { TeamMember } from "@/types/team";

export function MemberActions({ member }: { member: TeamMember }) {
  const { role } = useBusiness();
  const [open, setOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (member.isPrimaryOwner) {
    return null;
  }

  const canEditRole = hasPermission(role, "team.edit_role");
  const canSuspend = hasPermission(role, "team.suspend");

  if (!canEditRole && !canSuspend) {
    return null;
  }

  function confirmAndRun(message: string, action: () => Promise<{ error: string | null }>) {
    if (!window.confirm(message)) {
      return;
    }

    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Actions du membre"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-border bg-card p-1 shadow-lg">
          {canEditRole ? (
            <button
              type="button"
              className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                setOpen(false);
                setRoleOpen(true);
              }}
            >
              Modifier le rôle
            </button>
          ) : null}
          {canSuspend && member.status === "active" ? (
            <button
              type="button"
              className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              disabled={pending}
              onClick={() =>
                confirmAndRun(
                  "Suspendre ce membre ?\nIl ne pourra plus accéder au commerce.",
                  async () => {
                    const form = new FormData();
                    form.set("memberId", member.id);
                    form.set("status", "suspended");
                    return setMemberStatusAction(form);
                  },
                )
              }
            >
              Suspendre
            </button>
          ) : null}
          {canSuspend && member.status === "suspended" ? (
            <button
              type="button"
              className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              disabled={pending}
              onClick={() =>
                confirmAndRun("Réactiver ce membre ?", async () => {
                  const form = new FormData();
                  form.set("memberId", member.id);
                  form.set("status", "active");
                  return setMemberStatusAction(form);
                })
              }
            >
              Réactiver
            </button>
          ) : null}
          {canSuspend ? (
            <button
              type="button"
              className="flex w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-muted"
              disabled={pending}
              onClick={() =>
                confirmAndRun(
                  "Supprimer ce membre de la boutique ?\nSon compte et son historique seront conservés.",
                  async () => {
                    const form = new FormData();
                    form.set("memberId", member.id);
                    return removeMemberAction(form);
                  },
                )
              }
            >
              Supprimer de la boutique
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <EditMemberRoleDialog member={member} open={roleOpen} onClose={() => setRoleOpen(false)} />
    </div>
  );
}
