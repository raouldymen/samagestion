import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAdminPeriodDays, parseAdminPlanSlug, parseAdminTrialDays } from "./validation";

describe("actions super admin", () => {
  it("accepte les formules connues", () => {
    assert.equal(parseAdminPlanSlug("pro"), "pro");
    assert.equal(parseAdminPlanSlug("business"), "business");
    assert.equal(parseAdminPlanSlug("free"), "free");
    assert.equal(parseAdminPlanSlug("premium"), null);
  });

  it("limite la durée d'un plan forcé", () => {
    assert.equal(parseAdminPeriodDays("30", "pro"), 30);
    assert.equal(parseAdminPeriodDays("90", "business"), 90);
    assert.equal(parseAdminPeriodDays("12", "pro"), null);
    assert.equal(parseAdminPeriodDays("ignored", "free"), 30);
  });

  it("limite la prolongation d'essai", () => {
    assert.equal(parseAdminTrialDays("14"), 14);
    assert.equal(parseAdminTrialDays("60"), 60);
    assert.equal(parseAdminTrialDays("3"), null);
  });
});
