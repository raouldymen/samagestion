"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { closeCashierDayAction } from "@/lib/sales/actions";
import { formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";
import type { CashierClosureSummary } from "@/lib/sales/queries";

export function CashierClosureCard({ summary }: { summary: CashierClosureSummary }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(closeCashierDayAction, { error: null });
  const difference = summary.differenceAmount ?? 0;

  return (
    <Card className="border-primary/20 bg-primary-soft p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-primary">Clôture de caisse</p>
          <p className="mt-1 text-sm text-primary/80">Espèces encaissées moins dépenses réglées en espèces.</p>
        </div>
        {summary.closed ? <span className="rounded-full bg-success-soft px-3 py-1 text-sm font-medium text-success">Clôturée</span> : <Button type="button" onClick={() => setOpen(true)}>Clôturer la caisse</Button>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-muted-foreground">Ventes espèces</dt><dd className="mt-1 font-semibold">{formatFcfaAbsolute(summary.cashSales)}</dd></div>
        <div><dt className="text-muted-foreground">Dépenses espèces</dt><dd className="mt-1 font-semibold text-danger">− {formatFcfaAbsolute(summary.cashExpenses)}</dd></div>
        <div><dt className="text-muted-foreground">Montant attendu</dt><dd className="mt-1 font-semibold text-primary">{formatFcfaAbsolute(summary.expectedAmount)}</dd></div>
        {summary.closed ? <><div><dt className="text-muted-foreground">Montant compté</dt><dd className="mt-1 font-semibold">{formatFcfaAbsolute(summary.countedAmount ?? 0)}</dd></div><div><dt className="text-muted-foreground">Écart</dt><dd className={`mt-1 font-semibold ${difference === 0 ? "text-success" : difference < 0 ? "text-danger" : "text-amber-700"}`}>{difference > 0 ? "+ " : ""}{formatFcfaAbsolute(difference)}</dd></div><div><dt className="text-muted-foreground">Clôturée le</dt><dd className="mt-1 font-medium">{summary.closedAt ? formatDateTime(summary.closedAt) : "—"}</dd></div></> : null}
      </dl>
      <Dialog open={open} title="Clôturer la caisse" onClose={() => setOpen(false)}>
        <form action={formAction} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Montant attendu : <strong className="text-foreground">{formatFcfaAbsolute(summary.expectedAmount)}</strong></p>
          <Input id="countedAmount" name="countedAmount" label="Montant réellement compté" type="number" inputMode="decimal" min={0} step="0.01" required autoFocus />
          <Textarea id="notes" name="notes" label="Observation (facultatif)" placeholder="Ex. Billet manquant, erreur de monnaie…" />
          {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
          <Button type="submit" loading={pending}>Enregistrer la clôture</Button>
        </form>
      </Dialog>
    </Card>
  );
}
