"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { recordCustomerDebtPaymentAction } from "@/lib/customers/actions";
import type { AuthResult } from "@/types";
const initial: AuthResult = { error: null };
export function DebtPaymentForm({ saleId, customerId, maximum }: { saleId: string; customerId: string; maximum: number }) {
  const [state, action, pending] = useActionState(recordCustomerDebtPaymentAction, initial);
  return <form action={action} className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
    <input type="hidden" name="saleId" value={saleId}/><input type="hidden" name="customerId" value={customerId}/>
    <div className="w-36"><Input id={`amount-${saleId}`} name="amount" label="Montant" type="number" min="1" max={maximum} defaultValue={maximum} required /></div>
    <div className="w-36"><Select id={`method-${saleId}`} name="paymentMethod" label="Mode"><option value="cash">Espèces</option><option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="bank">Banque</option><option value="card">Carte</option></Select></div>
    <Button type="submit" size="sm" loading={pending}>Encaisser</Button>
    {state.error ? <p className="w-full text-xs text-danger">{state.error}</p> : null}{state.success ? <p className="w-full text-xs text-success">{state.message}</p> : null}
  </form>;
}
