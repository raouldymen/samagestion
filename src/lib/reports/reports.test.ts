import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { can, canViewFinancialReports } from "@/lib/auth/permissions";
import { financialSummary, percentChange, ratioPercent } from "@/lib/finance/summary";
import {
  csvCell,
  csvNumber,
  parseExportDataset,
  serializeWorkbook,
  toCsv,
} from "@/lib/reports/export";
import { reportsCacheKey } from "@/lib/reports/cache";
import { parseReportSearch, reportSearchQuery } from "@/lib/reports/params";
import { chartGranularity, parseReportPeriod, reportPeriodRange } from "@/lib/reports/period";

describe("rapport financier de référence", () => {
  it("calcule CA, coût, marge, dépenses et bénéfice", () => {
    const summary = financialSummary({
      revenue: 300_000,
      collected: 300_000,
      receivables: 0,
      salesCount: 2,
      cogs: 160_000,
      expenses: 50_000,
    });

    assert.equal(summary.revenue, 300_000);
    assert.equal(summary.cogs, 160_000);
    assert.equal(summary.grossMargin, 140_000);
    assert.equal(summary.expenses, 50_000);
    assert.equal(summary.netProfit, 90_000);
  });

  it("n'inclut pas les achats de stock dans les dépenses", () => {
    const summary = financialSummary({
      revenue: 300_000,
      collected: 300_000,
      receivables: 0,
      salesCount: 2,
      cogs: 160_000,
      expenses: 50_000,
    });

    assert.equal(summary.expenses, 50_000);
    assert.equal(summary.netProfit, 90_000);
  });

  it("sépare CA, encaissé et créances sur une vente à crédit", () => {
    const summary = financialSummary({
      revenue: 1_000_000,
      collected: 700_000,
      receivables: 300_000,
      salesCount: 1,
      cogs: 0,
      expenses: 0,
    });

    assert.equal(summary.revenue, 1_000_000);
    assert.equal(summary.collected, 700_000);
    assert.equal(summary.receivables, 300_000);
  });

  it("exclut les ventes et dépenses annulées", () => {
    const afterCancel = financialSummary({
      revenue: 0,
      collected: 0,
      receivables: 0,
      salesCount: 0,
      cogs: 0,
      expenses: 0,
    });

    assert.equal(afterCancel.revenue, 0);
    assert.equal(afterCancel.expenses, 0);
    assert.equal(afterCancel.netProfit, 0);
  });

  it("gère une période vide et un taux à zéro", () => {
    const summary = financialSummary({
      revenue: 0,
      collected: 0,
      receivables: 0,
      salesCount: 0,
      cogs: 0,
      expenses: 0,
    });

    assert.equal(summary.avgBasket, 0);
    assert.equal(ratioPercent(summary.grossMargin, summary.revenue), 0);
    assert.equal(ratioPercent(summary.netProfit, summary.revenue), 0);
  });

  it("gère une période précédente à zéro", () => {
    const trend = percentChange(300_000, 0);
    assert.equal(trend.percent, null);
    assert.equal(trend.direction, "new");
    assert.equal(trend.label, "Nouveau");
  });

  it("calcule le taux de marge demandé", () => {
    assert.equal(ratioPercent(1_850_000, 4_850_000), 38.1);
  });
});

describe("périodes et granularité", () => {
  const now = new Date("2026-08-27T15:00:00Z");

  it("utilise Ce mois par défaut", () => {
    assert.equal(parseReportPeriod(undefined), "month");
    assert.equal(parseReportPeriod("unknown"), "month");
  });

  it("adapte la granularité du graphique", () => {
    assert.equal(chartGranularity(31), "day");
    assert.equal(chartGranularity(32), "week");
    assert.equal(chartGranularity(180), "week");
    assert.equal(chartGranularity(181), "month");
  });

  it("borne 30 jours de façon exclusive", () => {
    const range = reportPeriodRange("30d", undefined, undefined, now);
    assert.equal(range.from, "2026-07-29T00:00:00.000Z");
    assert.equal(range.to, "2026-08-28T00:00:00.000Z");
    assert.equal(range.days, 30);
    assert.equal(range.granularity, "day");
  });

  it("borne l'année civile", () => {
    const range = reportPeriodRange("year", undefined, undefined, now);
    assert.equal(range.from, "2026-01-01T00:00:00.000Z");
    assert.equal(range.to, "2027-01-01T00:00:00.000Z");
    assert.equal(range.granularity, "month");
  });

  it("inclut les dates personnalisées jusqu'à la fin du jour", () => {
    const range = reportPeriodRange("custom", "2026-08-01", "2026-08-27", now);
    assert.equal(range.from, "2026-08-01T00:00:00.000Z");
    assert.equal(range.to, "2026-08-28T00:00:00.000Z");
    assert.equal(range.fromDate, "2026-08-01");
    assert.equal(range.toDateInclusive, "2026-08-27");
  });
});

describe("export CSV", () => {
  it("conserve les accents et un BOM UTF-8", async () => {
    const file = await serializeWorkbook(
      {
        name: "Produits",
        headers: ["Produit", "CA"],
        rows: [["Jean Zara", 1_875_000]],
      },
      "produits",
      "csv",
    );

    assert.equal(file.body[0], 0xef);
    assert.equal(file.body[1], 0xbb);
    assert.equal(file.body[2], 0xbf);
    const text = new TextDecoder().decode(file.body.slice(3));
    assert.ok(text.includes("Jean Zara"));
    assert.ok(text.includes("1_875_000") === false);
    assert.ok(text.includes("1875000"));
  });

  it("sépare les colonnes pour Excel français", () => {
    const csv = toCsv(["Produit", "Montant"], [["Café Touba", 25000]]);
    assert.equal(csv, "Produit;Montant\r\nCafé Touba;25000\r\n");
  });

  it("échappe les points-virgules", () => {
    assert.equal(csvCell("Loyer; local"), '"Loyer; local"');
  });

  it("exporte un montant entier exploitable", () => {
    assert.equal(csvNumber(4_850_000), "4850000");
    assert.equal(csvNumber(14.5), "14,50");
  });

  it("produit un vrai classeur Excel", async () => {
    const xlsx = await serializeWorkbook({ name: "Ventes", headers: ["CA"], rows: [[100]] }, "ventes", "xlsx");
    assert.equal(xlsx.format, "xlsx");
    assert.ok(xlsx.filename.endsWith(".xlsx"));
    assert.equal(xlsx.mime, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.equal(xlsx.body[0], 0x50);
    assert.equal(xlsx.body[1], 0x4b);
  });

  it("n'accepte que les jeux de données prévus", () => {
    assert.equal(parseExportDataset("sales"), "sales");
    assert.equal(parseExportDataset("other-business"), "sales");
  });
});

describe("permissions rapports", () => {
  it("réserve les rapports financiers à owner et manager", () => {
    assert.equal(canViewFinancialReports("owner"), true);
    assert.equal(canViewFinancialReports("manager"), true);
    assert.equal(can("cashier", "reports.view"), false);
    assert.equal(can("seller", "reports.view"), false);
  });
});

describe("params et cache", () => {
  it("ne met pas la période par défaut dans l'URL", () => {
    assert.equal(reportSearchQuery("month"), "");
    assert.equal(parseReportSearch({}).period, "month");
  });

  it("clé de cache par commerce, jamais un id navigateur isolé", () => {
    const keyA = reportsCacheKey("business-a", "month");
    const keyB = reportsCacheKey("business-b", "month");
    assert.notEqual(keyA, keyB);
    assert.ok(keyA.startsWith("reports:business-a:"));
  });
});
