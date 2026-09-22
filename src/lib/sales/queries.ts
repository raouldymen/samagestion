import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { sanitizeSearch } from "@/lib/products/constants";
import { periodRange, SALE_PAGE_SIZE } from "@/lib/sales/constants";
import { createClient } from "@/lib/supabase/server";
import type { Json, PaymentMethod, PaymentStatus, SaleStatus } from "@/types/database";
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

export type CashierQueuedSale = {
  id: string;
  sellerId: string | null;
  sellerName: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number; stockQuantity: number; total: number }>;
  subtotal: number;
  discount: number;
  notes: string | null;
  createdAt: string;
};

export type CashierCheckoutSummary = {
  count: number;
  total: number;
  expensesTotal: number;
  netTotal: number;
  byMethod: Record<string, number>;
  sales: Array<{ id: string; saleNumber: string; amountPaid: number; paymentMethod: string | null; createdAt: string }>;
  expenses: Array<{ id: string; description: string; amount: number; paymentMethod: string | null }>;
};

export type CashierExpenseSummary = {
  count: number;
  total: number;
  cashTotal: number;
  items: Array<{ id: string; description: string; amount: number; paymentMethod: string; createdAt: string }>;
};

export type OwnerSaleCollection = {
  id: string;
  saleNumber: string;
  amount: number;
  paymentMethod: string | null;
  ownerName: string;
  createdAt: string;
};

export type CashierTodaySale = {
  id: string;
  saleNumber: string;
  sellerName: string;
  amountPaid: number;
  paymentStatus: string;
  createdAt: string;
};

export type CashierClosureSummary = {
  cashDate: string;
  cashSales: number;
  cashExpenses: number;
  expectedAmount: number;
  closed: boolean;
  countedAmount: number | null;
  differenceAmount: number | null;
  closedAt: string | null;
};

export type CashierDailyClosure = {
  id: string;
  cashDate: string;
  cashierName: string;
  expectedAmount: number;
  countedAmount: number;
  differenceAmount: number;
  notes: string | null;
  closedAt: string;
};

type PendingCashierSaleRow = {
  id?: Json;
  sellerId?: Json;
  sellerName?: Json;
  customerId?: Json;
  customerName?: Json;
  customerPhone?: Json;
  items?: Json;
  subtotal?: Json;
  discount?: Json;
  total?: Json;
  notes?: Json;
  createdAt?: Json;
};

function queueItems(value: Json | undefined) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const line = item as Record<string, Json | undefined>;
    const productId = String(line.productId ?? "");
    if (!productId) return [];
    return [{
      productId,
      name: String(line.name ?? "Produit"),
      quantity: queueNumber(line.quantity),
      unitPrice: queueNumber(line.unitPrice),
      stockQuantity: queueNumber(line.stockQuantity),
      total: queueNumber(line.total),
    }];
  });
}

function queueNumber(value: Json | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function listCashierSaleQueue(): Promise<CashierQueuedSale[]> {
  const session = await requireBusinessSession();
  if (!can(session.role, "sales.create") || session.role === "seller") {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_cashier_sale_queue");
  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const row = raw as Record<string, Json | undefined>;
    const rawItems = Array.isArray(row.items) ? row.items : [];
    return [{
      id: String(row.id ?? ""),
      sellerId: row.sellerId ? String(row.sellerId) : null,
      sellerName: String(row.sellerName ?? "Vendeur"),
      customerId: row.customerId ? String(row.customerId) : null,
      customerName: row.customerName ? String(row.customerName) : null,
      customerPhone: row.customerPhone ? String(row.customerPhone) : null,
      items: rawItems.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const line = item as Record<string, Json | undefined>;
        return [{
          productId: String(line.productId ?? ""),
          name: String(line.name ?? "Produit"),
          quantity: queueNumber(line.quantity),
          unitPrice: queueNumber(line.unitPrice),
          stockQuantity: queueNumber(line.stockQuantity),
          total: queueNumber(line.total),
        }];
      }),
      subtotal: queueNumber(row.subtotal),
      discount: queueNumber(row.discount),
      notes: row.notes ? String(row.notes) : null,
      createdAt: String(row.createdAt ?? ""),
    }];
  });
}

