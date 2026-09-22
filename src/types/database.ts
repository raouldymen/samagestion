export type BusinessRole = "owner" | "manager" | "cashier" | "seller" | "stock_manager";
export type MemberStatus = "active" | "invited" | "suspended";
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";
export type ProductUnit =
  | "piece"
  | "kg"
  | "g"
  | "litre"
  | "mètre"
  | "carton"
  | "paquet"
  | "autre";
export type StockMovementType = "purchase" | "sale" | "return" | "adjustment" | "loss";
export type StockStatus = "in_stock" | "low" | "out";
export type PaymentStatus = "paid" | "partial" | "unpaid";
export type PaymentMethod = "cash" | "wave" | "orange_money" | "bank" | "card" | "other";
export type SaleStatus = "completed" | "cancelled";
export type ExpenseStatus = "active" | "cancelled";
export type PurchaseStatus = "completed" | "cancelled";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ReceiptWidth = "58mm" | "80mm" | "A4";
export type AppLocale = "fr" | "en" | "wo";

type InvitationRow = {
  id: string;
  business_id: string;
  email: string;
  role: Exclude<BusinessRole, "owner">;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  invited_by: string;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  business_id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
};

type CategoryRow = {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type ProductRow = {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  unit: ProductUnit;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stock_status: StockStatus;
};

type StockMovementRow = {
  id: string;
  business_id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  reference_id: string | null;
  created_by: string;
  created_at: string;
};

type CustomerRow = {
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
};

type SaleRow = {
  id: string;
  business_id: string;
  customer_id: string | null;
  user_id: string;
  sale_number: string;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  status: SaleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type SaleItemRow = {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  discount: number;
  total: number;
  created_at: string;
};

type ExpenseCategoryRow = {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
};

type ExpenseRow = {
  id: string;
  business_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  expense_date: string;
  notes: string | null;
  status: ExpenseStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type SupplierRow = {
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
};

type PurchaseRow = {
  id: string;
  business_id: string;
  supplier_id: string | null;
  purchase_number: string;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  status: PurchaseStatus;
  notes: string | null;
  purchase_date: string;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type PurchaseItemRow = {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          current_business_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          current_business_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          current_business_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          logo_url: string | null;
          currency: string;
          owner_id: string | null;
          city: string | null;
          country: string;
          customer_debt_alert_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          logo_url?: string | null;
          currency?: string;
          owner_id?: string | null;
          city?: string | null;
          country?: string;
          customer_debt_alert_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          logo_url?: string | null;
          currency?: string;
          owner_id?: string | null;
          city?: string | null;
          country?: string;
          customer_debt_alert_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: BusinessRole;
          status: MemberStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role: BusinessRole;
          status?: MemberStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          role?: BusinessRole;
          status?: MemberStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: {
          id?: string;
          business_id: string;
          category_id?: string | null;
          name: string;
          sku?: string | null;
          description?: string | null;
          purchase_price?: number;
          selling_price?: number;
          stock_quantity?: number;
          minimum_stock?: number;
          unit?: ProductUnit;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          category_id?: string | null;
          name?: string;
          sku?: string | null;
          description?: string | null;
          purchase_price?: number;
          selling_price?: number;
          stock_quantity?: number;
          minimum_stock?: number;
          unit?: ProductUnit;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: StockMovementRow;
        Insert: {
          id?: string;
          business_id: string;
          product_id: string;
          type: StockMovementType;
          quantity: number;
          previous_stock: number;
          new_stock: number;
          reason?: string | null;
          reference_id?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          product_id?: string;
          type?: StockMovementType;
          quantity?: number;
          previous_stock?: number;
          new_stock?: number;
          reason?: string | null;
          reference_id?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: CustomerRow;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: SaleRow;
        Insert: {
          id?: string;
          business_id: string;
          customer_id?: string | null;
          user_id: string;
          sale_number: string;
          subtotal?: number;
          discount?: number;
          total?: number;
          amount_paid?: number;
          amount_due?: number;
          payment_status: PaymentStatus;
          payment_method?: PaymentMethod | null;
          status?: SaleStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string | null;
          user_id?: string;
          sale_number?: string;
          subtotal?: number;
          discount?: number;
          total?: number;
          amount_paid?: number;
          amount_due?: number;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod | null;
          status?: SaleStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sale_returns: {
        Row: { id: string; business_id: string; sale_id: string; amount: number; reason: string | null; returned_by: string; returned_at: string };
        Insert: { id?: string; business_id: string; sale_id: string; amount: number; reason?: string | null; returned_by: string; returned_at?: string };
        Update: { id?: string; business_id?: string; sale_id?: string; amount?: number; reason?: string | null; returned_by?: string; returned_at?: string };
        Relationships: [];
      };
      sale_items: {
        Row: SaleItemRow;
        Insert: {
          id?: string;
          sale_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          purchase_price: number;
          discount?: number;
          total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          purchase_price?: number;
          discount?: number;
          total?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      expense_categories: {
        Row: ExpenseCategoryRow;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: ExpenseRow;
        Insert: {
          id?: string;
          business_id: string;
          category_id?: string | null;
          description: string;
          amount: number;
          payment_method: PaymentMethod;
          expense_date?: string;
          notes?: string | null;
          status?: ExpenseStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          category_id?: string | null;
          description?: string;
          amount?: number;
          payment_method?: PaymentMethod;
          expense_date?: string;
          notes?: string | null;
          status?: ExpenseStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: SupplierRow;
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchases: {
        Row: PurchaseRow;
        Insert: {
          id?: string;
          business_id: string;
          supplier_id?: string | null;
          purchase_number: string;
          subtotal?: number;
          discount?: number;
          total?: number;
          amount_paid?: number;
          amount_due?: number;
          payment_status: PaymentStatus;
          payment_method?: PaymentMethod | null;
          status?: PurchaseStatus;
          notes?: string | null;
          purchase_date?: string;
          due_date?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          supplier_id?: string | null;
          purchase_number?: string;
          subtotal?: number;
          discount?: number;
          total?: number;
          amount_paid?: number;
          amount_due?: number;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod | null;
          status?: PurchaseStatus;
          notes?: string | null;
          purchase_date?: string;
          due_date?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_items: {
        Row: PurchaseItemRow;
        Insert: {
          id?: string;
          purchase_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_cost: number;
          total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          purchase_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          unit_cost?: number;
          total?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          entity_type: string | null;
          entity_id: string | null;
          priority: string;
          channel: string;
          is_read: boolean;
          is_resolved: boolean;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          entity_type?: string | null;
          entity_id?: string | null;
          priority?: string;
          channel?: string;
          is_read?: boolean;
          is_resolved?: boolean;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          priority?: string;
          channel?: string;
          is_read?: boolean;
          is_resolved?: boolean;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_settings: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          low_stock: boolean;
          out_of_stock: boolean;
          customer_debt: boolean;
          old_customer_debt: boolean;
          supplier_debt: boolean;
          sale_completed: boolean;
          purchase_completed: boolean;
          payment_received: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          low_stock?: boolean;
          out_of_stock?: boolean;
          customer_debt?: boolean;
          old_customer_debt?: boolean;
          supplier_debt?: boolean;
          sale_completed?: boolean;
          purchase_completed?: boolean;
          payment_received?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          low_stock?: boolean;
          out_of_stock?: boolean;
          customer_debt?: boolean;
          old_customer_debt?: boolean;
          supplier_debt?: boolean;
          sale_completed?: boolean;
          purchase_completed?: boolean;
          payment_received?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_invitations: {
        Row: InvitationRow;
        Insert: {
          id?: string;
          business_id: string;
          email: string;
          role: Exclude<BusinessRole, "owner">;
          token: string;
          status?: InvitationStatus;
          expires_at: string;
          invited_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          email?: string;
          role?: Exclude<BusinessRole, "owner">;
          token?: string;
          status?: InvitationStatus;
          expires_at?: string;
          invited_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      business_settings: {
        Row: {
          business_id: string;
          receipt_prefix: string;
          purchase_prefix: string;
          receipt_width: ReceiptWidth;
          show_logo: boolean;
          show_phone: boolean;
          show_address: boolean;
          show_customer: boolean;
          show_seller: boolean;
          show_notes: boolean;
          show_message: boolean;
          receipt_message: string | null;
          legal_information: string | null;
          timezone: string;
          locale: AppLocale;
          date_format: string;
          number_format: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          receipt_prefix?: string;
          purchase_prefix?: string;
          receipt_width?: ReceiptWidth;
          show_logo?: boolean;
          show_phone?: boolean;
          show_address?: boolean;
          show_customer?: boolean;
          show_seller?: boolean;
          show_notes?: boolean;
          show_message?: boolean;
          receipt_message?: string | null;
          legal_information?: string | null;
          timezone?: string;
          locale?: AppLocale;
          date_format?: string;
          number_format?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          receipt_prefix?: string;
          purchase_prefix?: string;
          receipt_width?: ReceiptWidth;
          show_logo?: boolean;
          show_phone?: boolean;
          show_address?: boolean;
          show_customer?: boolean;
          show_seller?: boolean;
          show_notes?: boolean;
          show_message?: boolean;
          receipt_message?: string | null;
          legal_information?: string | null;
          timezone?: string;
          locale?: AppLocale;
          date_format?: string;
          number_format?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          price_monthly: number;
          currency: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          price_monthly?: number;
          currency?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          price_monthly?: number;
          currency?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscription_plan_features: {
        Row: {
          id: string;
          plan_id: string;
          feature_key: string;
          enabled: boolean;
          limit_value: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          feature_key: string;
          enabled?: boolean;
          limit_value?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          feature_key?: string;
          enabled?: boolean;
          limit_value?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      business_subscriptions: {
        Row: {
          id: string;
          business_id: string;
          plan_id: string;
          status: string;
          started_at: string;
          current_period_start: string;
          current_period_end: string | null;
          trial_start: string | null;
          trial_end: string | null;
          cancel_at_period_end: boolean;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          plan_id: string;
          status?: string;
          started_at?: string;
          current_period_start?: string;
          current_period_end?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          plan_id?: string;
          status?: string;
          started_at?: string;
          current_period_start?: string;
          current_period_end?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscription_transactions: {
        Row: {
          id: string;
          business_id: string;
          subscription_id: string | null;
          provider: string;
          provider_transaction_id: string | null;
          internal_reference: string | null;
          plan_id: string | null;
          environment: string;
          initiated_by: string | null;
          confirmed_at: string | null;
          failure_reason: string | null;
          amount: number;
          currency: string;
          status: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          subscription_id?: string | null;
          provider?: string;
          provider_transaction_id?: string | null;
          internal_reference?: string | null;
          plan_id?: string | null;
          environment?: string;
          initiated_by?: string | null;
          confirmed_at?: string | null;
          failure_reason?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          subscription_id?: string | null;
          provider?: string;
          provider_transaction_id?: string | null;
          internal_reference?: string | null;
          plan_id?: string | null;
          environment?: string;
          initiated_by?: string | null;
          confirmed_at?: string | null;
          failure_reason?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_settings: {
        Row: {
          id: number;
          grace_period_days: number;
          trial_days: number;
          mock_payments_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          id?: number;
          grace_period_days?: number;
          trial_days?: number;
          mock_payments_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: number;
          grace_period_days?: number;
          trial_days?: number;
          mock_payments_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          user_id: string;
          granted_at: string;
          granted_by: string | null;
          notes: string | null;
        };
        Insert: {
          user_id: string;
          granted_at?: string;
          granted_by?: string | null;
          notes?: string | null;
        };
        Update: {
          user_id?: string;
          granted_at?: string;
          granted_by?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_business: {
        Args: {
          p_name: string;
          p_phone?: string | null;
          p_email?: string | null;
          p_address?: string | null;
        };
        Returns: Database["public"]["Tables"]["businesses"]["Row"];
      };
      is_business_member: {
        Args: { p_business_id: string };
        Returns: boolean;
      };
      current_business_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      apply_stock_change: {
        Args: {
          p_product_id: string;
          p_quantity: number;
          p_type: StockMovementType;
          p_reason?: string | null;
          p_reference_id?: string | null;
        };
        Returns: StockMovementRow;
      };
      apply_inventory_count: {
        Args: { p_items: Json };
        Returns: number;
      };
      create_product: {
        Args: {
          p_name: string;
          p_category_id?: string | null;
          p_sku?: string | null;
          p_description?: string | null;
          p_purchase_price?: number;
          p_selling_price?: number;
          p_initial_stock?: number;
          p_minimum_stock?: number;
          p_unit?: ProductUnit;
        };
        Returns: ProductRow;
      };
      update_product: {
        Args: {
          p_product_id: string;
          p_name: string;
          p_category_id?: string | null;
          p_sku?: string | null;
          p_description?: string | null;
          p_purchase_price?: number;
          p_selling_price?: number;
          p_minimum_stock?: number;
          p_unit?: ProductUnit;
          p_image_url?: string | null;
          p_is_active?: boolean;
        };
        Returns: ProductRow;
      };
      set_product_image: {
        Args: { p_product_id: string; p_image_url: string | null };
        Returns: ProductRow;
      };
      deactivate_product: {
        Args: { p_product_id: string };
        Returns: ProductRow;
      };
      create_category: {
        Args: { p_name: string };
        Returns: CategoryRow;
      };
      list_categories_with_counts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          business_id: string;
          name: string;
          product_count: number;
          created_at: string;
          updated_at: string;
        };
      };
      get_product_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total: number;
          active: number;
          low_stock: number;
          stock_value: number;
        };
      };
      update_category: {
        Args: { p_category_id: string; p_name: string };
        Returns: CategoryRow;
      };
      current_member_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      create_sale: {
        Args: {
          p_items: Json;
          p_discount?: number;
          p_customer_id?: string | null;
          p_payment_method?: PaymentMethod;
          p_amount_paid?: number;
          p_notes?: string | null;
        };
        Returns: SaleRow;
      };
      return_sale_for_credit: {
        Args: { p_sale_id: string; p_reason?: string | null };
        Returns: { id: string; business_id: string; sale_id: string; amount: number; reason: string | null; returned_by: string; returned_at: string };
      };
      return_sale_items: { Args: { p_sale_id: string; p_items: Json; p_reason?: string | null }; Returns: { id: string; business_id: string; sale_id: string; amount: number; reason: string | null; returned_by: string; returned_at: string }; };
      create_owner_sale: {
        Args: {
          p_items: Json;
          p_discount?: number;
          p_customer_id?: string | null;
          p_payment_method?: PaymentMethod;
          p_amount_paid?: number;
          p_notes?: string | null;
        };
        Returns: SaleRow;
      };
      list_owner_sale_collections: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      list_cashier_today_sales: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_cashier_sale_receipt: {
        Args: { p_sale_id: string };
        Returns: Json;
      };
      mark_owner_sale_collection: {
        Args: { p_collection_id: string };
        Returns: undefined;
      };
      queue_sale_for_cashier: {
        Args: {
          p_items: Json;
          p_discount?: number;
          p_customer_id?: string | null;
          p_notes?: string | null;
          p_seller_id?: string | null;
        };
        Returns: Json;
      };
      list_cashier_sale_queue: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      list_my_pending_cashier_sales: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      cashier_checkout_is_required: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      cashier_checkout_summary: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      cashier_expenses_summary: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      cashier_closure_summary: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      close_cashier_day: {
        Args: { p_counted_amount: number; p_notes?: string | null };
        Returns: {
          id: string;
          business_id: string;
          cashier_id: string;
          cash_date: string;
          expected_amount: number;
          counted_amount: number;
          difference_amount: number;
          notes: string | null;
          closed_at: string;
        };
      };
      list_cashier_daily_closures: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      cancel_cashier_sale: { Args: { p_queue_id: string }; Returns: undefined };
      update_cashier_sale: {
        Args: { p_queue_id: string; p_items: Json; p_discount?: number; p_customer_id?: string | null; p_notes?: string | null };
        Returns: undefined;
      };
      complete_cashier_sale: {
        Args: { p_queue_id: string; p_payment_method: PaymentMethod; p_amount_paid: number };
        Returns: SaleRow;
      };
      cancel_sale: {
        Args: { p_sale_id: string };
        Returns: SaleRow;
      };
      create_customer: {
        Args: {
          p_name: string;
          p_phone?: string | null;
          p_email?: string | null;
          p_address?: string | null;
          p_notes?: string | null;
        };
        Returns: CustomerRow;
      };
      update_customer: {
        Args: {
          p_customer_id: string;
          p_name: string;
          p_phone?: string | null;
          p_email?: string | null;
          p_address?: string | null;
          p_notes?: string | null;
          p_is_active?: boolean;
        };
        Returns: CustomerRow;
      };
      set_customer_active: {
        Args: { p_customer_id: string; p_is_active: boolean };
        Returns: CustomerRow;
      };
      list_customers_with_stats: {
        Args: { p_search?: string | null; p_include_archived?: boolean };
        Returns: Json;
      };
      get_customer_detail: {
        Args: { p_customer_id: string };
        Returns: Json;
      };
      record_customer_debt_payment: {
        Args: { p_sale_id: string; p_amount: number; p_payment_method: PaymentMethod; p_notes?: string | null };
        Returns: SaleRow;
      };
      get_today_sales_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          revenue: number;
          sales_count: number;
        };
      };
      ensure_default_expense_categories: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      list_expense_categories: {
        Args: Record<PropertyKey, never>;
        Returns: ExpenseCategoryRow[];
      };
      create_expense_category: {
        Args: { p_name: string };
        Returns: ExpenseCategoryRow;
      };
      update_expense_category: {
        Args: { p_category_id: string; p_name: string };
        Returns: ExpenseCategoryRow;
      };
      create_expense: {
        Args: {
          p_description: string;
          p_category_id: string;
          p_amount: number;
          p_payment_method: PaymentMethod;
          p_expense_date: string;
          p_notes?: string | null;
        };
        Returns: ExpenseRow;
      };
      update_expense: {
        Args: {
          p_expense_id: string;
          p_description: string;
          p_category_id: string;
          p_amount: number;
          p_payment_method: PaymentMethod;
          p_expense_date: string;
          p_notes?: string | null;
        };
        Returns: ExpenseRow;
      };
      cancel_expense: {
        Args: { p_expense_id: string };
        Returns: ExpenseRow;
      };
      get_expense_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          today: number;
          week: number;
          month: number;
          total: number;
        };
      };
      get_dashboard_bundle: {
        Args: {
          p_from: string;
          p_to: string;
          p_prev_from: string;
          p_prev_to: string;
        };
        Returns: Json;
      };
      get_reports_bundle: {
        Args: {
          p_from: string;
          p_to: string;
          p_prev_from: string;
          p_prev_to: string;
          p_granularity?: string;
        };
        Returns: Json;
      };
      create_in_app_notification: {
        Args: {
          p_business_id: string;
          p_type: string;
          p_title: string;
          p_message: string;
          p_entity_type?: string | null;
          p_entity_id?: string | null;
          p_priority?: string | null;
        };
        Returns: number;
      };
      create_stock_alert: {
        Args: { p_product_id: string };
        Returns: undefined;
      };
      create_customer_debt_alert: {
        Args: { p_customer_id: string };
        Returns: undefined;
      };
      create_supplier_debt_alert: {
        Args: { p_supplier_id: string };
        Returns: undefined;
      };
      sync_business_alerts: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      ensure_notification_settings: {
        Args: { p_business_id: string; p_user_id: string };
        Returns: {
          id: string;
          business_id: string;
          user_id: string;
          low_stock: boolean;
          out_of_stock: boolean;
          customer_debt: boolean;
          old_customer_debt: boolean;
          supplier_debt: boolean;
          sale_completed: boolean;
          purchase_completed: boolean;
          payment_received: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      update_notification_settings: {
        Args: {
          p_low_stock?: boolean | null;
          p_out_of_stock?: boolean | null;
          p_customer_debt?: boolean | null;
          p_old_customer_debt?: boolean | null;
          p_supplier_debt?: boolean | null;
          p_sale_completed?: boolean | null;
          p_purchase_completed?: boolean | null;
          p_payment_received?: boolean | null;
        };
        Returns: {
          id: string;
          business_id: string;
          user_id: string;
          low_stock: boolean;
          out_of_stock: boolean;
          customer_debt: boolean;
          old_customer_debt: boolean;
          supplier_debt: boolean;
          sale_completed: boolean;
          purchase_completed: boolean;
          payment_received: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      update_customer_debt_alert_threshold: {
        Args: { p_threshold: number };
        Returns: number;
      };
      cleanup_old_notifications: {
        Args: { p_days?: number };
        Returns: number;
      };
      create_supplier: {
        Args: {
          p_name: string;
          p_phone?: string | null;
          p_email?: string | null;
          p_address?: string | null;
          p_notes?: string | null;
        };
        Returns: SupplierRow;
      };
      update_supplier: {
        Args: {
          p_supplier_id: string;
          p_name: string;
          p_phone?: string | null;
          p_email?: string | null;
          p_address?: string | null;
          p_notes?: string | null;
          p_is_active?: boolean;
        };
        Returns: SupplierRow;
      };
      create_purchase: {
        Args: {
          p_items: Json;
          p_discount?: number;
          p_supplier_id?: string | null;
          p_payment_method?: PaymentMethod;
          p_amount_paid?: number;
          p_notes?: string | null;
          p_purchase_date?: string | null;
        };
        Returns: PurchaseRow;
      };
      set_purchase_due_date: {
        Args: { p_purchase_id: string; p_due_date: string };
        Returns: PurchaseRow;
      };
      record_supplier_debt_payment: { Args: { p_purchase_id: string; p_amount: number; p_payment_method: PaymentMethod }; Returns: PurchaseRow; };
      cancel_purchase: {
        Args: { p_purchase_id: string };
        Returns: PurchaseRow;
      };
      get_purchase_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          today: number;
          month: number;
          total: number;
          suppliers_count: number;
        };
      };
      has_permission: {
        Args: { p_permission: string; p_business_id?: string | null };
        Returns: boolean;
      };
      member_role_for: {
        Args: { p_business_id: string };
        Returns: string;
      };
      is_platform_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      set_mock_payments_enabled: {
        Args: { p_enabled: boolean };
        Returns: Database["public"]["Tables"]["payment_settings"]["Row"];
      };
      invite_business_member: {
        Args: { p_email: string; p_role: string };
        Returns: InvitationRow;
      };
      add_business_member_direct: {
        Args: { p_user_id: string; p_role: string };
        Returns: Database["public"]["Tables"]["business_members"]["Row"];
      };
      get_invitation_by_token: {
        Args: { p_token: string };
        Returns: {
          id: string;
          business_id: string;
          business_name: string;
          email: string;
          role: string;
          status: string;
          expires_at: string;
        };
      };
      accept_invitation: {
        Args: { p_token: string };
        Returns: Database["public"]["Tables"]["business_members"]["Row"];
      };
      decline_invitation: {
        Args: { p_token: string };
        Returns: undefined;
      };
      update_member_role: {
        Args: { p_member_id: string; p_role: string };
        Returns: Database["public"]["Tables"]["business_members"]["Row"];
      };
      set_member_status: {
        Args: { p_member_id: string; p_status: string };
        Returns: Database["public"]["Tables"]["business_members"]["Row"];
      };
      remove_business_member: {
        Args: { p_member_id: string };
        Returns: undefined;
      };
      list_team_members: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          user_id: string;
          full_name: string;
          email: string;
          role: string;
          status: string;
          created_at: string;
          last_activity_at: string;
        };
      };
      list_business_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: InvitationRow;
      };
      resend_invitation: {
        Args: { p_invitation_id: string };
        Returns: InvitationRow;
      };
      get_my_sales_today: {
        Args: Record<PropertyKey, never>;
        Returns: {
          sales_count: number;
          total: number;
        };
      };
      update_business_profile: {
        Args: {
          p_name: string;
          p_phone?: string | null;
          p_email?: string | null;
          p_address?: string | null;
          p_city?: string | null;
          p_country?: string | null;
        };
        Returns: Database["public"]["Tables"]["businesses"]["Row"];
      };
      set_business_logo: {
        Args: { p_logo_url: string | null };
        Returns: Database["public"]["Tables"]["businesses"]["Row"];
      };
      update_receipt_settings: {
        Args: {
          p_receipt_prefix: string;
          p_purchase_prefix: string;
          p_receipt_width: string;
          p_show_logo: boolean;
          p_show_phone: boolean;
          p_show_address: boolean;
          p_show_customer: boolean;
          p_show_seller: boolean;
          p_show_notes: boolean;
          p_show_message: boolean;
          p_receipt_message?: string | null;
          p_legal_information?: string | null;
        };
        Returns: Database["public"]["Tables"]["business_settings"]["Row"];
      };
      update_business_preferences: {
        Args: {
          p_locale?: string;
          p_date_format?: string;
          p_number_format?: string;
        };
        Returns: Database["public"]["Tables"]["business_settings"]["Row"];
      };
      get_subscription_bundle: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      list_subscription_plans: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      change_business_plan: {
        Args: { p_plan_slug: string };
        Returns: Database["public"]["Tables"]["business_subscriptions"]["Row"];
      };
      cancel_business_subscription: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["business_subscriptions"]["Row"];
      };
      reactivate_business_subscription: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["business_subscriptions"]["Row"];
      };
      record_subscription_transaction: {
        Args: {
          p_provider: string;
          p_provider_transaction_id: string;
          p_amount: number;
          p_status: string;
          p_subscription_id?: string | null;
          p_metadata?: Json;
        };
        Returns: Database["public"]["Tables"]["subscription_transactions"]["Row"];
      };
      create_payment_checkout: {
        Args: { p_plan_id: string; p_environment?: string };
        Returns: Json;
      };
      attach_payment_provider: {
        Args: {
          p_internal_reference: string;
          p_provider: string;
          p_provider_transaction_id?: string | null;
          p_metadata?: Json;
        };
        Returns: Database["public"]["Tables"]["subscription_transactions"]["Row"];
      };
      confirm_subscription_payment: {
        Args: {
          p_internal_reference: string;
          p_provider: string;
          p_provider_transaction_id: string;
          p_amount: number;
          p_currency: string;
          p_status: string;
          p_event_type?: string;
          p_environment?: string;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      renew_subscription_period: {
        Args: {
          p_business_id: string;
          p_provider: string;
          p_provider_transaction_id: string;
          p_amount: number;
          p_currency: string;
          p_environment?: string;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      get_payment_transaction: {
        Args: { p_internal_reference: string };
        Returns: Json;
      };
      confirm_mock_test_payment: {
        Args: { p_internal_reference: string; p_success?: boolean };
        Returns: Json;
      };
      subscription_revenue_snapshot: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      has_plan_feature: {
        Args: { p_feature: string; p_business_id?: string | null };
        Returns: boolean;
      };
      get_plan_limit: {
        Args: { p_feature: string; p_business_id?: string | null };
        Returns: number | null;
      };
      count_plan_usage: {
        Args: { p_feature: string; p_business_id?: string | null };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
