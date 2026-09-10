"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateNotificationSettingsAction } from "@/lib/notifications/actions";
import { canViewFinancialReports } from "@/lib/auth/permissions";
import type { BusinessRole } from "@/types/database";
import type { NotificationSettings } from "@/types/notifications";

const TOGGLES: { name: string; label: string; key: Exclude<keyof NotificationSettings, "id" | "businessId" | "userId" | "customerDebtAlertThreshold"> }[] = [
  { name: "lowStock", label: "Stock faible", key: "lowStock" },
  { name: "outOfStock", label: "Rupture stock", key: "outOfStock" },
  { name: "customerDebt", label: "Dettes clients", key: "customerDebt" },
  { name: "oldCustomerDebt", label: "Dettes anciennes", key: "oldCustomerDebt" },
  { name: "supplierDebt", label: "Dettes fournisseurs", key: "supplierDebt" },
  { name: "saleCompleted", label: "Ventes", key: "saleCompleted" },
  { name: "purchaseCompleted", label: "Achats", key: "purchaseCompleted" },
  { name: "paymentReceived", label: "Paiements", key: "paymentReceived" },
];

export function NotificationSettingsForm({
  settings,
  role,
}: {
  settings: NotificationSettings;
  role: BusinessRole;
}) {
  const [state, action, pending] = useActionState(updateNotificationSettingsAction, { error: null });
  const canEditThreshold = canViewFinancialReports(role);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <form action={action} className="flex flex-col gap-4">
        <ul className="divide-y divide-border">
          {TOGGLES.map((item) => {
            const checked = Boolean(settings[item.key]);
            return (
              <li key={item.name} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <span className="text-sm font-medium">{item.label}</span>
                <label className="inline-flex cursor-pointer items-center">
                  <span className="sr-only">{item.label}</span>
                  <input
                    type="checkbox"
                    name={item.name}
                    defaultChecked={checked}
                    className="size-5 accent-primary"
                  />
                </label>
              </li>
            );
          })}
        </ul>
        {canEditThreshold ? (
          <Input
            id="customerDebtAlertThreshold"
            name="customerDebtAlertThreshold"
            label="Seuil d'alerte dette client (FCFA)"
            type="number"
            min={0}
            step={1000}
            defaultValue={settings.customerDebtAlertThreshold}
          />
        ) : null}
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state.message ? <p className="text-sm text-success">{state.message}</p> : null}
        <Button type="submit" loading={pending} className="self-start">
          Enregistrer
        </Button>
      </form>
    </Card>
  );
}