export async function isCashierCheckoutRequired() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("cashier_checkout_is_required");
  return Boolean(data);
}

export async function getCashierCheckoutSummary(): Promise<CashierCheckoutSummary> {
  const empty = { count: 0, total: 0, expensesTotal: 0, netTotal: 0, byMethod: {}, sales: [], expenses: [] };
  const session = await requireBusinessSession();
  if (!can(session.role, "sales.create") || session.role === "seller") return empty;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cashier_checkout_summary");
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return empty;
  const row = data as Record<string, Json | undefined>;
  const methods = row.byMethod && typeof row.byMethod === "object" && !Array.isArray(row.byMethod)
    ? Object.fromEntries(Object.entries(row.byMethod).map(([key, value]) => [key, queueNumber(value)]))
    : {};
  const sales = Array.isArray(row.sales) ? row.sales.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const sale = item as Record<string, Json | undefined>;
    return [{
      id: String(sale.id ?? ""), saleNumber: String(sale.saleNumber ?? ""),
      amountPaid: queueNumber(sale.amountPaid),
      paymentMethod: sale.paymentMethod ? String(sale.paymentMethod) : null,
      createdAt: String(sale.createdAt ?? ""),
    }];
  }) : [];
  const expenses = Array.isArray(row.expenses) ? row.expenses.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const expense = item as Record<string, Json | undefined>;
    return [{ id: String(expense.id ?? ""), description: String(expense.description ?? "Dépense"), amount: queueNumber(expense.amount), paymentMethod: expense.paymentMethod ? String(expense.paymentMethod) : null }];
  }) : [];
  return { count: queueNumber(row.count), total: queueNumber(row.total), expensesTotal: queueNumber(row.expensesTotal), netTotal: queueNumber(row.netTotal), byMethod: methods, sales, expenses };
}

export async function getCashierExpenseSummary(): Promise<CashierExpenseSummary> {
  const empty = { count: 0, total: 0, cashTotal: 0, items: [] };
  const session = await requireBusinessSession();
  if (!can(session.role, "sales.create") || session.role === "seller") return empty;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cashier_expenses_summary");
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return empty;
  const row = data as Record<string, Json | undefined>;
  const items = Array.isArray(row.items) ? row.items.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const expense = item as Record<string, Json | undefined>;
    return [{ id: String(expense.id ?? ""), description: String(expense.description ?? "Dépense"), amount: queueNumber(expense.amount), paymentMethod: String(expense.paymentMethod ?? "other"), createdAt: String(expense.createdAt ?? "") }];
  }) : [];
  return { count: queueNumber(row.count), total: queueNumber(row.total), cashTotal: queueNumber(row.cashTotal), items };
}

export async function getCashierClosureSummary(): Promise<CashierClosureSummary> {
  const empty = { cashDate: "", cashSales: 0, cashExpenses: 0, expectedAmount: 0, closed: false, countedAmount: null, differenceAmount: null, closedAt: null };
  const session = await requireBusinessSession();
  if (session.role !== "cashier") return empty;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cashier_closure_summary");
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return empty;
  const row = data as Record<string, Json | undefined>;
  return {
    cashDate: String(row.cashDate ?? ""),
    cashSales: queueNumber(row.cashSales), cashExpenses: queueNumber(row.cashExpenses), expectedAmount: queueNumber(row.expectedAmount),
    closed: row.closed === true,
    countedAmount: row.countedAmount === null || row.countedAmount === undefined ? null : queueNumber(row.countedAmount),
    differenceAmount: row.differenceAmount === null || row.differenceAmount === undefined ? null : queueNumber(row.differenceAmount),
    closedAt: row.closedAt ? String(row.closedAt) : null,
  };
}

