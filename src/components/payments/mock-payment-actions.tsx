"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MockPaymentActions({
  reference,
  amount,
  currency,
  environment,
}: {
  reference: string;
  amount: number;
  currency: string;
  environment: "test" | "production";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"success" | "fail" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function simulate(success: boolean) {
    setError(null);
    setLoading(success ? "success" : "fail");
    try {
      const res = await fetch("/api/payments/mock/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          amount,
          currency,
          environment,
          success,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const code = data.error ?? "Simulation impossible.";
        setError(
          code === "MOCK_ONLY_IN_TEST"
            ? "Cette transaction n'est pas en mode test. Relancez le checkout."
            : code === "MOCK_DISABLED_IN_PRODUCTION"
              ? "Simulation mock désactivée en production."
              : code === "SERVICE_ROLE_NOT_CONFIGURED"
                ? "Clé service role manquante côté serveur."
                : code,
        );
        setLoading(null);
        return;
      }
      router.push(
        success
          ? `/payment/success?ref=${encodeURIComponent(reference)}`
          : `/payment/failed?ref=${encodeURIComponent(reference)}`,
      );
    } catch {
      setError("Simulation impossible.");
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Mode test — aucun débit réel. Simulez le résultat du prestataire.
      </p>
      <Button
        type="button"
        className="w-full"
        size="lg"
        loading={loading === "success"}
        disabled={loading !== null}
        onClick={() => void simulate(true)}
      >
        Simuler un paiement réussi
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        size="lg"
        loading={loading === "fail"}
        disabled={loading !== null}
        onClick={() => void simulate(false)}
      >
        Simuler un échec
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
