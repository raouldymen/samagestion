export type Customer = {
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

export type CustomerListItem = Customer & {
  salesCount: number;
  totalPurchased: number;
  totalPaid: number;
  amountDue: number;
};

export type CustomerSaleRow = {
  id: string;
  saleNumber: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: string;
  createdAt: string;
};

export type CustomerDetail = {
  customer: Customer;
  stats: {
    salesCount: number;
    totalPurchased: number;
    totalPaid: number;
    amountDue: number;
  };
  sales: CustomerSaleRow[];
};
