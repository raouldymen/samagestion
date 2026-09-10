import type { ReceiptView } from "@/types/receipts";

export function ReceiptHeader({ receipt }: { receipt: ReceiptView }) {
  return (
    <header className="text-center">
      {receipt.settings.showLogo && receipt.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={receipt.logoUrl}
          alt=""
          className="mx-auto mb-2 max-h-16 max-w-[70%] object-contain"
        />
      ) : null}
      <p className="text-base font-semibold uppercase tracking-wide">{receipt.businessName}</p>
      {receipt.settings.showPhone && receipt.businessPhone ? (
        <p className="mt-1 text-xs">{receipt.businessPhone}</p>
      ) : null}
      {receipt.settings.showAddress && receipt.businessAddress ? (
        <p className="text-xs">{receipt.businessAddress}</p>
      ) : null}
    </header>
  );
}
