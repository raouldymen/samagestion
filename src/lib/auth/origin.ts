type RequestOriginInput = {
  origin: string | null;
  forwardedHost: string | null;
  host: string | null;
  forwardedProto: string | null;
  siteUrl?: string;
  allowedOrigins?: string;
  nodeEnv?: string;
};

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function allowedOriginSet(siteUrl?: string, allowedOrigins?: string) {
  const configuredOrigin = normalizeOrigin(siteUrl) ?? "http://localhost:3000";
  const configuredAllowedOrigins = (allowedOrigins ?? "http://localhost:3000")
    .split(",")
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));

  return {
    configuredOrigin,
    allowedOrigins: new Set([configuredOrigin, ...configuredAllowedOrigins]),
  };
}

function originFromRequest(input: RequestOriginInput) {
  const directOrigin = normalizeOrigin(input.origin);
  if (directOrigin) {
    return directOrigin;
  }

  const host = input.forwardedHost ?? input.host;
  if (!host) {
    return null;
  }

  const proto = input.forwardedProto?.split(",")[0]?.trim() || "http";
  return normalizeOrigin(`${proto}://${host}`);
}

/**
 * Retourne l'origine sûre à transmettre à Supabase pour les e-mails d'authentification.
 * En production, les en-têtes HTTP ne sont jamais une source d'autorité.
 */
export function resolveAuthOrigin(input: RequestOriginInput) {
  if (input.nodeEnv === "production") {
    const configuredOrigin = normalizeOrigin(input.siteUrl);

    if (!configuredOrigin) {
      throw new Error("AUTH_SITE_URL_INVALID");
    }

    return configuredOrigin;
  }

  const { configuredOrigin, allowedOrigins } = allowedOriginSet(input.siteUrl, input.allowedOrigins);

  const requestOrigin = originFromRequest(input);
  return requestOrigin && allowedOrigins.has(requestOrigin) ? requestOrigin : configuredOrigin;
}
