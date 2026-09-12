"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { inviteMemberAction } from "@/lib/team/actions";
import { ROLE_LABELS } from "@/lib/team/labels";

export function InviteMemberDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(inviteMemberAction, { error: null });

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Inviter un membre
      </Button>
      <Dialog open={open} title="Inviter un membre" onClose={() => setOpen(false)}>
        {state.success ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {state.message ??
                "Invitation envoyée. Le lien apparaît dans la liste des invitations."}
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder="membre@email.com"
              error={state.fieldErrors?.email}
            />
            <Select
              id="role"
              name="role"
              label="Rôle"
              defaultValue="seller"
              error={state.fieldErrors?.role}
              required
            >
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={pending}>
                Envoyer l&apos;invitation
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
