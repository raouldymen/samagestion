import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { sanitizeSearch } from "@/lib/products/constants";
import { periodRange, SALE_PAGE_SIZE } from "@/lib/sales/constants";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod, PaymentStatus, SaleStatus } from "@/types/database";
import type {
  Customer,
  Sale,
  SaleItem,
  SaleListFilters,
  SaleListItem,
  SaleListResult,
  SaleProductOption,
  TodaySalesStats,
} from "@/types/sales";

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
  if (
    value === "cash" ||
    value === "wave" ||
    value === "orange_money" ||
    value === "bank" ||
    value === "card" ||
    value === "other"
  ) {
    return value;
  }

  return null;
}

function asSaleStatus(value: string | null): SaleStatus {
  return value === "cancelled" ? "cancelled" : "completed";
}

function mapItem(row: {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: string | number;
  unit_price: string | number;
  purchase_price: string | number;
  discount: string | number;
  total: string | number;
  created_at: string;
}): SaleItem {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: asNumber(row.quantity),
    unitPrice: asNumber(row.unit_price),
    purchasePrice: asNumber(row.purchase_price),
    discount: asNumber(row.discount),
    total: asNumber(row.total),
    createdAt: row.created_at,
  };
}

export async function getTodaySalesStats(): Promise<TodaySalesStats> {
  await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_today_sales_stats");
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    return { revenue: 0, salesCount: 0 };
  }

  return {
    revenue: asNumber(row.revenue),
    salesCount: asNumber(row.sales_count),
  };
}

export async function listCustomers(): Promise<Customer[]> {
  const { listActiveCustomers } = await import("@/lib/customers/queries");
  return listActiveCustomers();
}

export async function getCustomerDetail(customerId: string) {
  const { getCustomerDetail: getDetail } = await import("@/lib/customers/queries");
  const detail = await getDetail(customerId);
  if (!detail) {
    return null;
  }
  return {
    customer: {
      id: detail.customer.id,
      businessId: detail.customer.businessId,
      name: detail.customer.name,
      phone: detail.customer.phone,
      createdAt: detail.customer.createdAt,
      updatedAt: detail.customer.updatedAt,
    },
    due: detail.stats.amountDue,
    sales: detail.sales.map((row) => ({
      id: row.id,
      saleNumber: row.saleNumber,
      total: row.total,
      amountDue: row.amountDue,
      createdAt: row.createdAt,
    })),
  };
}

export async function searchSaleProducts(query: string): Promise<SaleProductOption[]> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const search = sanitizeSearch(query);

  let request = supabase
    .from("products")
    .select("id, name, sku, selling_price, stock_quantity")
    .eq("business_id", session.businessId)
    .eq("is_active", true)
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
    sellingPrice: asNumber(row.selling_price),
    stockQuantity: asNumber(row.stock_quantity),
  }));
}

export async function listSales(filters: SaleListFilters = {}): Promise<SaleListResult> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * SALE_PAGE_SIZE;
  const to = from + SALE_PAGE_SIZE - 1;
  const search = sanitizeSearch(filters.q ?? "");
  const period = filters.period ?? "month";
  const range = periodRange(period, filters.from, filters.to);

  let query = supabase
    .from("sales")
    .select(
      "id, business_id, customer_id, user_id, sale_number, subtotal, discount, total, amount_paid, amount_due, payment_status, payment_method, status, notes, created_at, updated_at",
      { count: "exact" },
    )
    .eq("business_id", session.businessId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (!can(session.role, "sales.list_all")) {
    query = query.eq("user_id", session.user.id);
  }

  if (range.from) {
    query = query.gte("created_at", range.from);
  }

  if (range.to) {
    query = query.lte("created_at", range.to);
  }

  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  } else if (filters.status !== "all") {
    query = query.eq("status", "completed");
  }

  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    query = query.eq("payment_method", filters.paymentMethod);
  }

  if (search) {
    const { data: matchedCustomers } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", session.businessId)
      .ilike("name", `%${search}%`);

    const customerIds = (matchedCustomers ?? []).map((customer) => customer.id);

    if (customerIds.length > 0) {
      query = query.or(`sale_number.ilike.%${search}%,customer_id.in.(${customerIds.join(",")})`);
    } else {
      query = query.ilike("sale_number", `%${search}%`);
    }
  }

  const { data, count, error } = await query;

  if (error || !data) {
    return { items: [], total: 0, page, pageSize: SALE_PAGE_SIZE };
  }

  const customerIds = [...new Set(data.map((row) => row.customer_id).filter((id): id is string => Boolean(id)))];
  const userIds = [...new Set(data.map((row) => row.user_id))];

  const [{ data: customers }, { data: profiles }] = await Promise.all([
    customerIds.length
      ? supabase.from("customers").select("id, name").in("id", customerIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    userIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const customerNames = new Map((customers ?? []).map((customer) => [customer.id, customer.name]));
  const sellerNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || "Membre"]));

  const items: SaleListItem[] = data.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    customerName: row.customer_id ? (customerNames.get(row.customer_id) ?? null) : null,
    customerPhone: null,
    userId: row.user_id,
    sellerName: sellerNames.get(row.user_id) || "Membre",
    saleNumber: row.sale_number,
    subtotal: asNumber(row.subtotal),
    discount: asNumber(row.discount),
    total: asNumber(row.total),
    amountPaid: asNumber(row.amount_paid),
    amountDue: asNumber(row.amount_due),
    paymentStatus: asPaymentStatus(row.payment_status),
    paymentMethod: asPaymentMethod(row.payment_method),
    status: asSaleStatus(row.status),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    items,
    total: count ?? 0,
    page,
    pageSize: SALE_PAGE_SIZE,
  };
}

export async function getSale(saleId: string): Promise<Sale | null> {
  const session = await requireBusinessSession();
  const supabase = await createClient();

  let saleQuery = supabase
    .from("sales")
    .select(
      "id, business_id, customer_id, user_id, sale_number, subtotal, discount, total, amount_paid, amount_due, payment_status, payment_method, status, notes, created_at, updated_at",
    )
    .eq("id", saleId)
    .eq("business_id", session.businessId);

  if (!can(session.role, "sales.list_all")) {
    saleQuery = saleQuery.eq("user_id", session.user.id);
  }

  const { data, error } = await saleQuery.maybeSingle();

  if (error || !data) {
    return null;
  }

  const [{ data: items }, { data: customer }, { data: profile }] = await Promise.all([
    supabase
      .from("sale_items")
      .select("id, sale_id, product_id, product_name, quantity, unit_price, purchase_price, discount, total, created_at")
      .eq("sale_id", data.id)
      .order("created_at", { ascending: true }),
    data.customer_id
      ? supabase.from("customers").select("name, phone").eq("id", data.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("full_name").eq("id", data.user_id).maybeSingle(),
  ]);

  return {
    id: data.id,
    businessId: data.business_id,
    customerId: data.customer_id,
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
    userId: data.user_id,
    sellerName: profile?.full_name || "Membre",
    saleNumber: data.sale_number,
    subtotal: asNumber(data.subtotal),
    discount: asNumber(data.discount),
    total: asNumber(data.total),
    amountPaid: asNumber(data.amount_paid),
    amountDue: asNumber(data.amount_due),
    paymentStatus: asPaymentStatus(data.payment_status),
    paymentMethod: asPaymentMethod(data.payment_method),
    status: asSaleStatus(data.status),
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    items: (items ?? []).map(mapItem),
  };
}
