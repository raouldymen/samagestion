import { Receipt } from "@/components/receipts/receipt";
import { Card } from "@/components/ui/card";
import type { ReceiptView } from "@/types/receipts";

export function ReceiptPreview({ receipt }: { receipt: ReceiptView }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">Aperçu du reçu</h2>
      <Card className="overflow-auto bg-muted p-4">
        <Receipt receipt={receipt} />
      </Card>
    </section>
  );
}
