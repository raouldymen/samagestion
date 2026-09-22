"use client";

import { useActionState, useMemo, useState } from "react";
import { adminExtendTrialAction, adminSetBusinessPlanAction } from "@/lib/admin/actions";
import { ADMIN_PLAN_PERIOD_DAYS, ADMIN_TRIAL_DAYS } from "@/lib/admin/validation";
import type { AdminPaymentRow, AdminPlanSlug, AdminSubscriptionRow } from "@/lib/payments/metrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";

const PLAN_LABELS: Record<AdminPlanSlug, string> = {
  free: "Gratuit",
  pro: "Pro",
  business: "Business",
};

const PLAN_BADGE: Record<AdminPlanSlug, "neutral" | "default" | "success"> = {
  free: "neutral",
  pro: "default",
  business: "success",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  past_due: "Impayé",
  cancelled: "Annulé",
  expired: "Expiré",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
  refunded: "Remboursé",
  cancelled: "Annulé",
};

function providerLabel(provider: string) {
  if (provider === "paydunya") return "PayDunya";
  if (provider === "mock") return "Test";
  if (provider === "manual") return "Manuel";
  return provider;
}

function matchesQuery(row: AdminSubscriptionRow, query: string) {
  const haystack = `${row.businessName} ${row.businessEmail ?? ""} ${row.planName}`.toLowerCase();
  return haystack.includes(query);
}

export function AdminWorkspace({
  businesses,
  payments,
}: {
  businesses: AdminSubscriptionRow[];
  payments: AdminPaymentRow[];
}) {
  const [query, setQuery] = useState("");
  const [planTarget, setPlanTarget] = useState<AdminSubscriptionRow | null>(null);
  const [trialTarget, setTrialTarget] = useState<AdminSubscriptionRow | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<AdminSubscriptionRow | null>(null);
  const [planKey, setPlanKey] = useState(0);
  const [trialKey, setTrialKey] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return businesses;
    return businesses.filter((row) => matchesQuery(row, needle));
  }, [businesses, query]);

  const paymentRows = paymentTarget
    ? payments.filter((row) => row.businessId === paymentTarget.businessId)
    : payments;

  return (
    <div className="grid gap-8">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Commerces</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Forcer une formule, prolonger un essai ou consulter les paiements.
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <Input
              id="admin-business-search"
              name="q"
              label="Rechercher"
              hideLabel
              placeholder="Nom, e-mail ou formule…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucun commerce ne correspond.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
            {filtered.map((row) => (
              <li key={row.businessId} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{row.businessName}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {row.businessEmail ?? "Sans e-mail"} · {STATUS_LABELS[row.status] ?? row.status}
                    {row.status === "trialing" && row.trialEnd ? ` jusqu’au ${formatDateTime(row.trialEnd)}` : ""}
                    {row.status !== "trialing" && row.periodEnd ? ` · jusqu’au ${formatDateTime(row.periodEnd)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={PLAN_BADGE[row.plan]}>{PLAN_LABELS[row.plan]}</Badge>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setPlanKey(Date.now()); setPlanTarget(row); }}>
                    Formule
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setTrialKey(Date.now()); setTrialTarget(row); }}>
                    Essai
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPaymentTarget(row)}>
                    Paiements
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold">Paiements récents</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun paiement enregistré pour l’instant.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
            {payments.slice(0, 20).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{row.businessName}</p>
                  <p className="text-muted-foreground">
                    {providerLabel(row.provider)}
                    {row.planName ? ` · ${row.planName}` : ""} · {formatDateTime(row.createdAt)}
                  </p>
                </div>
                <p className="shrink-0">
                  {formatFcfaAbsolute(row.amount)} · {PAYMENT_STATUS_LABELS[row.status] ?? row.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AdminPlanDialog key={planKey} business={planTarget} onClose={() => setPlanTarget(null)} />
      <AdminTrialDialog key={trialKey} business={trialTarget} onClose={() => setTrialTarget(null)} />
      <Dialog
        open={Boolean(paymentTarget)}
        title={paymentTarget ? `Paiements · ${paymentTarget.businessName}` : "Paiements"}
        onClose={() => setPaymentTarget(null)}
      >
        {paymentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun paiement pour ce commerce.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {paymentRows.map((row) => (
              <li key={row.id} className="flex justify-between gap-3 py-2">
                <span>
                  {formatDateTime(row.createdAt)} · {providerLabel(row.provider)}
                  {row.planName ? ` · ${row.planName}` : ""}
                </span>
                <span className="shrink-0 font-medium">
                  {formatFcfaAbsolute(row.amount)} · {PAYMENT_STATUS_LABELS[row.status] ?? row.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}

function AdminPlanDialog({
  business,
  onClose,
}: {
  business: AdminSubscriptionRow | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(adminSetBusinessPlanAction, { error: null });

  return (
    <Dialog open={Boolean(business)} title="Forcer une formule" onClose={onClose}>
      {business ? (
        state.success ? (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{state.message ?? "Formule mise à jour."}</p>
            <Button type="button" onClick={onClose}>Fermer</Button>
          </div>
        ) : (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="businessId" value={business.businessId} />
            <p className="text-sm text-muted-foreground">
              {business.businessName} passe immédiatement sur la formule choisie.
            </p>
            <Select id={`admin-plan-${business.businessId}`} name="plan" label="Formule" defaultValue={business.plan} required>
              <option value="free">Gratuit</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </Select>
            <Select id={`admin-period-${business.businessId}`} name="periodDays" label="Durée (plans payants)" defaultValue="30">
              {ADMIN_PLAN_PERIOD_DAYS.map((days) => (
                <option key={days} value={days}>
                  {days} jours
                </option>
              ))}
            </Select>
            {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" loading={pending}>Enregistrer</Button>
            </div>
          </form>
        )
      ) : null}
    </Dialog>
  );
}

function AdminTrialDialog({
  business,
  onClose,
}: {
  business: AdminSubscriptionRow | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(adminExtendTrialAction, { error: null });

  return (
    <Dialog open={Boolean(business)} title="Prolonger l’essai" onClose={onClose}>
      {business ? (
        state.success ? (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{state.message ?? "Essai prolongé."}</p>
            <Button type="button" onClick={onClose}>Fermer</Button>
          </div>
        ) : (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="businessId" value={business.businessId} />
            <p className="text-sm text-muted-foreground">
              {business.businessName} : l’essai part de la date actuelle (ou de la fin déjà prévue). Un commerce Gratuit passe en essai Business.
            </p>
            <Select id={`admin-trial-${business.businessId}`} name="extraDays" label="Durée à ajouter" defaultValue="14" required>
              {ADMIN_TRIAL_DAYS.map((days) => (
                <option key={days} value={days}>
                  {days} jours
                </option>
              ))}
            </Select>
            {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" loading={pending}>Prolonger</Button>
            </div>
          </form>
        )
      ) : null}
    </Dialog>
  );
}
