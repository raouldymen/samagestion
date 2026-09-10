import type { PaymentMethod, PaymentStatus, SaleStatus } from "./database";
import type { ReceiptFormat, ReceiptSettings } from "./settings";

export type ReceiptLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type ReceiptView = {
  saleId: string;
  saleNumber: string;
  createdAt: string;
  status: SaleStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes: string | null;
  sellerName: string;
  customerName: string | null;
  customerPhone: string | null;
  items: ReceiptLine[];
  businessName: string;
  businessPhone: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  country: string;
  currency: string;
  logoUrl: string | null;
  settings: ReceiptSettings;
  format: ReceiptFormat;
};
