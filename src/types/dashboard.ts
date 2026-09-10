export type DashboardPeriod = "today" | "7d" | "month" | "previous_month";

export type FinancialSummary = {
  revenue: number;
  collected: number;
  receivables: number;
  salesCount: number;
  cogs: number;
  grossMargin: number;
  expenses: number;
  netProfit: number;
  avgBasket: number;
};

export type Trend = {
  percent: number | null;
  label: string;
  direction: "up" | "down" | "flat" | "new";
};

export type DashboardStats = {
  current: FinancialSummary;
  previous: FinancialSummary;
  trends: {
    revenue: Trend;
    grossMargin: Trend;
    expenses: Trend;
    netProfit: Trend;
    receivables: Trend;
  };
  receivablesOpen: number;
  purchasesTotal: number;
  payablesOpen: number;
  topProducts: { name: string; quantity: number }[];
  revenueDays: { day: string; revenue: number; label: string }[];
  activity: DashboardActivity[];
};

export type DashboardActivity = {
  id: string;
  type: "sale" | "expense" | "payment" | "stock" | "purchase";
  title: string;
  amount: number;
  occurredAt: string;
};
