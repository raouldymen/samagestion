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
    // Intl utilise des espaces insécables pour les milliers (ex. 75 000).
    // Les polices PDF standard ne les interprètent pas correctement.
    .replaceAll("\u202F", " ")
    .replaceAll("\u00A0", " ")
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
    return { width: 164, margin: 10, font: 7, line: 10 };
  }

  if (format === "80mm") {
    return { width: 226, margin: 12, font: 8, line: 12 };
  }

  return { width: 595, margin: 40, font: 10, line: 16 };
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
  const narrowLineLength = receipt.format === "58mm" ? 30 : receipt.format === "80mm" ? 42 : 78;
  const countWrappedLines = (value: string | null | undefined) => {
    if (!value?.trim()) {
      return 0;
    }

    return value.split("\n").reduce((count, line) => {
      const words = line.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        return count;
      }

      let rowLength = 0;
      let rows = 1;
      for (const word of words) {
        if (rowLength > 0 && rowLength + word.length + 1 > narrowLineLength) {
          rows += 1;
          rowLength = word.length;
        } else {
          rowLength += (rowLength ? 1 : 0) + word.length;
        }
      }
      return count + rows;
    }, 0);
  };
  const itemLines = receipt.items.reduce(
    (total, item) => total + Math.max(1, Math.ceil(item.name.length / (receipt.format === "58mm" ? 11 : receipt.format === "80mm" ? 17 : 42))),
    0,
  );
  const addressLines = receipt.settings.showAddress ? countWrappedLines(receipt.businessAddress) : 0;
  const notesLines = receipt.settings.showNotes ? countWrappedLines(receipt.notes) : 0;
  const legalLines = countWrappedLines(receipt.settings.legalInformation);
  const messageLines = receipt.settings.showMessage ? countWrappedLines(receipt.settings.receiptMessage) : 0;
  const optionalLines =
    (receipt.status === "cancelled" ? 2 : 0) +
    (receipt.settings.showPhone && receipt.businessPhone ? 1 : 0) +
    addressLines +
    (receipt.settings.showSeller ? 1 : 0) +
    (receipt.settings.showCustomer ? 2 + (receipt.customerPhone ? 1 : 0) : 0) +
    notesLines +
    legalLines +
    messageLines;
  // La marge de sécurité évite de couper les longues ventes sur les rouleaux thermiques.
  const height = page.margin * 2 + 260 + (itemLines + optionalLines) * page.line + 40;
  const pageHeight = Math.max(height, receipt.format === "A4" ? 842 : height);
  const contentWidth = page.width - page.margin * 2;
  const commands: string[] = [];
  let y = pageHeight - page.margin;

  const textWidth = (value: string, size: number) => value.length * size * 0.52;
  const drawText = (value: string, x: number, size = page.font, bold = false) => {
    commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(value)}) Tj ET`);
  };
  const drawCentered = (value: string, size = page.font, bold = false) => {
    drawText(value, Math.max(page.margin, (page.width - textWidth(value, size)) / 2), size, bold);
  };
  const drawRight = (value: string, x: number, size = page.font, bold = false) => {
    drawText(value, x - textWidth(value, size), size, bold);
  };
  const next = (lines = 1) => {
    y -= page.line * lines;
  };
  const divider = () => {
    commands.push(`q [2 2] 0 d ${page.margin} ${y.toFixed(2)} m ${(page.width - page.margin).toFixed(2)} ${y.toFixed(2)} l S Q`);
    next(1);
  };
  const wrap = (value: string, max: number) => {
    const words = value.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > max && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };

  if (receipt.status === "cancelled") {
    commands.push(`${page.margin} ${(y - page.font - 2).toFixed(2)} ${contentWidth.toFixed(2)} ${(page.font + 7).toFixed(2)} re S`);
    next(1);
    drawCentered("VENTE ANNULÉE", page.font + 1, true);
    next(2);
  }

  drawCentered(receipt.businessName.toUpperCase(), page.font + 2, true);
  next(1.35);
  if (receipt.settings.showPhone && receipt.businessPhone) {
    drawCentered(receipt.businessPhone, page.font - 1);
    next(1);
  }
  if (receipt.settings.showAddress && receipt.businessAddress) {
    for (const line of wrap(receipt.businessAddress, receipt.format === "A4" ? 68 : 30)) {
      drawCentered(line, page.font - 1);
      next(1);
    }
  }
  divider();
  drawCentered("REÇU", page.font + 1, true);
  next(1.2);
  drawCentered(`N° ${receipt.saleNumber}`, page.font, true);
  next(1);
  drawCentered(`Date : ${formatReceiptDate(receipt.createdAt)}`, page.font - 1);
  next(1);
  if (receipt.settings.showSeller) {
    drawCentered(`Caissier : ${receipt.sellerName}`, page.font - 1);
    next(1);
  }
  next(0.5);
  drawCentered(receiptPaymentLabel(receipt.paymentStatus, receipt.status), page.font - 0.5, true);
  next(1.5);
  if (receipt.settings.showCustomer) {
    drawText("Client :", page.margin, page.font - 1);
    next(1);
    drawText(receiptCustomerName(receipt.customerName), page.margin, page.font - 1, true);
    next(1);
    if (receipt.customerPhone) {
      drawText(receipt.customerPhone, page.margin, page.font - 1);
      next(1);
    }
  }
  divider();

  const productRight = page.margin + contentWidth * 0.42;
  const quantityRight = page.margin + contentWidth * 0.55;
  const priceRight = page.margin + contentWidth * 0.76;
  const totalRight = page.width - page.margin;
  const itemFont = Math.max(6, page.font - 1);
  drawText("Produit", page.margin, itemFont, true);
  drawRight("Qté", quantityRight, itemFont, true);
  drawRight("Prix", priceRight, itemFont, true);
  drawRight("Total", totalRight, itemFont, true);
  next(0.55);
  commands.push(`${page.margin} ${y.toFixed(2)} m ${(page.width - page.margin).toFixed(2)} ${y.toFixed(2)} l S`);
  next(0.8);
  const maxProductChars = receipt.format === "58mm" ? 11 : receipt.format === "80mm" ? 17 : 42;
  for (const item of receipt.items) {
    const names = wrap(item.name, maxProductChars);
    names.forEach((name, index) => {
      drawText(name, page.margin, itemFont);
      if (index === 0) {
        drawRight(String(item.quantity), quantityRight, itemFont);
        drawRight(formatReceiptAmount(item.unitPrice), priceRight, itemFont);
        drawRight(formatReceiptAmount(item.total), totalRight, itemFont);
      }
      next(1);
    });
  }
  divider();
  const amountRow = (label: string, amount: string, bold = false) => {
    drawText(label, page.margin, page.font, bold);
    drawRight(amount, page.width - page.margin, page.font, bold);
    next(1);
  };
  amountRow("Sous-total", formatReceiptAmount(receipt.subtotal));
  amountRow("Remise", formatReceiptAmount(receipt.discount));
  amountRow("TOTAL", `${formatReceiptAmount(receipt.total)} ${receipt.currency === "XOF" ? "FCFA" : receipt.currency}`, true);
  next(0.5);
  amountRow("Payé", `${formatReceiptAmount(receipt.amountPaid)} ${receipt.currency === "XOF" ? "FCFA" : receipt.currency}`);
  amountRow("Reste", `${formatReceiptAmount(receipt.amountDue)} ${receipt.currency === "XOF" ? "FCFA" : receipt.currency}`);
  amountRow("Mode", receiptModeLabel(receipt.paymentMethod));
  if (receipt.settings.showNotes && receipt.notes) {
    next(0.5);
    for (const line of wrap(receipt.notes, receipt.format === "A4" ? 78 : 38)) {
      drawText(line, page.margin, page.font - 1);
      next(1);
    }
  }
  divider();
  if (receipt.settings.legalInformation.trim()) {
    for (const line of receipt.settings.legalInformation.split("\n").filter((line) => line.trim())) {
      drawText(line.trim(), page.margin, page.font - 1);
      next(1);
    }
    next(0.5);
  }
  if (receipt.settings.showMessage && receipt.settings.receiptMessage.trim()) {
    for (const line of receipt.settings.receiptMessage.split("\n").filter((line) => line.trim())) {
      drawCentered(line.trim(), page.font - 1);
      next(1);
    }
  }

  const content = commands.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
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
