"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { returnSaleForCreditAction } from "@/lib/sales/actions";
export function ReturnSaleButton({ saleId }: { saleId: string }) {
  const [open, setOpen] = useState(false); const [error, setError] = useState<string | null>(null); const [pending, start] = useTransition();
  return <><Button type="button" variant="outline" onClick={() => setOpen(true)}>Retour / avoir</Button><Dialog open={open} title="Enregistrer le retour ?" onClose={() => setOpen(false)}><p className="mb-4 text-sm text-muted-foreground">Tous les articles seront remis en stock et un avoir correspondant au total de la vente sera créé.</p>{error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}<div className="flex gap-2"><Button type="button" loading={pending} onClick={() => start(async () => { const result = await returnSaleForCreditAction(saleId); if (result.error) setError(result.error); else setOpen(false); })}>Confirmer le retour</Button><Button type="button" variant="outline" onClick={() => setOpen(false)}>Retour</Button></div></Dialog></>;
}
