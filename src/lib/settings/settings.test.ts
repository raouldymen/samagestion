import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatReceiptAmount,
  receiptCustomerName,
  receiptPaymentLabel,
  sampleReceiptTotals,
} from "@/lib/receipts/format";
import { receiptTextLines } from "@/lib/receipts/pdf";
import { previewReceiptView } from "@/lib/receipts/preview";
import {
  displayCurrency,
  formatDocumentNumber,
  isReceiptFormat,
  logoStoragePath,
  sanitizeDocumentPrefix,
} from "@/lib/settings/constants";
import { validateBusinessProfile, validateDeleteBusinessForm, validateReceiptSettingsForm } from "@/lib/settings/validation";
import { hasPermission } from "@/lib/auth/permissions";
import type { ReceiptView } from "@/types/receipts";
import type { BusinessSettings } from "@/types/settings";

function settingsFor(businessId: string, name: string): BusinessSettings {
  return {
    businessId,
    name,
    phone: "77 000 00 00",
    email: null,
    address: "Dakar",
    city: "Dakar",
    country: "Sénégal",
    currency: "XOF",
    logoPath: `${businessId}/logo.png`,
    logoUrl: `https://example.com/${businessId}/logo.png`,
    receiptPrefix: "V",
    purchasePrefix: "A",
    receiptWidth: "80mm",
    showLogo: true,
    showPhone: true,
    showAddress: true,
    showCustomer: true,
    showSeller: true,
    showNotes: true,
    showMessage: true,
    receiptMessage: "Merci pour votre achat !",
    legalInformation: "NINEA : 123",
    timezone: "Africa/Dakar",
    locale: "fr",
    dateFormat: "short",
    numberFormat: "fr-FR",
  };
}

function sampleReceipt(overrides: Partial<ReceiptView> = {}): ReceiptView {
  const settings = settingsFor("biz-a", "Sama Boutique");
  return {
    ...previewReceiptView(settings),
    ...overrides,
  };
}

describe("paramètres du commerce", () => {
  it("exige un nom de commerce", () => {
    const form = new FormData();
    form.set("name", "");
    form.set("country", "Sénégal");
    const result = validateBusinessProfile(form);
    assert.ok(result.fieldErrors.name);
  });

  it("accepte un commerce sénégalais avec devise ISO", () => {
    const form = new FormData();
    form.set("name", "Sama Boutique");
    form.set("city", "Dakar");
    const result = validateBusinessProfile(form);
    assert.equal(result.error, null);
    assert.equal(result.values.country, "Sénégal");
    assert.equal(displayCurrency("XOF"), "FCFA");
  });
});

describe("numérotation", () => {
  it("formate V-000001 et FACT-000002", () => {
    assert.equal(formatDocumentNumber("V", 1), "V-000001");
    assert.equal(formatDocumentNumber("FACT", 2), "FACT-000002");
    assert.equal(sanitizeDocumentPrefix("fact-"), "FACT");
  });

  it("empêche les préfixes vides", () => {
    const form = new FormData();
    form.set("receiptPrefix", "--");
    form.set("purchasePrefix", "A");
    form.set("receiptWidth", "80mm");
    const result = validateReceiptSettingsForm(form);
    assert.ok(result.fieldErrors.receiptPrefix);
  });
});

describe("reçus", () => {
  it("affiche un client comptoir sans client", () => {
    assert.equal(receiptCustomerName(null), "Client comptoir");
    assert.equal(receiptCustomerName("Moussa Diop"), "Moussa Diop");
  });

  it("calcule une vente payée de 50 000", () => {
    const totals = sampleReceiptTotals(50000, 50000);
    assert.equal(totals.total, 50000);
    assert.equal(totals.amountPaid, 50000);
    assert.equal(totals.amountDue, 0);
    assert.equal(totals.paymentStatus, "paid");
    assert.equal(receiptPaymentLabel("paid", "completed"), "PAYÉ");
    assert.equal(formatReceiptAmount(50000).replace(/\s/g, ""), "50000");
  });

  it("calcule une vente à crédit", () => {
    const totals = sampleReceiptTotals(20000, 50000);
    assert.equal(totals.amountPaid, 20000);
    assert.equal(totals.amountDue, 30000);
    assert.equal(totals.paymentStatus, "partial");
    assert.equal(receiptPaymentLabel("unpaid", "completed"), "À CRÉDIT");
    assert.equal(receiptPaymentLabel("partial", "completed"), "PARTIEL");
  });

  it("marque clairement une vente annulée", () => {
    const lines = receiptTextLines(
      sampleReceipt({
        status: "cancelled",
        paymentStatus: "paid",
        total: 50000,
        amountPaid: 50000,
        amountDue: 0,
      }),
    );
    assert.equal(lines[0], "VENTE ANNULEE");
    assert.ok(lines.includes("VENTE ANNULÉE") || lines.includes("VENTE ANNULEE"));
  });

  it("supporte 58 mm, 80 mm et A4", () => {
    assert.equal(isReceiptFormat("58mm"), true);
    assert.equal(isReceiptFormat("80mm"), true);
    assert.equal(isReceiptFormat("A4"), true);
    assert.equal(isReceiptFormat("letter"), false);

    const form = new FormData();
    form.set("receiptPrefix", "V");
    form.set("purchasePrefix", "A");
    form.set("receiptWidth", "58mm");
    form.set("showLogo", "on");
    const result = validateReceiptSettingsForm(form);
    assert.equal(result.values.receiptWidth, "58mm");
    assert.equal(result.values.showLogo, true);
    assert.equal(result.values.showPhone, false);
  });

  it("isole les paramètres par commerce", () => {
    const previewA = previewReceiptView(settingsFor("biz-a", "Boutique A"));
    const previewB = previewReceiptView(settingsFor("biz-b", "Boutique B"));
    assert.equal(previewA.businessName, "Boutique A");
    assert.equal(previewB.businessName, "Boutique B");
    assert.notEqual(previewA.settings.legalInformation, undefined);
    assert.notEqual(settingsFor("biz-a", "A").logoPath, settingsFor("biz-b", "B").logoPath);
  });
});

describe("suppression du commerce", () => {
  it("exige le mot de passe du propriétaire", () => {
    const empty = validateDeleteBusinessForm(new FormData());
    assert.ok(empty.fieldErrors.password);

    const form = new FormData();
    form.set("password", "secret123");
    const ok = validateDeleteBusinessForm(form);
    assert.equal(ok.error, null);
    assert.equal(ok.values.password, "secret123");
  });
});

describe("permissions paramètres", () => {
  it("interdit au vendeur de modifier les paramètres", () => {
    assert.equal(hasPermission("seller", "settings.view"), true);
    assert.equal(hasPermission("seller", "settings.edit"), false);
    assert.equal(hasPermission("manager", "settings.edit"), false);
    assert.equal(hasPermission("owner", "settings.edit"), true);
  });
});

describe("logo", () => {
  it("extrait le chemin de stockage", () => {
    assert.equal(logoStoragePath("abc/logo.png"), "abc/logo.png");
    assert.equal(
      logoStoragePath("https://x.supabase.co/storage/v1/object/public/business-logos/abc/logo.png"),
      "abc/logo.png",
    );
  });
});
