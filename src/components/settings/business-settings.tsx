"use client";

import { useActionState } from "react";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateBusinessProfileAction } from "@/lib/settings/actions";
import { displayCurrency } from "@/lib/settings/constants";
import type { BusinessSettings as BusinessSettingsData } from "@/types/settings";

export function BusinessSettings({
  settings,
  canEdit,
}: {
  settings: BusinessSettingsData;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(updateBusinessProfileAction, { error: null });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du commerce</CardTitle>
      </CardHeader>
      <div className="mb-5">
        <p className="mb-2 text-sm font-medium">Logo</p>
        <LogoUploader logoUrl={settings.logoUrl} canEdit={canEdit} />
      </div>
      <form action={action} className="flex flex-col gap-4">
        <Input
          id="name"
          name="name"
          label="Nom"
          defaultValue={settings.name}
          required
          readOnly={!canEdit}
          error={state.fieldErrors?.name}
        />
        <Input
          id="phone"
          name="phone"
          label="Téléphone"
          type="tel"
          inputMode="tel"
          defaultValue={settings.phone ?? ""}
          placeholder="77 xxx xx xx"
          readOnly={!canEdit}
        />
        <Input
          id="email"
          name="email"
          label="Email"
          type="email"
          defaultValue={settings.email ?? ""}
          readOnly={!canEdit}
          error={state.fieldErrors?.email}
        />
        <Input
          id="address"
          name="address"
          label="Adresse"
          defaultValue={settings.address ?? ""}
          readOnly={!canEdit}
        />
        <Input id="city" name="city" label="Ville" defaultValue={settings.city ?? ""} placeholder="Dakar" readOnly={!canEdit} />
        <Input id="country" name="country" label="Pays" defaultValue={settings.country} readOnly={!canEdit} />
        <Input
          id="currency"
          name="currency"
          label="Devise"
          defaultValue={settings.currency}
          readOnly
          hint={`Affichée : ${displayCurrency(settings.currency)}`}
        />
        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        {state.message ? <p className="text-sm text-success">{state.message}</p> : null}
        {canEdit ? (
          <Button type="submit" loading={pending} className="self-start">
            Enregistrer
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Seul le propriétaire peut modifier ces informations.</p>
        )}
      </form>
    </Card>
  );
}
