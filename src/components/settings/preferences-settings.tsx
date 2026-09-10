"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updatePreferencesAction } from "@/lib/settings/actions";
import { displayCurrency, SUPPORTED_LOCALES } from "@/lib/settings/constants";
import type { BusinessSettings } from "@/types/settings";

export function PreferencesSettings({
  settings,
  canEdit,
}: {
  settings: BusinessSettings;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(updatePreferencesAction, { error: null });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préférences</CardTitle>
      </CardHeader>
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="locale" className="text-sm font-medium text-foreground">
            Langue
          </label>
          <select
            id="locale"
            name="locale"
            defaultValue={settings.locale}
            disabled={!canEdit}
            className="h-12 w-full rounded-lg border border-border bg-card px-3.5 text-base"
          >
            {SUPPORTED_LOCALES.map((locale) => (
              <option key={locale.value} value={locale.value} disabled={!locale.enabled}>
                {locale.label}
                {locale.enabled ? "" : " (bientôt)"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dateFormat" className="text-sm font-medium text-foreground">
            Format des dates
          </label>
          <select
            id="dateFormat"
            name="dateFormat"
            defaultValue={settings.dateFormat}
            disabled={!canEdit}
            className="h-12 w-full rounded-lg border border-border bg-card px-3.5 text-base"
          >
            <option value="short">27/08/2026</option>
            <option value="long">27 août 2026</option>
          </select>
          <p className="text-sm text-muted-foreground">Fuseau : Africa/Dakar</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="numberFormat" className="text-sm font-medium text-foreground">
            Format des nombres
          </label>
          <select
            id="numberFormat"
            name="numberFormat"
            defaultValue={settings.numberFormat}
            disabled={!canEdit}
            className="h-12 w-full rounded-lg border border-border bg-card px-3.5 text-base"
          >
            <option value="fr-FR">15 000 (fr-FR)</option>
          </select>
        </div>
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
          <p className="text-sm text-muted-foreground">Seul le propriétaire peut modifier les préférences.</p>
        )}
      </form>
    </Card>
  );
}
