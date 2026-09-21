/**
 * Rate limiting best-effort en mémoire (par instance).
 * Complète (ne remplace pas) les limites Supabase Auth / hébergeur.
 * Pas de dépendance externe.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

export type RateLimitOptions = {
  /** Identifiant logique (ex. login:ip:1.2.3.4) */
  key: string;
  /** Fenêtre en ms */
  windowMs: number;
  /** Max requêtes dans la fenêtre */
  max: number;
  /** Horloge injectable pour les tests */
  now?: number;
};

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now();
  const existing = buckets.get(options.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(options.key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, options.max - 1),
      retryAfterSec: Math.ceil(options.windowMs / 1000),
    };
  }

  if (existing.count >= options.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(options.key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, options.max - existing.count),
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Réinitialise les buckets (tests uniquement). */
export function resetRateLimitBuckets() {
  buckets.clear();
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export const RATE_LIMITS = {
  login: { windowMs: 15 * 60_000, max: 20 },
  signup: { windowMs: 60 * 60_000, max: 10 },
  passwordReset: { windowMs: 60 * 60_000, max: 5 },
  checkout: { windowMs: 15 * 60_000, max: 30 },
  webhook: { windowMs: 60_000, max: 120 },
  mockSimulate: { windowMs: 15 * 60_000, max: 40 },
} as const;
