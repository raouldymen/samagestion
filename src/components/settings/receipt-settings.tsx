"use client";

import { useActionState, useMemo, useState } from "react";
import { ReceiptPreview } from "@/components/settings/receipt-preview";
import { ReceiptFormatSelector } from "@/components/settings/receipt-format-selector";
import { LegalInformationForm } from "@/components/settings/legal-information-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { previewReceiptView } from "@/lib/receipts/preview";
import { updateReceiptSettingsAction } from "@/lib/settings/actions";
import { DEFAULT_RECEIPT_MESSAGE } from "@/lib/settings/constants";
import type { BusinessSettings, ReceiptFormat } from "@/types/settings";

const TOGGLES = [
  { name: "showLogo", label: "Afficher le logo", key: "showLogo" },
  { name: "showPhone", label: "Afficher le téléphone", key: "showPhone" },
  { name: "showAddress", label: "Afficher l'adresse", key: "showAddress" },
  { name: "showCustomer", label: "Afficher le client", key: "showCustomer" },
  { name: "showSeller", label: "Afficher le vendeur", key: "showSeller" },
  { name: "showNotes", label: "Afficher les notes", key: "showNotes" },
  { name: "showMessage", label: "Afficher le message personnalisé", key: "showMessage" },
] as const;

export function ReceiptSettings({
  settings,
  canEdit,
}: {
  settings: BusinessSettings;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(updateReceiptSettingsAction, { error: null });
  const [draft, setDraft] = useState({
    receiptPrefix: settings.receiptPrefix,
    purchasePrefix: settings.purchasePrefix,
    receiptWidth: settings.receiptWidth,
    showLogo: settings.showLogo,
    showPhone: settings.showPhone,
    showAddress: settings.showAddress,
    showCustomer: settings.showCustomer,
    showSeller: settings.showSeller,
    showNotes: settings.showNotes,
    showMessage: settings.showMessage,
    receiptMessage: settings.receiptMessage || DEFAULT_RECEIPT_MESSAGE,
    legalInformation: settings.legalInformation,
  });

  const preview = useMemo(
    () =>
      previewReceiptView(
        {
          ...settings,
          ...draft,
        },
        draft.receiptWidth,
      ),
    [draft, settings],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres du reçu</CardTitle>
        </CardHeader>
        <form action={action} className="flex flex-col gap-4">
          <Input
            id="receiptPrefix"
            name="receiptPrefix"
            label="Préfixe des ventes"
            value={draft.receiptPrefix}
            readOnly={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, receiptPrefix: event.target.value.toUpperCase() }))}
            hint="Exemple : V-000001 ou FACT-000001"
            error={state.fieldErrors?.receiptPrefix}
          />
          <Input
            id="purchasePrefix"
            name="purchasePrefix"
            label="Préfixe des achats"
            value={draft.purchasePrefix}
            readOnly={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, purchasePrefix: event.target.value.toUpperCase() }))}
            hint="Exemple : A-000001"
            error={state.fieldErrors?.purchasePrefix}
          />
          <ReceiptFormatSelector
            value={draft.receiptWidth}
            onChange={(receiptWidth: ReceiptFormat) => setDraft((current) => ({ ...current, receiptWidth }))}
          />
          <ul className="divide-y divide-border">
            {TOGGLES.map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <span className="text-sm font-medium">{item.label}</span>
                <label className="inline-flex cursor-pointer items-center">
                  <span className="sr-only">{item.label}</span>
                  <input
                    type="checkbox"
                    name={item.name}
                    checked={draft[item.key]}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [item.key]: event.target.checked }))
                    }
                    className="size-5 accent-primary"
                  />
                </label>
              </li>
            ))}
          </ul>
          <Textarea
            id="receiptMessage"
            name="receiptMessage"
            label="Message de reçu"
            value={draft.receiptMessage}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, receiptMessage: event.target.value }))}
          />
          <LegalInformationForm
            value={draft.legalInformation}
            disabled={!canEdit}
            onChange={(legalInformation) => setDraft((current) => ({ ...current, legalInformation }))}
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
            <p className="text-sm text-muted-foreground">Seul le propriétaire peut modifier les reçus.</p>
          )}
        </form>
      </Card>
      <ReceiptPreview receipt={preview} />
    </div>
  );
}
