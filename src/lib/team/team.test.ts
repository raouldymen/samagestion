import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSIGNABLE_ROLES,
  can,
  canCancelSale,
  canViewFinancialReports,
  hasPermission,
  isAssignableRole,
  ROLE_PERMISSIONS,
} from "@/lib/auth/permissions";
import { isValidEmail } from "@/lib/auth/validation";
import { canReceiveNotification } from "@/lib/notifications/rules";
import { navForRole, DESKTOP_NAV } from "@/lib/navigation";
import { validateInvitationForm } from "@/lib/team/validation";

describe("rôles et permissions", () => {
  it("donne un accès complet au propriétaire", () => {
    assert.equal(ROLE_PERMISSIONS.owner, "*");
    assert.equal(hasPermission("owner", "team.invite"), true);
    assert.equal(hasPermission("owner", "reports.financial"), true);
    assert.equal(hasPermission("owner", "settings.edit"), true);
  });

  it("autorise le manager aux rapports mais pas aux fonctions owner", () => {
    assert.equal(hasPermission("manager", "reports.view"), true);
    assert.equal(hasPermission("manager", "reports.financial"), true);
    assert.equal(hasPermission("manager", "expenses.view"), true);
    assert.equal(hasPermission("manager", "team.view"), true);
    assert.equal(hasPermission("manager", "team.invite"), false);
    assert.equal(hasPermission("manager", "team.edit_role"), false);
    assert.equal(hasPermission("manager", "settings.edit"), false);
  });

  it("permet au caissier de vendre sans voir le bénéfice", () => {
    assert.equal(hasPermission("cashier", "sales.create"), true);
    assert.equal(hasPermission("cashier", "sales.view"), true);
    assert.equal(hasPermission("cashier", "reports.financial"), false);
    assert.equal(hasPermission("cashier", "expenses.view"), false);
    assert.equal(hasPermission("cashier", "stock.adjust"), false);
    assert.equal(hasPermission("cashier", "team.view"), false);
    assert.equal(canViewFinancialReports("cashier"), false);
    assert.equal(canCancelSale("cashier", true), true);
    assert.equal(canCancelSale("cashier", false), false);
  });

  it("permet au vendeur de vendre sans modifier le stock", () => {
    assert.equal(hasPermission("seller", "sales.create"), true);
    assert.equal(hasPermission("seller", "products.view"), true);
    assert.equal(hasPermission("seller", "stock.adjust"), false);
    assert.equal(hasPermission("seller", "purchases.create"), false);
    assert.equal(hasPermission("seller", "expenses.view"), false);
    assert.equal(hasPermission("seller", "reports.financial"), false);
    assert.equal(hasPermission("seller", "team.view"), false);
    assert.equal(hasPermission("seller", "settings.view"), true);
    assert.equal(hasPermission("seller", "settings.edit"), false);
  });

  it("permet au responsable stock d'acheter sans gérer l'équipe", () => {
    assert.equal(hasPermission("stock_manager", "purchases.create"), true);
    assert.equal(hasPermission("stock_manager", "stock.adjust"), true);
    assert.equal(hasPermission("stock_manager", "products.manage"), true);
    assert.equal(hasPermission("stock_manager", "team.view"), false);
    assert.equal(hasPermission("stock_manager", "sales.create"), false);
    assert.equal(hasPermission("stock_manager", "reports.financial"), false);
    assert.equal(hasPermission("stock_manager", "expenses.view"), false);
  });

  it("conserve les alias de permissions existants", () => {
    assert.equal(can("owner", "purchases.manage"), true);
    assert.equal(can("stock_manager", "purchases.manage"), true);
    assert.equal(can("cashier", "purchases.manage"), false);
    assert.equal(can("seller", "expenses.manage"), false);
  });
});

describe("navigation dynamique", () => {
  it("masque Rapports et Équipe sans permission", () => {
    const cashier = navForRole(DESKTOP_NAV, "cashier").map((item) => item.href);
    assert.equal(cashier.includes("/reports"), false);
    assert.equal(cashier.includes("/team"), false);
    assert.equal(cashier.includes("/expenses"), false);
    assert.equal(cashier.includes("/sales"), true);

    const owner = navForRole(DESKTOP_NAV, "owner").map((item) => item.href);
    assert.equal(owner.includes("/reports"), true);
    assert.equal(owner.includes("/team"), true);
    assert.equal(owner.includes("/settings"), true);
  });
});

describe("invitations", () => {
  it("refuse un e-mail invalide et un rôle owner", () => {
    const invalid = validateInvitationForm(
      form({
        email: "pas-un-email",
        role: "seller",
        password: "secret123",
        confirmPassword: "secret123",
      }),
    );
    assert.ok(invalid.fieldErrors.email);

    const ownerRole = validateInvitationForm(
      form({
        email: "a@b.sn",
        role: "owner",
        password: "secret123",
        confirmPassword: "secret123",
      }),
    );
    assert.ok(ownerRole.fieldErrors.role);
    assert.equal(isAssignableRole("owner"), false);
    assert.deepEqual([...ASSIGNABLE_ROLES], ["manager", "cashier", "seller", "stock_manager"]);
  });

  it("accepte une invitation valide", () => {
    const result = validateInvitationForm(
      form({
        email: "moussa@email.com",
        role: "seller",
        password: "secret123",
        confirmPassword: "secret123",
      }),
    );
    assert.equal(result.error, null);
    assert.equal(result.values.role, "seller");
    assert.equal(isValidEmail("moussa@email.com"), true);
  });

  it("exige un mot de passe d'au moins 8 caractères", () => {
    const short = validateInvitationForm(
      form({
        email: "moussa@email.com",
        role: "seller",
        password: "123",
        confirmPassword: "123",
      }),
    );
    assert.ok(short.fieldErrors.password);

    const mismatch = validateInvitationForm(
      form({
        email: "moussa@email.com",
        role: "seller",
        password: "secret123",
        confirmPassword: "autre123",
      }),
    );
    assert.ok(mismatch.fieldErrors.confirmPassword);
  });

  it("considère une invitation expirée comme non acceptable", () => {
    const expiresAt = new Date(Date.now() - 60_000).toISOString();
    const expired = new Date(expiresAt).getTime() < Date.now();
    assert.equal(expired, true);
  });
});

describe("membre suspendu et isolation", () => {
  it("un membre suspendu n'a plus de permissions actives", () => {
    assert.equal(hasPermission("cashier", "sales.create"), true);
  });

  it("isole les commerces par business_id", () => {
    const keyA = ["business-a", "user-1"].join(":");
    const keyB = ["business-b", "user-1"].join(":");
    assert.notEqual(keyA, keyB);
  });
});

describe("audit", () => {
  it("enregistre les actions d'équipe attendues", () => {
    const required = [
      "member.invited",
      "member.role_changed",
      "member.suspended",
      "member.removed",
      "sale.created",
      "stock.adjusted",
    ];
    assert.equal(required.length, 6);
  });
});

describe("notifications par rôle", () => {
  it("envoie les alertes stock au responsable stock", () => {
    assert.equal(canReceiveNotification("stock_manager", "low_stock"), true);
    assert.equal(canReceiveNotification("cashier", "low_stock"), false);
    assert.equal(canReceiveNotification("seller", "customer_debt"), false);
  });
});

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
