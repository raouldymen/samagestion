import { requireBusinessSession } from "@/lib/auth/session";
import { periodRange } from "@/lib/sales/constants";
import { isPaymentMethod } from "@/lib/sales/constants";
import { PURCHASE_PAGE_SIZE } from "@/lib/purchases/constants";
import { sanitizeSearch } from "@/lib/products/constants";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod, PaymentStatus, PurchaseStatus } from "@/types/database";
import type {
  Purchase,
  PurchaseItem,
  PurchaseListFilters,
  PurchaseListItem,
  PurchaseListResult,
  PurchaseProductOption,
  PurchaseStats,
  Supplier,
  SupplierDebtsSummary,
  SupplierDetail,
  SupplierListItem,
} from "@/types/purchases";

function asNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  return Number(value);
}

function asPaymentStatus(value: string | null): PaymentStatus {
  if (value === "paid" || value === "partial" || value === "unpaid") {
    return value;
  }

  return "unpaid";
}

function asPaymentMethod(value: string | null): PaymentMethod | null {
  if (value && isPaymentMethod(value)) {
    return value;
  }

  return null;
}

function asPurchaseStatus(value: string | null): PurchaseStatus {
  return value === "cancelled" ? "cancelled" : "completed";
}

function mapSupplier(row: {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): Supplier {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItem(row: {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name: string;
  quantity: string | number;
  unit_cost: string | number;
  total: string | number;
  created_at: string;
}): PurchaseItem {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: asNumber(row.quantity),
    unitCost: asNumber(row.unit_cost),
    total: asNumber(row.total),
    createdAt: row.created_at,
  };
}

export async function getPurchaseStats(): Promise<PurchaseStats> {
  await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_purchase_stats");
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    return { today: 0, month: 0, total: 0, suppliersCount: 0 };
  }

  return {
    today: asNumber(row.today),
    month: asNumber(row.month),
    total: asNumber(row.total),
    suppliersCount: asNumber(row.suppliers_count),
  };
}

export async function listSuppliers(activeOnly = false): Promise<Supplier[]> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  let query = supabase
    .from("suppliers")
    .select("id, business_id, name, phone, email, address, notes, is_active, created_at, updated_at")
    .eq("business_id", session.businessId)
    .order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map(mapSupplier);
}

export async function listSuppliersWithStats(): Promise<SupplierListItem[]> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const [suppliers, purchases] = await Promise.all([
    listSuppliers(),
    supabase
      .from("purchases")
      .select("supplier_id, total, amount_due, due_date, status")
      .eq("business_id", session.businessId)
      .eq("status", "completed"),
  ]);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Dakar" }).format(new Date());
  const stats = new Map<string, { count: number; total: number; due: number; overdue: number; nextDueDate: string | null }>();

  for (const row of purchases.data ?? []) {
    if (!row.supplier_id) {
      continue;
    }

    const current = stats.get(row.supplier_id) ?? { count: 0, total: 0, due: 0, overdue: 0, nextDueDate: null };
    current.count += 1;
    current.total += asNumber(row.total);
    current.due += asNumber(row.amount_due);
    if (asNumber(row.amount_due) > 0 && row.due_date) {
      if (row.due_date < today) current.overdue += asNumber(row.amount_due);
      if (!current.nextDueDate || row.due_date < current.nextDueDate) current.nextDueDate = row.due_date;
    }
    stats.set(row.supplier_id, current);
  }

  return suppliers.map((supplier) => {
    const current = stats.get(supplier.id) ?? { count: 0, total: 0, due: 0, overdue: 0, nextDueDate: null };
    return {
      ...supplier,
      purchasesCount: current.count,
      purchasesTotal: current.total,
      amountDue: current.due,
      overdueAmount: current.overdue,
      nextDueDate: current.nextDueDate,
    };
  });
}

