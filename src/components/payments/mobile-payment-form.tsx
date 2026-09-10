"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MOBILE_MONEY_METHODS,
  mobileMoneyLabel,
  normalizeSenegalPhone,
  type MobileMoneyMethod,
} from "@/lib/payments/mobile-money";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function MobilePaymentForm({
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
  const [method, setMethod] = useState<MobileMoneyMethod>("wave");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"success" | "fail" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function simulate(success: boolean) {
    setError(null);
    const normalized = normalizeSenegalPhone(phone);
    if (!normalized) {
      setPhoneError("Entrez un numéro sénégalais valide (ex. 77 123 45 67).");
      return;
    }
    setPhoneError(null);
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
          method,
          phone: normalized,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const code = data.error ?? "Paiement impossible.";
        setError(
          code === "MOCK_ONLY_IN_TEST"
            ? "Cette transaction n'est pas en mode test. Relancez le checkout."
            : code === "MOCK_DISABLED_IN_PRODUCTION"
              ? "Simulation désactivée en production."
              : code === "INVALID_PHONE"
                ? "Numéro de téléphone invalide."
                : code === "INVALID_METHOD"
                  ? "Choisissez Wave ou Orange Money."
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
      setError("Paiement impossible.");
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      {environment === "test" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Mode test — aucun débit réel. Choisissez Wave ou Orange Money pour
          simuler le paiement mobile.
        </p>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground">
          Moyen de paiement
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {MOBILE_MONEY_METHODS.map((option) => {
            const selected = method === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setMethod(option.value)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-slate-300",
                )}
                aria-pressed={selected}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.hint}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <Input
        id="mobile-money-phone"
        label="Numéro de téléphone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="77 123 45 67"
        hint="Sénégal — format 7X XXX XX XX"
        value={phone}
        error={phoneError ?? undefined}
        onChange={(e) => {
          setPhone(e.target.value);
          if (phoneError) setPhoneError(null);
        }}
      />

      <div className="rounded-xl bg-muted/60 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          À payer avec {mobileMoneyLabel(method)}
        </p>
        <p className="text-2xl font-semibold tracking-tight">
          {formatFcfaAbsolute(amount)}
        </p>
      </div>

      <Button
        type="button"
        className="w-full"
        size="lg"
        loading={loading === "success"}
        disabled={loading !== null}
        onClick={() => void simulate(true)}
      >
        Payer avec {mobileMoneyLabel(method)}
      </Button>

      {environment === "test" ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          loading={loading === "fail"}
          disabled={loading !== null}
          onClick={() => void simulate(false)}
        >
          Simuler un échec
        </Button>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
