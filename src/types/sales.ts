import type {
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
} from "./database";

export type Customer = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaleItem = {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  discount: number;
  total: number;
  createdAt: string;
};

export type Sale = {
  id: string;
  businessId: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  userId: string;
  sellerName: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  status: SaleStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: SaleItem[];
};

export type SaleListItem = Omit<Sale, "items"> & {
  awaitingCashier?: boolean;
  isReturned?: boolean;
};

export type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  stockQuantity: number;
  quantity: number;
};

export type SaleListFilters = {
  q?: string;
  period?: "today" | "week" | "month" | "custom";
  from?: string;
  to?: string;
  paymentStatus?: PaymentStatus | "all";
  status?: SaleStatus | "pending" | "all";
  paymentMethod?: PaymentMethod | "all";
  page?: number;
};

export type SaleListResult = {
  items: SaleListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type TodaySalesStats = {
  revenue: number;
  salesCount: number;
};

export type SaleProductOption = {
  id: string;
  name: string;
  sku: string | null;
  sellingPrice: number;
  stockQuantity: number;
};

export type { PaymentMethod, PaymentStatus, SaleStatus };
