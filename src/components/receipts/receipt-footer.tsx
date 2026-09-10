import type { ReceiptView } from "@/types/receipts";

export function ReceiptFooter({ receipt }: { receipt: ReceiptView }) {
  return (
    <footer className="mt-3 space-y-2 text-center text-xs">
      {receipt.settings.legalInformation.trim() ? (
        <p className="whitespace-pre-line text-left">{receipt.settings.legalInformation}</p>
      ) : null}
      {receipt.settings.showMessage && receipt.settings.receiptMessage.trim() ? (
        <p className="whitespace-pre-line">{receipt.settings.receiptMessage}</p>
      ) : null}
    </footer>
  );
}
