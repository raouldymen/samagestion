"use client";

import { Download, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { receiptTextLines } from "@/lib/receipts/pdf";
import type { ReceiptView } from "@/types/receipts";

export function ReceiptActions({ receipt }: { receipt: ReceiptView }) {
  const pdfHref = `/sales/${receipt.saleId}/receipt/pdf?format=${receipt.format}`;

  async function share() {
    const text = receiptTextLines(receipt).join("\n");
    const url = `${window.location.origin}/sales/${receipt.saleId}/receipt`;

    if (navigator.share) {
      await navigator.share({
        title: `Reçu ${receipt.saleNumber}`,
        text,
        url,
      });
      return;
    }

    await navigator.clipboard.writeText(`${text}\n${url}`);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" onClick={() => window.print()}>
        <Printer className="size-4" aria-hidden="true" />
        Imprimer le reçu
      </Button>
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer className="size-4" aria-hidden="true" />
        Réimprimer
      </Button>
      <Button href={pdfHref} variant="outline">
        <Download className="size-4" aria-hidden="true" />
        Télécharger PDF
      </Button>
      <Button type="button" variant="outline" onClick={() => void share()}>
        <Share2 className="size-4" aria-hidden="true" />
        Partager
      </Button>
    </div>
  );
}
