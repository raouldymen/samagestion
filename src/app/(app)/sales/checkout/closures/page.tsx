import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireBusinessSession } from "@/lib/auth/session";
import { isCashierCheckoutRequired, listCashierDailyClosures } from "@/lib/sales/queries";
import { formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Clôtures de caisse" };

export default async function CashierClosuresPage() {
  const session = await requireBusinessSession();
  if (!["owner", "manager", "cashier"].includes(session.role)) redirect("/sales");
  if (session.role !== "cashier" && !(await isCashierCheckoutRequired())) redirect("/sales");
  const closures = await listCashierDailyClosures();
  return <>
    <PageHeader title="Clôtures de caisse" description="Historique des montants comptés et des écarts." actions={<Button href={session.role === "cashier" ? "/sales/checkout" : "/sales"} variant="outline">Retour</Button>} />
    {closures.length === 0 ? <Card className="py-10 text-center"><p className="font-medium">Aucune clôture enregistrée.</p></Card> : <Card className="overflow-x-auto p-0"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Caissier</th><th className="px-4 py-3 font-medium">Attendu</th><th className="px-4 py-3 font-medium">Compté</th><th className="px-4 py-3 font-medium">Écart</th><th className="px-4 py-3 font-medium">Observation</th></tr></thead><tbody>{closures.map((closure) => <tr key={closure.id} className="border-b border-border last:border-0"><td className="px-4 py-3">{closure.cashDate}<br /><span className="text-xs text-muted-foreground">{formatDateTime(closure.closedAt)}</span></td><td className="px-4 py-3 font-medium">{closure.cashierName}</td><td className="px-4 py-3">{formatFcfaAbsolute(closure.expectedAmount)}</td><td className="px-4 py-3">{formatFcfaAbsolute(closure.countedAmount)}</td><td className={`px-4 py-3 font-semibold ${closure.differenceAmount === 0 ? "text-success" : closure.differenceAmount < 0 ? "text-danger" : "text-amber-700"}`}>{closure.differenceAmount > 0 ? "+ " : ""}{formatFcfaAbsolute(closure.differenceAmount)}</td><td className="px-4 py-3 text-muted-foreground">{closure.notes ?? "—"}</td></tr>)}</tbody></table></Card>}
  </>;
}