export async function listCashierDailyClosures(): Promise<CashierDailyClosure[]> {
  const session = await requireBusinessSession();
  if (!can(session.role, "sales.view") || !["owner", "manager", "cashier"].includes(session.role)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_cashier_daily_closures");
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, Json | undefined>;
    const id = String(row.id ?? "");
    return id ? [{ id, cashDate: String(row.cashDate ?? ""), cashierName: String(row.cashierName ?? "Caisse"), expectedAmount: queueNumber(row.expectedAmount), countedAmount: queueNumber(row.countedAmount), differenceAmount: queueNumber(row.differenceAmount), notes: row.notes ? String(row.notes) : null, closedAt: String(row.closedAt ?? "") }] : [];
  });
}

export async function listOwnerSaleCollections(): Promise<OwnerSaleCollection[]> {
  const session = await requireBusinessSession();
  if (!can(session.role, "sales.create") || session.role === "seller") return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_owner_sale_collections");
  if (error || !Array.isArray(data)) return [];

  return data.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, Json | undefined>;
    const id = String(row.id ?? "");
    return id ? [{
      id,
      saleNumber: String(row.saleNumber ?? "Vente"),
      amount: queueNumber(row.amount),
      paymentMethod: row.paymentMethod ? String(row.paymentMethod) : null,
      ownerName: String(row.ownerName ?? "Propriétaire"),
      createdAt: String(row.createdAt ?? ""),
    }] : [];
  });
}

export async function listCashierTodaySales(): Promise<CashierTodaySale[]> {
  const session = await requireBusinessSession();
  if (!can(session.role, "sales.create") || session.role === "seller") return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_cashier_today_sales");
  if (error || !Array.isArray(data)) return [];

  return data.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, Json | undefined>;
    const id = String(row.id ?? "");
    return id ? [{
      id,
      saleNumber: String(row.saleNumber ?? "Vente"),
      sellerName: String(row.sellerName ?? "Membre"),
      amountPaid: queueNumber(row.amountPaid),
      paymentStatus: String(row.paymentStatus ?? "unpaid"),
      createdAt: String(row.createdAt ?? ""),
    }] : [];
  });
}

export async function getMyPendingCashierSale(queueId: string): Promise<SaleListItem | null> {
  const id = queueId.trim();
  if (!id) return null;
  const sales = await listMyPendingCashierSales();
  return sales.find((sale) => sale.id === id) ?? null;
}

async function listMyPendingCashierSales(): Promise<SaleListItem[]> {
  const session = await requireBusinessSession();
  if (session.role !== "seller" && session.role !== "owner" && session.role !== "manager") return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_pending_cashier_sales");
  if (error || !Array.isArray(data)) return [];

  return data.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as PendingCashierSaleRow;
    const id = String(row.id ?? "");
    if (!id) return [];

    return [{
      id,
      businessId: session.businessId,
      customerId: row.customerId ? String(row.customerId) : null,
      customerName: row.customerName ? String(row.customerName) : null,
      customerPhone: row.customerPhone ? String(row.customerPhone) : null,
      userId: row.sellerId ? String(row.sellerId) : session.user.id,
      sellerName: row.sellerName ? String(row.sellerName) : session.user.fullName,
      saleNumber: "Vente en attente",
      subtotal: queueNumber(row.subtotal),
      discount: queueNumber(row.discount),
      total: queueNumber(row.total),
      amountPaid: 0,
      amountDue: queueNumber(row.total),
      paymentStatus: "unpaid",
      paymentMethod: null,
      status: "completed",
      notes: row.notes ? String(row.notes) : null,
      createdAt: String(row.createdAt ?? ""),
      updatedAt: String(row.createdAt ?? ""),
      awaitingCashier: true,
      pendingItems: queueItems(row.items),
    }];
  });
}

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

