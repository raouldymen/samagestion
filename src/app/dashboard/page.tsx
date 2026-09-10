import type { Metadata } from "next";
import { DashboardAlerts } from "@/components/dashboard/dashboard-alerts";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { TopProducts } from "@/components/dashboard/top-products";
import { hasPermission } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import {
  getDashboardStats,
  getMySalesToday,
  getStockOverview,
} from "@/lib/dashboard/queries";
import { getDashboardAlerts } from "@/lib/notifications/queries";
import { getSubscriptionBundle } from "@/lib/subscriptions/queries";
import { hasFeature } from "@/lib/subscriptions/limits";
import { parseDashboardPeriod } from "@/lib/finance/summary";
import type { StatMetric } from "@/types";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

type SearchParams = Promise<{ period?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireBusinessSession();
  const params = await searchParams;
  const period = parseDashboardPeriod(params.period);
  const bundle = await getSubscriptionBundle();
  const financial =
    hasPermission(session.role, "reports.financial") &&
    hasFeature(bundle.features, "financial_reports");
  const canSell = hasPermission(session.role, "sales.create");
  const canStock = hasPermission(session.role, "stock.view");

  if (financial) {
    const [stats, alerts] = await Promise.all([getDashboardStats(period), getDashboardAlerts()]);
    const { current, trends } = stats;

    const primary: StatMetric[] = [
      {
        id: "revenue",
        label: "Chiffre d'affaires",
        amount: current.revenue,
        trend: trends.revenue,
      },
      {
        id: "profit",
        label: "Bénéfice net",
        amount: current.netProfit,
        trend: trends.netProfit,
      },
      {
        id: "expense",
        label: "Dépenses",
        amount: current.expenses,
        trend: trends.expenses,
      },
      {
        id: "receivable",
        label: "Créances clients",
        amount: stats.receivablesOpen,
      },
    ];

    const secondary: StatMetric[] = [
      {
        id: "margin",
        label: "Marge brute",
        amount: current.grossMargin,
        trend: trends.grossMargin,
      },
      {
        id: "collected",
        label: "Encaissé",
        amount: current.collected,
      },
      {
        id: "salesCount",
        label: "Nombre de ventes",
        amount: current.salesCount,
        suffix: current.salesCount > 1 ? "ventes" : "vente",
      },
      {
        id: "avgBasket",
        label: "Panier moyen",
        amount: current.avgBasket,
      },
      {
        id: "purchases",
        label: "Achats",
        amount: stats.purchasesTotal,
      },
      {
        id: "payable",
        label: "Dettes fournisseurs",
        amount: stats.payablesOpen,
      },
    ];

    return (
      <>
        <DashboardHeader planSlug={bundle.plan.slug} />
        <PeriodSelector period={period} />
        <DashboardAlerts
          outOfStock={alerts.outOfStock}
          lowStock={alerts.lowStock}
          customerDebts={alerts.customerDebts}
        />
        <section
          aria-label="Indicateurs d'activité"
          className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
        >
          {primary.map((metric) => (
            <StatCard key={metric.id} metric={metric} />
          ))}
        </section>
        <section
          aria-label="Indicateurs complémentaires"
          className="mt-3 grid grid-cols-2 gap-3 lg:mt-4 lg:grid-cols-3 lg:gap-4"
        >
          {secondary.map((metric) => (
            <StatCard key={metric.id} metric={metric} />
          ))}
        </section>
        <div className="mt-4 flex flex-col gap-4 lg:mt-6">
          <RevenueChart days={stats.revenueDays} />
          <QuickActions />
          <TopProducts items={stats.topProducts} />
          <RecentActivity items={stats.activity} />
        </div>
      </>
    );
  }

  if (canStock && !canSell) {
    const [stock, alerts] = await Promise.all([getStockOverview(), getDashboardAlerts()]);
    const metrics: StatMetric[] = [
      { id: "salesCount", label: "Produits actifs", amount: stock.active, suffix: "produits" },
      { id: "purchases", label: "Stock faible", amount: stock.lowStock, suffix: "alertes" },
      { id: "collected", label: "Produits", amount: stock.total, suffix: "références" },
    ];

    return (
      <>
        <DashboardHeader planSlug={bundle.plan.slug} />
        <DashboardAlerts
          outOfStock={alerts.outOfStock}
          lowStock={alerts.lowStock}
          customerDebts={0}
        />
        <section aria-label="Indicateurs stock" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {metrics.map((metric) => (
            <StatCard key={metric.id} metric={metric} />
          ))}
        </section>
        <div className="mt-4">
          <QuickActions />
        </div>
      </>
    );
  }

  const mine = canSell ? await getMySalesToday() : { salesCount: 0, total: 0 };
  const metrics: StatMetric[] = [
    {
      id: "salesCount",
      label: "Mes ventes aujourd'hui",
      amount: mine.salesCount,
      suffix: mine.salesCount > 1 ? "ventes" : "vente",
    },
    {
      id: "revenue",
      label: "Ventes du jour",
      amount: mine.total,
    },
  ];

  return (
    <>
      <DashboardHeader planSlug={bundle.plan.slug} />
      <section aria-label="Mes ventes" className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <StatCard key={metric.id} metric={metric} />
        ))}
      </section>
      <div className="mt-4">
        <QuickActions />
      </div>
    </>
  );
}