export async function getSupplierDebts(): Promise<SupplierDebtsSummary> {
  const items = (await listSuppliersWithStats()).filter((supplier) => supplier.amountDue > 0)
    .sort((a, b) => (b.overdueAmount ?? 0) - (a.overdueAmount ?? 0) || (a.nextDueDate ?? "9999-12-31").localeCompare(b.nextDueDate ?? "9999-12-31"));

  return {
    suppliersCount: items.length,
    totalDue: items.reduce((sum, item) => sum + item.amountDue, 0),
    items,
  };
}

export async function getSupplier(supplierId: string): Promise<SupplierDetail | null> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, business_id, name, phone, email, address, notes, is_active, created_at, updated_at")
    .eq("id", supplierId)
    .eq("business_id", session.businessId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const { data: purchases } = await supabase
    .from("purchases")
    .select("total, amount_paid, amount_due, purchase_date, created_at, status")
    .eq("business_id", session.businessId)
    .eq("supplier_id", supplierId)
    .eq("status", "completed")
    .order("purchase_date", { ascending: false });

  const completed = purchases ?? [];
  const last = completed[0];

  return {
    ...mapSupplier(data),
    purchasesCount: completed.length,
    purchasesTotal: completed.reduce((sum, row) => sum + asNumber(row.total), 0),
    amountPaid: completed.reduce((sum, row) => sum + asNumber(row.amount_paid), 0),
    amountDue: completed.reduce((sum, row) => sum + asNumber(row.amount_due), 0),
    lastPurchaseAt: last?.created_at ?? last?.purchase_date ?? null,
  };
}

export async function searchPurchaseProducts(query: string): Promise<PurchaseProductOption[]> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const search = sanitizeSearch(query);

  let request = supabase
    .from("products")
    .select("id, name, sku, purchase_price, stock_quantity")
    .eq("business_id", session.businessId)
    .order("name", { ascending: true })
    .limit(12);

  if (search) {
    request = request.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  const { data, error } = await request;

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    purchasePrice: asNumber(row.purchase_price),
    stockQuantity: asNumber(row.stock_quantity),
  }));
}

export async function getPurchaseProduct(productId: string): Promise<PurchaseProductOption | null> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, purchase_price, stock_quantity")
    .eq("id", productId)
    .eq("business_id", session.businessId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    sku: data.sku,
    purchasePrice: asNumber(data.purchase_price),
    stockQuantity: asNumber(data.stock_quantity),
  };
}

