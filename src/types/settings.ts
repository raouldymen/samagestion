import type { AppLocale, ReceiptWidth } from "./database";

export type ReceiptFormat = ReceiptWidth;

export type ReceiptSettings = {
  receiptPrefix: string;
  purchasePrefix: string;
  receiptWidth: ReceiptFormat;
  showLogo: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showCustomer: boolean;
  showSeller: boolean;
  showNotes: boolean;
  showMessage: boolean;
  receiptMessage: string;
  legalInformation: string;
};

export type BusinessPreferences = {
  locale: AppLocale;
  dateFormat: string;
  numberFormat: string;
  timezone: string;
};

export type BusinessSettings = ReceiptSettings &
  BusinessPreferences & {
    businessId: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    country: string;
    currency: string;
    logoPath: string | null;
    logoUrl: string | null;
  };
