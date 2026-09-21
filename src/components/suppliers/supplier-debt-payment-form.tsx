"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { recordSupplierDebtPaymentAction } from "@/lib/purchases/actions";
import type { AuthResult } from "@/types";
export function SupplierDebtPaymentForm({purchaseId,supplierId,maximum}:{purchaseId:string;supplierId:string;maximum:number}) { const [state,action,pending]=useActionState(recordSupplierDebtPaymentAction,{error:null} as AuthResult); return <form action={action} className="mt-2 flex flex-wrap items-end gap-2"><input type="hidden" name="purchaseId" value={purchaseId}/><input type="hidden" name="supplierId" value={supplierId}/><div className="w-32"><Input id={`pay-${purchaseId}`} name="amount" label="Règlement" type="number" min="1" max={maximum} defaultValue={maximum} required/></div><div className="w-32"><Select id={`method-${purchaseId}`} name="paymentMethod" label="Mode"><option value="cash">Espèces</option><option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="bank">Banque</option></Select></div><Button type="submit" size="sm" loading={pending}>Régler</Button>{state.error?<p className="w-full text-xs text-danger">{state.error}</p>:null}{state.success?<p className="w-full text-xs text-success">{state.message}</p>:null}</form>; }
