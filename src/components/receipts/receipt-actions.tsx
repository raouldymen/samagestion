"use client";

import { useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openReceiptPrintPreview, shareReceiptPdf } from "@/lib/receipts/browser";
import { receiptTextLines } from "@/lib/receipts/pdf";
import type { ReceiptView } from "@/types/receipts";

export function ReceiptActions({ receipt }: { receipt: ReceiptView }) {
  const pdfHref = `/sales/${receipt.saleId}/receipt/pdf?format=${receipt.format}`;
  const [message, setMessage] = useState<string | null>(null);
  const filename = `recu-${receipt.saleNumber.replaceAll("/", "-")}.pdf`;
  const title = `Reçu ${receipt.saleNumber}`;

  async function share() {
    try {
      const result = await shareReceiptPdf({
        pdfHref,
        filename,
        title,
        text: receiptTextLines(receipt).join("\n"),
      });
      setMessage(result === "shared" ? "Reçu PDF prêt à être envoyé." : "Le PDF a été téléchargé pour le joindre à votre partage.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setMessage("Impossible de partager le reçu pour le moment.");
    }
  }

  async function print() {
    try {
      await openReceiptPrintPreview({ pdfHref, filename, title });
      setMessage("L’aperçu PDF est ouvert. Utilisez l’icône d’impression du PDF.");
    } catch {
      setMessage("Impossible d’ouvrir l’aperçu PDF. Autorisez les fenêtres contextuelles puis réessayez.");
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" onClick={() => void print()}>
        <Printer className="size-4" aria-hidden="true" />
        Imprimer (PDF)
      </Button>
      <Button type="button" variant="outline" onClick={() => void print()}>
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
      {message ? <p className="w-full text-sm text-muted-foreground" role="status">{message}</p> : null}
    </div>
  );
}
