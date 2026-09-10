"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type StatusPayload = {
  status?: string;
  plan?: { name?: string; slug?: string };
  error?: string;
};

export function PaymentStatusPoller({ reference }: { reference: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("pending");
  const [planName, setPlanName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const res = await fetch(`/api/payments/status?ref=${encodeURIComponent(reference)}`);
        const data = (await res.json()) as StatusPayload;
        if (cancelled) {
          return;
        }
        if (!res.ok) {
          setError(data.error ?? "Impossible de vérifier le paiement.");
          return;
        }
        setStatus(data.status ?? "pending");
        setPlanName(data.plan?.name ?? null);

        if (data.status === "successful") {
          router.refresh();
          return;
        }
        if (data.status === "failed" || data.status === "cancelled" || data.status === "expired") {
          router.replace(`/payment/failed?ref=${encodeURIComponent(reference)}`);
          return;
        }
      } catch {
        if (!cancelled) {
          setError("Vérification temporairement indisponible.");
        }
      }

      if (!cancelled && attempts < 40) {
        window.setTimeout(poll, 2000);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [reference, router]);

  if (status === "successful") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-semibold text-success">Paiement confirmé</p>
        <p className="text-sm text-muted-foreground">
          Votre abonnement {planName ?? ""} est maintenant actif.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button href="/settings/subscription">Voir mon abonnement</Button>
          <Button href={`/payment/receipt/${encodeURIComponent(reference)}`} variant="outline">
            Voir le reçu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-center">
      <div className="mx-auto size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="font-medium">Paiement en cours de vérification</p>
      <p className="text-sm text-muted-foreground">
        Nous vérifions votre paiement. Cela peut prendre quelques instants.
      </p>
      <p className="text-xs text-muted-foreground">Référence : {reference}</p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button href={`/payment/pending?ref=${encodeURIComponent(reference)}`} variant="ghost">
        Voir l&apos;état détaillé
      </Button>
    </div>
  );
}
