"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/lib/sales/constants";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { PaymentMethod } from "@/types/sales";

export function PaymentSection({
  method,
  amountPaid,
  total,
  amountDue,
  error,
  onMethod,
  onAmountPaid,
}: {
  method: PaymentMethod;
  amountPaid: number;
  total: number;
  amountDue: number;
  error?: string;
  onMethod: (value: PaymentMethod) => void;
  onAmountPaid: (value: number) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <Select
        id="paymentMethod"
        name="paymentMethod"
        label="Paiement"
        value={method}
        onChange={(event) => onMethod(event.target.value as PaymentMethod)}
      >
        {PAYMENT_METHODS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <Input
        id="amountPaid"
        name="amountPaid"
        label="Montant payé"
        type="number"
        inputMode="decimal"
        min={0}
        max={total}
        step="0.01"
        value={Number.isNaN(amountPaid) ? "" : amountPaid}
        onChange={(event) => onAmountPaid(Number(event.target.value))}
        error={error}
      />
      <p className="text-sm">
        Reste à payer :{" "}
        <span className="font-semibold">{formatFcfaAbsolute(Math.max(0, amountDue))}</span>
      </p>
    </section>
  );
}
