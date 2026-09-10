import { CustomerDebtAnalysis } from "@/components/reports/customer-debt-analysis";
import { ExpenseAnalysis } from "@/components/reports/expense-analysis";
import { ExpenseCategoryChart } from "@/components/reports/expense-category-chart";
import { FinancialSummary } from "@/components/reports/financial-summary";
import { PaymentMethodsChart } from "@/components/reports/payment-methods-chart";
import { ProfitAnalysis } from "@/components/reports/profit-analysis";
import { PurchaseAnalysis } from "@/components/reports/purchase-analysis";
import { SalesChart } from "@/components/reports/sales-chart";
import { SalesReport } from "@/components/reports/sales-report";
import { StockAnalysis } from "@/components/reports/stock-analysis";
import { TopCustomers } from "@/components/reports/top-customers";
import { TopProducts } from "@/components/reports/top-products";
import { formatPeriodLabel } from "@/lib/reports/period";
import type { ReportsBundle } from "@/types/reports";

export function ReportsContent({
  bundle,
  businessName,
  printDocument = false,
}: {
  bundle: ReportsBundle;
  businessName: string;
  printDocument?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {printDocument ? (
        <header className="border-b border-border pb-4">
          <p className="text-sm text-muted-foreground">{businessName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Rapport d&apos;activité</h1>
          <p className="mt-1 text-sm text-muted-foreground">Période : {formatPeriodLabel(bundle.range)}</p>
        </header>
      ) : (
        <div className="mb-2 hidden print:block">
          <p className="text-sm text-muted-foreground">{businessName}</p>
          <h2 className="text-xl font-semibold">Rapport d&apos;activité</h2>
          <p className="text-sm text-muted-foreground">Période : {formatPeriodLabel(bundle.range)}</p>
        </div>
      )}
      <FinancialSummary bundle={bundle} />
      <SalesReport current={bundle.current} />
      <ProfitAnalysis bundle={bundle} />
      <SalesChart series={bundle.series} granularity={bundle.range.granularity} />
      <TopProducts bundle={bundle} />
      <CustomerDebtAnalysis bundle={bundle} />
      <TopCustomers customers={bundle.topCustomers} />
      <ExpenseAnalysis bundle={bundle} />
      <ExpenseCategoryChart bundle={bundle} />
      <PurchaseAnalysis bundle={bundle} />
      <PaymentMethodsChart payments={bundle.payments} />
      <StockAnalysis bundle={bundle} />
    </div>
  );
}
