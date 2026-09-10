export const MOBILE_MONEY_METHODS = [
  { value: "wave", label: "Wave", hint: "Paiement via votre compte Wave" },
  {
    value: "orange_money",
    label: "Orange Money",
    hint: "Paiement via Orange Money (#144#)",
  },
] as const;

export type MobileMoneyMethod = (typeof MOBILE_MONEY_METHODS)[number]["value"];

export function isMobileMoneyMethod(value: string): value is MobileMoneyMethod {
  return MOBILE_MONEY_METHODS.some((m) => m.value === value);
}

export function mobileMoneyLabel(method: MobileMoneyMethod) {
  return MOBILE_MONEY_METHODS.find((m) => m.value === method)?.label ?? method;
}

/** Normalise un numéro SN vers +221XXXXXXXXX (9 chiffres locaux). */
export function normalizeSenegalPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let local = digits;

  if (local.startsWith("221") && local.length === 12) {
    local = local.slice(3);
  } else if (local.startsWith("00221") && local.length === 14) {
    local = local.slice(5);
  }

  if (!/^7\d{8}$/.test(local)) {
    return null;
  }

  return `+221${local}`;
}

export function isValidSenegalMobilePhone(raw: string) {
  return normalizeSenegalPhone(raw) !== null;
}
