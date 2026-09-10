import { requireBusinessSession } from "@/lib/auth/session";
import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_PAGE_SIZE,
  getStockStatus,
  sanitizeSearch,
} from "@/lib/products/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  Product,
  ProductListFilters,
  ProductListResult,
  ProductStats,
  StockMovement,
} from "@/types/products";
import type { ProductUnit, StockStatus } from "@/types/database";

function asNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  return Number(value);
}

function asStockStatus(value: string | null | undefined, quantity: number, minimum: number): StockStatus {
  if (value === "out" || value === "low" || value === "in_stock") {
    return value;
  }

  return getStockStatus(quantity, minimum);
}

function asUnit(value: string | null | undefined): ProductUnit {
  const units: ProductUnit[] = ["piece", "kg", "g", "litre", "mètre", "carton", "paquet", "autre"];
  return units.includes(value as ProductUnit) ? (value as ProductUnit) : "piece";
}

async function signImagePath(path: string | null) {
  if (!path) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);

  return data?.signedUrl ?? null;
}

type ProductRow = {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  purchase_price: string | number;
  selling_price: string | number;
  stock_quantity: string | number;
  minimum_stock: string | number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stock_status?: string | null;
};

const PRODUCT_COLUMNS =
  "id, business_id, category_id, name, sku, description, purchase_price, selling_price, stock_quantity, minimum_stock, unit, image_url, is_active, created_at, updated_at, stock_status";

async function categoryNamesById(ids: Array<string | null>) {
  const categoryIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];

  if (categoryIds.length === 0) {
    return new Map<string, string>();
  }

  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name").in("id", categoryIds);

  return new Map((data ?? []).map((category) => [category.id, category.name]));
}

async function mapProduct(row: ProductRow, categoryName: string | null): Promise<Product> {
  const quantity = asNumber(row.stock_quantity);
  const minimum = asNumber(row.minimum_stock);

  return {
    id: row.id,
    businessId: row.business_id,
    categoryId: row.category_id,
    categoryName,
    name: row.name,
    sku: row.sku,
    description: row.description,
    purchasePrice: asNumber(row.purchase_price),
    sellingPrice: asNumber(row.selling_price),
    stockQuantity: quantity,
    minimumStock: minimum,
    unit: asUnit(row.unit),
    imagePath: row.image_url,
    imageUrl: await signImagePath(row.image_url),
    isActive: row.is_active,
    stockStatus: asStockStatus(row.stock_status, quantity, minimum),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProductStats(): Promise<ProductStats> {
  await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_product_stats");
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    return { total: 0, active: 0, lowStock: 0, stockValue: 0 };
  }

  return {
    total: asNumber(row.total),
    active: asNumber(row.active),
    lowStock: asNumber(row.low_stock),
    stockValue: asNumber(row.stock_value),
  };
}

export async function listCategories(): Promise<Category[]> {
  await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_categories_with_counts");
  const rows = Array.isArray(data) ? data : data ? [data] : [];

  if (error) {
    return [];
  }

  return rows.map((category) => ({
    id: category.id,
    businessId: category.business_id,
    name: category.name,
    productCount: asNumber(category.product_count),
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  }));
}

export async function listProducts(filters: ProductListFilters = {}): Promise<ProductListResult> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PRODUCT_PAGE_SIZE;
  const to = from + PRODUCT_PAGE_SIZE - 1;
  const search = sanitizeSearch(filters.q ?? "");

  let query = supabase
    .from("products")
    .select(PRODUCT_COLUMNS, { count: "exact" })
    .eq("business_id", session.businessId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters.stock && filters.stock !== "all") {
    query = query.eq("stock_status", filters.stock);
  }

  const status = filters.status ?? "active";

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, count, error } = await query;

  if (error || !data) {
    return { items: [], total: 0, page, pageSize: PRODUCT_PAGE_SIZE };
  }

  const names = await categoryNamesById(data.map((row) => row.category_id));
  const items = await Promise.all(
    data.map((row) =>
      mapProduct(row, row.category_id ? (names.get(row.category_id) ?? null) : null),
    ),
  );

  return {
    items,
    total: count ?? 0,
    page,
    pageSize: PRODUCT_PAGE_SIZE,
  };
}

export async function getProduct(productId: string): Promise<Product | null> {
  const session = await requireBusinessSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", productId)
    .eq("business_id", session.businessId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const names = await categoryNamesById([data.category_id]);

  return mapProduct(
    data,
    data.category_id ? (names.get(data.category_id) ?? null) : null,
  );
}

export async function listStockMovements(productId: string): Promise<StockMovement[]> {
  const session = await requireBusinessSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stock_movements")
    .select("id, business_id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, created_by, created_at")
    .eq("product_id", productId)
    .eq("business_id", session.businessId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  const userIds = [...new Set(data.map((row) => row.created_by))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

  return data.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    productId: row.product_id,
    type: row.type,
    quantity: asNumber(row.quantity),
    previousStock: asNumber(row.previous_stock),
    newStock: asNumber(row.new_stock),
    reason: row.reason,
    referenceId: row.reference_id,
    createdBy: row.created_by,
    creatorName: names.get(row.created_by) || "Membre",
    createdAt: row.created_at,
  }));
}
