import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Paiement test",
};

export const dynamic = "force-dynamic";

/** Ancienne URL mock → flux paiement mobile. */
export default async function MockPaymentRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  const ref = params.ref?.trim();
  if (!ref) {
    redirect("/checkout");
  }
  redirect(`/payment/mobile?ref=${encodeURIComponent(ref)}`);
}
