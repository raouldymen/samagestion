import type { PaymentMethod, PaymentStatus, PurchaseStatus } from "./database";

export type Supplier = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupplierListItem = Supplier & {
  purchasesCount: number;
  purchasesTotal: number;
  amountDue: number;
};

export type SupplierDetail = SupplierListItem & {
  amountPaid: number;
  lastPurchaseAt: string | null;
};

export type PurchaseItem = {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  createdAt: string;
};

export type Purchase = {
  id: string;
  businessId: string;
  supplierId: string | null;
  supplierName: string | null;
  purchaseNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  status: PurchaseStatus;
  notes: string | null;
  purchaseDate: string;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItem[];
};

export type PurchaseListItem = Omit<Purchase, "items"> & {
  itemsCount: number;
};

export type PurchaseCartLine = {
  productId: string;
  name: string;
  unitCost: number;
  stockQuantity: number;
  quantity: number;
};

export type PurchaseProductOption = {
  id: string;
  name: string;
  sku: string | null;
  purchasePrice: number;
  stockQuantity: number;
};

export type PurchaseListFilters = {
  q?: string;
  period?: "today" | "week" | "month" | "custom";
  from?: string;
  to?: string;
  paymentStatus?: PaymentStatus | "all";
  status?: PurchaseStatus | "all";
  supplierId?: string;
  page?: number;
};

export type PurchaseListResult = {
  items: PurchaseListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type PurchaseStats = {
  today: number;
  month: number;
  total: number;
  suppliersCount: number;
};

export type SupplierDebtsSummary = {
  suppliersCount: number;
  totalDue: number;
  items: SupplierListItem[];
};

export type { PaymentMethod, PaymentStatus, PurchaseStatus };
