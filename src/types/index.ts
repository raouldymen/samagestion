import type { LucideIcon } from "lucide-react";
import type { Trend } from "@/types/dashboard";
import type { BusinessRole } from "@/types/database";

export type AppUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
};

export type Business = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  logoUrl: string | null;
  currency: string;
  ownerId: string | null;
};

export type CurrentSession = {
  user: AppUser;
  business: Business;
  businessId: string;
  role: BusinessRole;
  hasActiveCashier?: boolean;
};

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  roles?: readonly BusinessRole[];
  requiresActiveCashier?: boolean;
};

export type StatMetricId =
  | "revenue"
  | "profit"
  | "expense"
  | "receivable"
  | "margin"
  | "salesCount"
  | "avgBasket"
  | "collected"
  | "purchases"
  | "payable";

export type StatMetric = {
  id: StatMetricId;
  label: string;
  amount: number;
  suffix?: string;
  trend?: Trend;
};

export type ActivityType = "sale" | "expense" | "payment" | "stock" | "purchase";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  amount: number;
  occurredAt: string;
};

export type FieldErrors = Partial<Record<string, string>>;

export type AuthResult = {
  error: string | null;
  fieldErrors?: FieldErrors;
  success?: boolean;
  message?: string;
  saleId?: string;
  email?: string;
  values?: Record<string, string>;
};

export type {
  Product,
  Category,
  StockMovement,
  ProductUnit,
  StockMovementType,
} from "@/types/products";

export type {
  Sale,
  SaleItem,
  Customer,
  PaymentStatus,
  PaymentMethod,
  SaleStatus,
} from "@/types/sales";

export type {
  Expense,
  ExpenseCategory,
  ExpenseStats,
} from "@/types/expenses";

export type {
  TeamMember,
  MemberRole,
  MemberStatus,
  Invitation,
  AuditLog,
} from "@/types/team";

export type { Permission } from "@/lib/auth/permissions";

export type {
  Supplier,
  Purchase,
  PurchaseItem,
  PurchaseStatus,
} from "@/types/purchases";

export type {
  ReportPeriod,
  ReportsBundle,
  ReportRange,
} from "@/types/reports";

export type {
  AppNotification,
  NotificationType,
  NotificationPriority,
  NotificationSettings,
} from "@/types/notifications";

export type {
  BusinessSettings,
  ReceiptSettings,
  ReceiptFormat,
} from "@/types/settings";
