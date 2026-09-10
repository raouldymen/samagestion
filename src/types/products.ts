import type { ProductUnit, StockMovementType, StockStatus } from "./database";

export type Product = {
  id: string;
  businessId: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStock: number;
  unit: ProductUnit;
  imageUrl: string | null;
  imagePath: string | null;
  isActive: boolean;
  stockStatus: StockStatus;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  businessId: string;
  name: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  businessId: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  referenceId: string | null;
  createdBy: string;
  creatorName: string;
  createdAt: string;
};

export type ProductStats = {
  total: number;
  active: number;
  lowStock: number;
  stockValue: number;
};

export type ProductListFilters = {
  q?: string;
  categoryId?: string;
  stock?: StockStatus | "all";
  status?: "active" | "inactive" | "all";
  page?: number;
};

export type ProductListResult = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
};

export { type ProductUnit, type StockMovementType, type StockStatus };
