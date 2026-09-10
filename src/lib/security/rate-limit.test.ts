import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  checkRateLimit,
  clientIpFromHeaders,
  resetRateLimitBuckets,
} from "@/lib/security/rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it("autorise jusqu'à max puis bloque", () => {
    const base = { key: "t:login", windowMs: 60_000, max: 3, now: 1_000 };
    assert.equal(checkRateLimit(base).allowed, true);
    assert.equal(checkRateLimit({ ...base, now: 1_001 }).allowed, true);
    assert.equal(checkRateLimit({ ...base, now: 1_002 }).allowed, true);
    const blocked = checkRateLimit({ ...base, now: 1_003 });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.retryAfterSec >= 1);
  });

  it("réouvre la fenêtre après expiration", () => {
    const key = "t:window";
    assert.equal(checkRateLimit({ key, windowMs: 100, max: 1, now: 0 }).allowed, true);
    assert.equal(checkRateLimit({ key, windowMs: 100, max: 1, now: 50 }).allowed, false);
    assert.equal(checkRateLimit({ key, windowMs: 100, max: 1, now: 101 }).allowed, true);
  });

  it("extrait l'IP depuis x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    assert.equal(clientIpFromHeaders(headers), "1.2.3.4");
  });
});
