/**
 * Prestataire réel : PayDunya (PAR).
 * Doc : https://developers.paydunya.com/doc/EN/http_json
 *
 * - Nom : PayDunya
 * - API : POST /v1/checkout-invoice/create + GET /v1/checkout-invoice/confirm/{token}
 * - Checkout : page hébergée (Wave SN / Orange Money SN)
 * - Webhook : POST /api/webhooks/payments (form-urlencoded, hash SHA-512 MasterKey)
 * - Devise : XOF
 * - Paiement récurrent : non (un checkout par mois)
 * - Moyens : wave-senegal, orange-money-senegal
 *
 * Activer avec PAYMENT_PROVIDER=paydunya + clés (sinon Mock).
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