export async function listPurchases(filters: PurchaseListFilters = {}): Promise<PurchaseListResult> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PURCHASE_PAGE_SIZE;
  const to = from + PURCHASE_PAGE_SIZE - 1;
  const search = sanitizeSearch(filters.q ?? "");
  const period = filters.period ?? "month";
  const range = periodRange(period, filters.from, filters.to);

  let query = supabase
    .from("purchases")
    .select(
      "id, business_id, supplier_id, purchase_number, subtotal, discount, total, amount_paid, amount_due, payment_status, payment_method, status, notes, purchase_date, due_date, created_by, created_at, updated_at",
      { count: "exact" },
    )
    .eq("business_id", session.businessId)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (range.from) {
    query = query.gte("purchase_date", range.from.slice(0, 10));
  }

  if (range.to) {
    query = query.lte("purchase_date", range.to.slice(0, 10));
  }

  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  } else if (filters.status !== "all") {
    query = query.eq("status", "completed");
  }

  if (filters.supplierId) {
    query = query.eq("supplier_id", filters.supplierId);
  }

  if (search) {
    const { data: matchedSuppliers } = await supabase
      .from("suppliers")
      .select("id")
      .eq("business_id", session.businessId)
      .ilike("name", `%${search}%`);

    const supplierIds = (matchedSuppliers ?? []).map((supplier) => supplier.id);

    if (supplierIds.length > 0) {
      query = query.or(`purchase_number.ilike.%${search}%,supplier_id.in.(${supplierIds.join(",")})`);
    } else {
      query = query.ilike("purchase_number", `%${search}%`);
    }
  }

  const { data, count, error } = await query;

  if (error || !data) {
    return { items: [], total: 0, page, pageSize: PURCHASE_PAGE_SIZE };
  }

  const purchaseIds = data.map((row) => row.id);
  const supplierIds = [...new Set(data.map((row) => row.supplier_id).filter((id): id is string => Boolean(id)))];
  const userIds = [...new Set(data.map((row) => row.created_by))];

  const [{ data: suppliers }, { data: profiles }, { data: itemRows }] = await Promise.all([
    supplierIds.length
      ? supabase.from("suppliers").select("id, name").in("id", supplierIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    userIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    purchaseIds.length
      ? supabase.from("purchase_items").select("purchase_id").in("purchase_id", purchaseIds)
      : Promise.resolve({ data: [] as { purchase_id: string }[] }),
  ]);

  const supplierNames = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier.name]));
  const creatorNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || "Membre"]));
  const itemCounts = new Map<string, number>();

  for (const item of itemRows ?? []) {
    itemCounts.set(item.purchase_id, (itemCounts.get(item.purchase_id) ?? 0) + 1);
  }

  const items: PurchaseListItem[] = data.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_id ? (supplierNames.get(row.supplier_id) ?? null) : null,
    purchaseNumber: row.purchase_number,
    subtotal: asNumber(row.subtotal),
    discount: asNumber(row.discount),
    total: asNumber(row.total),
    amountPaid: asNumber(row.amount_paid),
    amountDue: asNumber(row.amount_due),
    paymentStatus: asPaymentStatus(row.payment_status),
    paymentMethod: asPaymentMethod(row.payment_method),
    status: asPurchaseStatus(row.status),
    notes: row.notes,
    purchaseDate: row.purchase_date,
    dueDate: row.due_date,
    createdBy: row.created_by,
    creatorName: creatorNames.get(row.created_by) || "Membre",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemsCount: itemCounts.get(row.id) ?? 0,
  }));

  return {
    items,
    total: count ?? 0,
    page,
    pageSize: PURCHASE_PAGE_SIZE,
  };
}

export async function getPurchase(purchaseId: string): Promise<Purchase | null> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchases")
    .select(
      "id, business_id, supplier_id, purchase_number, subtotal, discount, total, amount_paid, amount_due, payment_status, payment_method, status, notes, purchase_date, due_date, created_by, created_at, updated_at",
    )
    .eq("id", purchaseId)
    .eq("business_id", session.businessId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const [{ data: items }, { data: supplier }, { data: profile }] = await Promise.all([
    supabase
      .from("purchase_items")
      .select("id, purchase_id, product_id, product_name, quantity, unit_cost, total, created_at")
      .eq("purchase_id", data.id)
      .order("created_at", { ascending: true }),
    data.supplier_id
      ? supabase.from("suppliers").select("name").eq("id", data.supplier_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("full_name").eq("id", data.created_by).maybeSingle(),
  ]);

  return {
    id: data.id,
    businessId: data.business_id,
    supplierId: data.supplier_id,
    supplierName: supplier?.name ?? null,
    purchaseNumber: data.purchase_number,
    subtotal: asNumber(data.subtotal),
    discount: asNumber(data.discount),
    total: asNumber(data.total),
    amountPaid: asNumber(data.amount_paid),
    amountDue: asNumber(data.amount_due),
    paymentStatus: asPaymentStatus(data.payment_status),
    paymentMethod: asPaymentMethod(data.payment_method),
    status: asPurchaseStatus(data.status),
    notes: data.notes,
    purchaseDate: data.purchase_date,
    dueDate: data.due_date,
    createdBy: data.created_by,
    creatorName: profile?.full_name || "Membre",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    items: (items ?? []).map(mapItem),
  };
}

export async function listSupplierPurchases(supplierId: string): Promise<PurchaseListItem[]> {
  const result = await listPurchases({
    supplierId,
    status: "all",
    period: "custom",
    page: 1,
  });

  return result.items;
}
