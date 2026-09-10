import { getSale } from "@/lib/sales/queries";
import { getBusinessSettingsForReceipt } from "@/lib/settings/queries";
import { isReceiptFormat } from "@/lib/settings/constants";
import type { ReceiptView } from "@/types/receipts";
import type { ReceiptFormat } from "@/types/settings";

export { previewReceiptView } from "@/lib/receipts/preview";

export async function getReceiptView(
  saleId: string,
  formatOverride?: ReceiptFormat,
): Promise<ReceiptView | null> {
  const [sale, settings] = await Promise.all([
    getSale(saleId),
    getBusinessSettingsForReceipt(),
  ]);

  if (!sale) {
    return null;
  }

  const format = formatOverride && isReceiptFormat(formatOverride) ? formatOverride : settings.receiptWidth;

  return {
    saleId: sale.id,
    saleNumber: sale.saleNumber,
    createdAt: sale.createdAt,
    status: sale.status,
    paymentStatus: sale.paymentStatus,
    paymentMethod: sale.paymentMethod,
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    amountPaid: sale.amountPaid,
    amountDue: sale.amountDue,
    notes: sale.notes,
    sellerName: sale.sellerName,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    items: sale.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
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
      receiptMessage: settings.receiptMessage,
      legalInformation: settings.legalInformation,
    },
    format,
  };
}
