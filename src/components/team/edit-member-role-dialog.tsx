"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { updateMemberRoleAction } from "@/lib/team/actions";
import { ROLE_LABELS } from "@/lib/team/labels";
import type { TeamMember } from "@/types/team";

export function EditMemberRoleDialog({
  member,
  open,
  onClose,
}: {
  member: TeamMember;
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateMemberRoleAction, { error: null });

  return (
    <Dialog open={open} title="Modifier le rôle ?" onClose={onClose}>
      {state.success ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Le membre a maintenant accès aux nouvelles fonctionnalités.
          </p>
          <div className="flex justify-end">
            <Button type="button" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Le membre aura immédiatement accès aux nouvelles fonctionnalités.
          </p>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="memberId" value={member.id} />
            <Select id="role" name="role" label="Rôle" defaultValue={member.role} required>
              {ASSIGNABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
            {state.error ? (
              <p role="alert" className="text-sm text-danger">
                {state.error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" loading={pending}>
                Confirmer
              </Button>
            </div>
          </form>
        </>
      )}
    </Dialog>
  );
}
