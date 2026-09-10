"use client";

import { useRouter } from "next/navigation";
import { RECEIPT_FORMATS } from "@/lib/settings/constants";
import type { ReceiptFormat } from "@/types/settings";

const LABELS: Record<ReceiptFormat, string> = {
  "58mm": "58 mm",
  "80mm": "80 mm",
  A4: "A4",
};

export function ReceiptFormatSelector({
  value,
  name = "receiptWidth",
  id = "receiptWidth",
  onChange,
}: {
  value: ReceiptFormat;
  name?: string;
  id?: string;
  onChange?: (format: ReceiptFormat) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Format du reçu
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange?.(event.target.value as ReceiptFormat)}
        className="h-12 w-full rounded-lg border border-border bg-card px-3.5 text-base"
      >
        {RECEIPT_FORMATS.map((format) => (
          <option key={format} value={format}>
            {LABELS[format]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ReceiptFormatSwitch({
  saleId,
  format,
}: {
  saleId: string;
  format: ReceiptFormat;
}) {
  const router = useRouter();

  return (
    <div className="print:hidden">
      <ReceiptFormatSelector
        value={format}
        id="receiptPrintFormat"
        name="format"
        onChange={(next) => {
          router.push(`/sales/${saleId}/receipt?format=${next}`);
        }}
      />
    </div>
  );
}
