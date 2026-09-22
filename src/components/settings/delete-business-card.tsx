"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-input";
import { deleteBusinessAction } from "@/lib/settings/actions";

export function DeleteBusinessCard({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteBusinessAction, { error: null });

  return (
    <Card className="border-danger/30">
      <CardHeader>
        <CardTitle>Supprimer le commerce</CardTitle>
      </CardHeader>
      <p className="text-sm text-muted-foreground">
        Cette action est définitive. Les ventes, le stock, les clients, l’équipe et les dépenses de{" "}
        <strong className="text-foreground">{businessName}</strong> seront effacés.
      </p>
      <Button type="button" variant="danger" className="mt-4" onClick={() => setOpen(true)}>
        Supprimer le commerce
      </Button>
      <Dialog open={open} title="Confirmer la suppression" onClose={() => setOpen(false)}>
        <form action={formAction} className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Saisissez le mot de passe du compte propriétaire pour supprimer définitivement{" "}
            <strong className="text-foreground">{businessName}</strong>.
          </p>
          <PasswordInput
            id="delete-business-password"
            name="password"
            label="Mot de passe"
            autoComplete="current-password"
            required
            error={state.fieldErrors?.password}
          />
          {state.error && !state.fieldErrors?.password ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="danger" loading={pending}>
              Supprimer définitivement
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}