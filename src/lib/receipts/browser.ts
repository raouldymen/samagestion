type ReceiptPdfOptions = {
  pdfHref: string;
  filename: string;
  title: string;
  text?: string;
};

async function receiptPdfFile({ pdfHref, filename }: Pick<ReceiptPdfOptions, "pdfHref" | "filename">) {
  const response = await fetch(pdfHref);

  if (!response.ok) {
    throw new Error("Impossible de préparer le reçu PDF.");
  }

  const blob = await response.blob();
  return new File([blob], filename, { type: "application/pdf" });
}

/** Ouvre le même PDF que celui téléchargé afin de l'imprimer depuis son aperçu. */
export async function openReceiptPrintPreview(options: ReceiptPdfOptions) {
  const preview = window.open("", "_blank");

  if (!preview) {
    throw new Error("Autorisez les fenêtres contextuelles pour imprimer le reçu.");
  }

  preview.document.title = options.title;
  preview.document.body.textContent = "Préparation de l’aperçu PDF…";

  try {
    const file = await receiptPdfFile(options);
    const url = URL.createObjectURL(file);
    preview.location.replace(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    preview.close();
    throw error;
  }
}

/** Partage le PDF du reçu comme pièce jointe ; télécharge le fichier si ce n'est pas possible. */
export async function shareReceiptPdf(options: ReceiptPdfOptions) {
  const file = await receiptPdfFile(options);
  const shareData = { title: options.title, text: options.text, files: [file] };

  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share(shareData);
    return "shared" as const;
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = options.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return "downloaded" as const;
}
