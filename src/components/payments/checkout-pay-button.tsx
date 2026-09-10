"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CheckoutPayButton({ planId }: { planId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  return (
    <div className="mt-6 space-y-3">
      <Button
        type="button"
        size="lg"
        className="w-full"
        loading={loading}
        disabled={started}
        onClick={async () => {
          setError(null);
          setLoading(true);
          setStarted(true);
          try {
            const res = await fetch("/api/payments/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ planId }),
            });
            const data = (await res.json()) as {
              checkoutUrl?: string;
              message?: string;
              error?: string;
            };
            if (!res.ok || !data.checkoutUrl) {
              setError(data.message ?? data.error ?? "Impossible de démarrer le paiement.");
              setStarted(false);
              return;
            }
            window.location.href = data.checkoutUrl;
          } catch {
            setError("Impossible de démarrer le paiement.");
            setStarted(false);
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Paiement en cours..." : "Payer par mobile money"}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
