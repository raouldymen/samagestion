import { DEFAULT_RECEIPT_MESSAGE } from "@/lib/settings/constants";
import type { ReceiptView } from "@/types/receipts";
import type { BusinessSettings, ReceiptFormat } from "@/types/settings";

export function previewReceiptView(
  settings: BusinessSettings,
  format?: ReceiptFormat,
): ReceiptView {
  return {
    saleId: "preview",
    saleNumber: `${settings.receiptPrefix}-000125`,
    createdAt: new Date().toISOString(),
    status: "completed",
    paymentStatus: "partial",
    paymentMethod: "wave",
    subtotal: 40000,
    discount: 0,
    total: 40000,
    amountPaid: 25000,
    amountDue: 15000,
    notes: "Aperçu",
    sellerName: "Moussa",
    customerName: "Moussa Diop",
    customerPhone: "77 123 45 67",
    items: [
      { name: "Jean Zara", quantity: 2, unitPrice: 15000, total: 30000 },
      { name: "Chemise", quantity: 1, unitPrice: 10000, total: 10000 },
    ],
    businessName: settings.name,
    businessPhone: settings.phone,
    businessAddress: [settings.address, settings.city].filter(Boolean).join(", ") || settings.address,
    businessCity: settings.city,
    country: settings.country,
    currency: settings.currency,
    logoUrl: settings.showLogo ? settings.logoUrl : null,
    settings: {
      receiptPrefix: settings.receiptPrefix,
      purchasePrefix: settings.purchasePrefix,
      receiptWidth: settings.receiptWidth,
      showLogo: settings.showLogo,
      showPhone: settings.showPhone,
      showAddress: settings.showAddress,
      showCustomer: settings.showCustomer,
      showSeller: settings.showSeller,
      showNotes: settings.showNotes,
      showMessage: settings.showMessage,
      receiptMessage: settings.receiptMessage || DEFAULT_RECEIPT_MESSAGE,
      legalInformation: settings.legalInformation,
    },
    format: format ?? settings.receiptWidth,
  };
}
