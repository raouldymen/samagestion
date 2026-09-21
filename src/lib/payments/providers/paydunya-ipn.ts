import { createHash, timingSafeEqual } from "node:crypto";
import type { PaymentEnvironment, PaymentTransactionStatus } from "@/lib/payments/types";

export type PaydunyaIpnPayload = {
  hash: string;
  status: string;
  mode: string;
  token: string;
  amount: number;
  internalReference: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function readAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseBracketPath(key: string): string[] {
  const match = key.match(/^([^[]+)(.*)$/);
  if (!match) {
    return [key];
  }
  const parts = [match[1]];
  for (const inner of match[2].matchAll(/\[([^\]]*)]/g)) {
    parts.push(inner[1]);
  }
  return parts.filter((part) => part !== "");
}

function setNested(target: Record<string, unknown>, path: string[], value: string) {
  let current = target;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    const next = current[key];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

function parseFormNested(rawBody: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const params = new URLSearchParams(rawBody);
  for (const [key, value] of params.entries()) {
    setNested(root, parseBracketPath(key), value);
  }
  return root;
}

export function mapPaydunyaStatus(status: string): PaymentTransactionStatus | "unknown" {
  const normalized = status.trim().toLowerCase();
  if (normalized === "completed") {
    return "successful";
  }
  if (normalized === "failed") {
    return "failed";
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return "cancelled";
  }
  if (normalized === "pending") {
    return "pending";
  }
  return "unknown";
}

export function paydunyaModeToEnvironment(mode: string): PaymentEnvironment {
  const normalized = mode.trim().toLowerCase();
  return normalized === "live" || normalized === "production" ? "production" : "test";
}

export function expectedPaydunyaHash(masterKey: string) {
  return createHash("sha512").update(masterKey, "utf8").digest("hex");
}

export function verifyPaydunyaHash(received: string, masterKey: string) {
  if (!received || !masterKey) {
    return false;
  }
  const expected = expectedPaydunyaHash(masterKey);
  const a = Buffer.from(received.trim().toLowerCase(), "utf8");
  const b = Buffer.from(expected.toLowerCase(), "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function extractPayload(source: Record<string, unknown>): PaydunyaIpnPayload | null {
  const data = asRecord(source.data) ?? source;
  const invoice = asRecord(data.invoice) ?? {};
  const custom = asRecord(data.custom_data) ?? asRecord(source.custom_data) ?? {};

  const token = readString(invoice.token || data.token);
  const hash = readString(data.hash);
  const status = readString(data.status);
  const mode = readString(data.mode);
  const amount = readAmount(invoice.total_amount ?? data.total_amount);
  const internalReference = readString(custom.internal_reference);

  if (!token || !hash || !status) {
    return null;
  }

  return {
    hash,
    status,
    mode,
    token,
    amount,
    internalReference,
  };
}

export function parsePaydunyaIpn(rawBody: string, contentType = ""): PaydunyaIpnPayload | null {
  const type = contentType.toLowerCase();

  if (type.includes("application/json") || rawBody.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(rawBody) as unknown;
      const record = asRecord(parsed);
      return record ? extractPayload(record) : null;
    } catch {
      return null;
    }
  }

  const form = parseFormNested(rawBody);
  const dataValue = form.data;
  if (typeof dataValue === "string") {
    try {
      const parsed = JSON.parse(dataValue) as unknown;
      const record = asRecord(parsed);
      if (record) {
        return extractPayload({ data: record });
      }
    } catch {
      // data n'est pas du JSON : on continue avec le formulaire imbriqué.
    }
  }

  return extractPayload(form);
}