/** Les produits les plus consultés au chargement du formulaire, pour une recherche instantanée. */
export async function listSaleProductOptions(): Promise<SaleProductOption[]> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, selling_price, stock_quantity")
    .eq("business_id", session.businessId)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(100);

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
  const canShowPending = (session.role === "seller" || session.role === "owner" || session.role === "manager")
    && (filters.status === undefined || filters.status === "all" || filters.status === "pending")
    && (!filters.paymentStatus || filters.paymentStatus === "all")
    && (!filters.paymentMethod || filters.paymentMethod === "all");
  const pendingSales = canShowPending ? await listMyPendingCashierSales() : [];

  let query = supabase
    .from("sales")
    .select(
      "id, business_id, customer_id, user_id, sale_number, subtotal, discount, total, amount_paid, amount_due, payment_status, payment_method, status, notes, created_at, updated_at",
      { count: "planned" },
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

  if (filters.status === "completed" || filters.status === "cancelled") {
    query = query.eq("status", filters.status);
  } else if (filters.status !== "all") {
    query = query.in("status", ["completed", "cancelled"]);
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

  const [{ data: customers }, { data: profiles }, { data: returns }] = await Promise.all([
    customerIds.length
      ? supabase.from("customers").select("id, name").in("id", customerIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    userIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    data.length ? supabase.from("sale_returns").select("sale_id").in("sale_id", data.map((row) => row.id)) : Promise.resolve({ data: [] as { sale_id: string }[] }),
  ]);

  const customerNames = new Map((customers ?? []).map((customer) => [customer.id, customer.name]));
  const sellerNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || "Membre"]));
  const returnedIds = new Set((returns ?? []).map((item) => item.sale_id));

  const completedItems: SaleListItem[] = filters.status === "pending" ? [] : data.map((row) => ({
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
    isReturned: returnedIds.has(row.id),
  }));

  const filteredPendingSales = pendingSales.filter((sale) => {
    if (range.from && sale.createdAt < range.from) return false;
    if (range.to && sale.createdAt > range.to) return false;
    if (search && !sale.customerName?.toLocaleLowerCase().includes(search.toLocaleLowerCase())) return false;
    return true;
  });
  const items = [...completedItems, ...filteredPendingSales]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    items,
    total: (filters.status === "pending" ? 0 : count ?? 0) + filteredPendingSales.length,
    page,
    pageSize: SALE_PAGE_SIZE,
  };
}

async function getCashierSaleReceipt(saleId: string): Promise<Sale | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_cashier_sale_receipt", { p_sale_id: saleId });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const row = data as Record<string, Json | undefined>;
  const id = String(row.id ?? "");
  if (!id) return null;

  const rawItems = Array.isArray(row.items) ? row.items : [];
  return {
    id,
    businessId: String(row.businessId ?? ""),
    customerId: row.customerId ? String(row.customerId) : null,
    customerName: row.customerName ? String(row.customerName) : null,
    customerPhone: row.customerPhone ? String(row.customerPhone) : null,
    userId: String(row.userId ?? ""),
    sellerName: String(row.sellerName ?? "Membre"),
    saleNumber: String(row.saleNumber ?? "Vente"),
    subtotal: queueNumber(row.subtotal),
    discount: queueNumber(row.discount),
    total: queueNumber(row.total),
    amountPaid: queueNumber(row.amountPaid),
    amountDue: queueNumber(row.amountDue),
    paymentStatus: asPaymentStatus(row.paymentStatus ? String(row.paymentStatus) : null),
    paymentMethod: asPaymentMethod(row.paymentMethod ? String(row.paymentMethod) : null),
    status: asSaleStatus(row.status ? String(row.status) : null),
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
    items: rawItems.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const line = item as Record<string, Json | undefined>;
      return [mapItem({
        id: String(line.id ?? ""),
        sale_id: String(line.saleId ?? id),
        product_id: String(line.productId ?? ""),
        product_name: String(line.productName ?? "Produit"),
        quantity: queueNumber(line.quantity),
        unit_price: queueNumber(line.unitPrice),
        purchase_price: queueNumber(line.purchasePrice),
        discount: queueNumber(line.discount),
        total: queueNumber(line.total),
        created_at: String(line.createdAt ?? ""),
      })];
    }),
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
    if (session.role === "cashier") {
      return getCashierSaleReceipt(saleId);
    }
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
