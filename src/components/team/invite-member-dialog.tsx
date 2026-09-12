"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
        + Ajouter un membre
      </Button>
      <Dialog open={open} title="Ajouter un membre" onClose={() => setOpen(false)}>
        {state.success ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {state.message ??
                "Membre ajouté. Il peut se connecter avec l'e-mail et le mot de passe définis."}
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
              id="fullName"
              name="fullName"
              type="text"
              label="Nom (optionnel)"
              autoComplete="name"
              placeholder="Moussa Diallo"
              error={state.fieldErrors?.fullName}
            />
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
            <PasswordInput
              id="password"
              name="password"
              label="Mot de passe"
              autoComplete="new-password"
              required
              minLength={8}
              error={state.fieldErrors?.password}
            />
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              label="Confirmer le mot de passe"
              autoComplete="new-password"
              required
              minLength={8}
              error={state.fieldErrors?.confirmPassword}
            />
            <p className="text-xs text-muted-foreground">
              Le membre se connecte sur l&apos;application avec cet e-mail et ce mot de passe. Il
              arrive directement dans votre boutique, sans créer de compte.
            </p>
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
                Ajouter le membre
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
