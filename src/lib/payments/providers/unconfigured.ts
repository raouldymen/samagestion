/**
 * Adaptateur futur — documenter le prestataire choisi ici avant branchement.
 *
 * UX actuelle (PAYMENT_PROVIDER=mock) : /payment/mobile (Wave / Orange Money).
 * Confirmation réelle = agrégateur à brancher ici (ne pas inventer d'API).
 *
 * Prestataire cible (marché sénégalais) — à compléter :
 * - Nom : (ex. PayDunya / CinetPay / …)
 * - API :
 * - Checkout :
 * - Webhook : /api/webhooks/payments
 * - Signature :
 * - Devise : XOF
 * - Frais :
 * - Paiement récurrent :
 * - Moyens : Wave / Orange Money / carte…
 *
 * Tant que non documenté + clés absentes, garder MockPaymentProvider.
 */

import type { PaymentProvider } from "@/lib/payments/types";

export function createUnconfiguredProvider(name: string): PaymentProvider {
  return {
    name,
    async createCheckout() {
      throw new Error(`PROVIDER_NOT_CONFIGURED:${name}`);
    },
    async verifyPayment() {
      return { ok: false, status: "unknown" };
    },
    async handleWebhook() {
      return {
        ok: false,
        error: `PROVIDER_NOT_CONFIGURED:${name}`,
      };
    },
    async cancelSubscription() {
      return { ok: false };
    },
  };
}
