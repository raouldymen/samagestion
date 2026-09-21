import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dashboardPeriodRange,
  financialSummary,
  percentChange,
} from "./summary";

describe("calculs financiers", () => {
  it("calcule CA, marge et bénéfice net", () => {
    const summary = financialSummary({
      revenue: 100_000,
      collected: 100_000,
      receivables: 0,
      salesCount: 1,
      cogs: 60_000,
      expenses: 10_000,
    });

    assert.equal(summary.revenue, 100_000);
    assert.equal(summary.cogs, 60_000);
    assert.equal(summary.grossMargin, 40_000);
    assert.equal(summary.expenses, 10_000);
    assert.equal(summary.netProfit, 30_000);
  });

  it("sépare CA, encaissé et créance sur une vente à crédit", () => {
    const summary = financialSummary({
      revenue: 100_000,
      collected: 40_000,
      receivables: 60_000,
      salesCount: 1,
      cogs: 60_000,
      expenses: 0,
    });

    assert.equal(summary.revenue, 100_000);
    assert.equal(summary.collected, 40_000);
    assert.equal(summary.receivables, 60_000);
    assert.equal(summary.grossMargin, 40_000);
  });

  it("exclut une vente annulée en n'incluant pas son montant", () => {
    const completed = financialSummary({
      revenue: 100_000,
      collected: 100_000,
      receivables: 0,
      salesCount: 1,
      cogs: 60_000,
      expenses: 0,
    });
    const afterCancel = financialSummary({
      revenue: 0,
      collected: 0,
      receivables: 0,
      salesCount: 0,
      cogs: 0,
      expenses: 0,
    });

    assert.equal(completed.revenue, 100_000);
    assert.equal(afterCancel.revenue, 0);
    assert.equal(afterCancel.grossMargin, 0);
    assert.equal(afterCancel.netProfit, 0);
  });

  it("exclut une dépense annulée des totaux", () => {
    const withActive = financialSummary({
      revenue: 100_000,
      collected: 100_000,
      receivables: 0,
      salesCount: 1,
      cogs: 60_000,
      expenses: 10_000,
    });
    const afterCancel = financialSummary({
      revenue: 100_000,
      collected: 100_000,
      receivables: 0,
      salesCount: 1,
      cogs: 60_000,
      expenses: 0,
    });

    assert.equal(withActive.netProfit, 30_000);
    assert.equal(afterCancel.netProfit, 40_000);
  });

  it("évite la division par zéro sans vente", () => {
    const summary = financialSummary({
      revenue: 0,
      collected: 0,
      receivables: 0,
      salesCount: 0,
      cogs: 0,
      expenses: 0,
    });

    assert.equal(summary.avgBasket, 0);
    assert.equal(summary.netProfit, 0);
  });
});

describe("évolution", () => {
  it("calcule un pourcentage positif", () => {
    const trend = percentChange(485_000, 430_000);
    assert.equal(trend.direction, "up");
    assert.equal(trend.label, "+12,8 %");
  });

  it("n'affiche pas Infinity si le précédent vaut 0", () => {
    const neu = percentChange(100, 0);
    assert.equal(neu.direction, "new");
    assert.equal(neu.label, "Nouveau");
    assert.equal(neu.percent, null);

    const empty = percentChange(0, 0);
    assert.equal(empty.label, "—");
    assert.equal(empty.percent, null);
  });
});

describe("périodes dashboard", () => {
  it("compare aujourd'hui à hier sur 24 h", () => {
    const range = dashboardPeriodRange("today", new Date("2026-08-27T15:00:00Z"));
    assert.equal(range.from, "2026-08-27T00:00:00.000Z");
    assert.equal(range.to, "2026-08-28T00:00:00.000Z");
    assert.equal(range.prevFrom, "2026-08-26T00:00:00.000Z");
    assert.equal(range.prevTo, "2026-08-27T00:00:00.000Z");
  });

  it("compare 7 jours à 7 jours précédents", () => {
    const range = dashboardPeriodRange("7d", new Date("2026-08-27T15:00:00Z"));
    assert.equal(range.from, "2026-08-21T00:00:00.000Z");
    assert.equal(range.to, "2026-08-28T00:00:00.000Z");
    assert.equal(range.prevFrom, "2026-08-14T00:00:00.000Z");
    assert.equal(range.prevTo, "2026-08-21T00:00:00.000Z");
  });

  it("compare une plage personnalisée à la période précédente de même durée", () => {
    const range = dashboardPeriodRange(
      "custom",
      new Date("2026-08-27T15:00:00Z"),
      "2026-08-10",
      "2026-08-12",
    );
    assert.equal(range.from, "2026-08-10T00:00:00.000Z");
    assert.equal(range.to, "2026-08-13T00:00:00.000Z");
    assert.equal(range.prevFrom, "2026-08-07T00:00:00.000Z");
    assert.equal(range.prevTo, "2026-08-10T00:00:00.000Z");
  });
});
