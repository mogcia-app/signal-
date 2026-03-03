const FALLBACK_PREFIX = "req";

const normalizePrefix = (prefix?: string): string => {
  const trimmed = String(prefix || "").trim();
  if (!trimmed) {
    return FALLBACK_PREFIX;
  }
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 32) || FALLBACK_PREFIX;
};

export const createIdempotencyKey = (prefix?: string): string => {
  const keyPrefix = normalizePrefix(prefix);
  const randomPart =
    typeof globalThis !== "undefined" && typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `${keyPrefix}-${randomPart}`;
};
