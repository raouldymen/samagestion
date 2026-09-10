import {
  formatReceiptAmount,
  formatReceiptDate,
  receiptCustomerName,
  receiptModeLabel,
  receiptPaymentLabel,
} from "@/lib/receipts/format";
import type { ReceiptView } from "@/types/receipts";

function toWinAnsi(value: string) {
  return value
    .replaceAll("€", "EUR")
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("é", "e")
    .replaceAll("è", "e")
    .replaceAll("ê", "e")
    .replaceAll("ë", "e")
    .replaceAll("à", "a")
    .replaceAll("â", "a")
    .replaceAll("ù", "u")
    .replaceAll("û", "u")
    .replaceAll("ô", "o")
    .replaceAll("î", "i")
    .replaceAll("ï", "i")
    .replaceAll("ç", "c")
    .replaceAll("É", "E")
    .replaceAll("È", "E")
    .replaceAll("À", "A")
    .replaceAll("Ç", "C")
    .replaceAll("œ", "oe")
    .replaceAll("Œ", "OE");
}

function pdfEscape(value: string) {
  return toWinAnsi(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function pagePoints(format: ReceiptView["format"]) {
  if (format === "58mm") {
    return { width: 164, margin: 10, font: 8, line: 11 };
  }

  if (format === "80mm") {
    return { width: 226, margin: 12, font: 9, line: 12 };
  }

  return { width: 595, margin: 40, font: 11, line: 16 };
}

export function receiptTextLines(receipt: ReceiptView) {
  const { settings } = receipt;
  const lines: string[] = [];

  if (receipt.status === "cancelled") {
    lines.push("VENTE ANNULEE");
    lines.push("");
  }

  lines.push(receipt.businessName);

  if (settings.showPhone && receipt.businessPhone) {
    lines.push(receipt.businessPhone);
  }

  if (settings.showAddress && receipt.businessAddress) {
    lines.push(receipt.businessAddress);
  }

  lines.push("--------------------------------");
  lines.push("RECU");
  lines.push(`N ${receipt.saleNumber}`);
  lines.push(`Date : ${formatReceiptDate(receipt.createdAt)}`);

  if (settings.showSeller) {
    lines.push(`Caissier : ${receipt.sellerName}`);
  }

  if (settings.showCustomer) {
    lines.push("Client :");
    lines.push(receiptCustomerName(receipt.customerName));
    if (receipt.customerPhone) {
      lines.push(receipt.customerPhone);
    }
  }

  lines.push("--------------------------------");

  for (const item of receipt.items) {
    lines.push(item.name);
    lines.push(
      `${item.quantity} x ${formatReceiptAmount(item.unitPrice)} = ${formatReceiptAmount(item.total)}`,
    );
  }

  lines.push("--------------------------------");
  lines.push(`Sous-total     ${formatReceiptAmount(receipt.subtotal)}`);
  lines.push(`Remise         ${formatReceiptAmount(receipt.discount)}`);
  lines.push(`TOTAL          ${formatReceiptAmount(receipt.total)} ${receipt.currency === "XOF" ? "FCFA" : receipt.currency}`);
  lines.push(`Paye           ${formatReceiptAmount(receipt.amountPaid)}`);
  lines.push(`Reste          ${formatReceiptAmount(receipt.amountDue)}`);
  lines.push(`Mode : ${receiptModeLabel(receipt.paymentMethod)}`);
  lines.push(receiptPaymentLabel(receipt.paymentStatus, receipt.status));

  if (settings.showNotes && receipt.notes) {
    lines.push("");
    lines.push(receipt.notes);
  }

  if (settings.legalInformation.trim()) {
    lines.push("");
    for (const legal of settings.legalInformation.split("\n")) {
      if (legal.trim()) {
        lines.push(legal.trim());
      }
    }
  }

  if (settings.showMessage && settings.receiptMessage.trim()) {
    lines.push("--------------------------------");
    for (const message of settings.receiptMessage.split("\n")) {
      if (message.trim()) {
        lines.push(message.trim());
      }
    }
  }

  return lines;
}

export function buildReceiptPdf(receipt: ReceiptView): Uint8Array {
  const page = pagePoints(receipt.format);
  const lines = receiptTextLines(receipt);
  const height = page.margin * 2 + lines.length * page.line + 24;
  const pageHeight = Math.max(height, receipt.format === "A4" ? 842 : height);
  const content = lines
    .map((line, index) => {
      const y = pageHeight - page.margin - (index + 1) * page.line;
      return `BT /F1 ${page.font} Tf ${page.margin} ${y} Td (${pdfEscape(line)}) Tj ET`;
    })
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];

  let offset = "%PDF-1.4\n".length;
  const xref = [0];
  const chunks = ["%PDF-1.4\n"];

  objects.forEach((object, index) => {
    const body = `${index + 1} 0 obj\n${object}\nendobj\n`;
    xref.push(offset);
    chunks.push(body);
    offset += body.length;
  });

  const xrefStart = offset;
  const xrefTable = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...xref.slice(1).map((value) => `${String(value).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefStart),
    "%%EOF",
  ].join("\n");

  chunks.push(xrefTable);
  return new TextEncoder().encode(chunks.join(""));
}
