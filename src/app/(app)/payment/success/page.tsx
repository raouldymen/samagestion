import type { Metadata } from "next";
import { PaymentStatusPoller } from "@/components/payments/payment-status-poller";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Paiement en cours",
};

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  await requirePermission("settings.view");
  const params = await searchParams;
  const ref = params.ref?.trim();
  if (!ref) {
    redirect("/settings/billing");
  }

  return (
    <>
      <PageHeader title="Confirmation" description="Vérification serveur du paiement." />
      <Card className="mx-auto max-w-md py-8">
        <PaymentStatusPoller reference={ref} />
      </Card>
    </>
  );
}
