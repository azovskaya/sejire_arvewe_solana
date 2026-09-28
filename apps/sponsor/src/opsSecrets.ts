import { parseTreasuryJwk } from "./turbo";

export const OPS_SECRETS_KEY = "ops:secrets";

export type PaymentProviderSetting = "mock" | "kaspi";

export type StoredOpsSecrets = {
  passwordHash?: string;
  opsSalt?: string;
  turboJwk?: string;
  siteJwk?: string;
  kaspiMerchantToken?: string;
  kaspiTradePointId?: string;
  kaspiApiBase?: string;
  paymentProvider?: PaymentProviderSetting;
  publishPriceMinor?: string;
  publishCurrency?: string;
  appOrigin?: string;
};

export type RedactedOpsSecrets = {
  persisted: boolean;
  treasuryConfigured: boolean;
  treasuryAddress: string | null;
  siteKeyConfigured: boolean;
  kaspiTokenConfigured: boolean;
  kaspiTradePointId: string;
  kaspiApiBase: string;
  paymentProvider: PaymentProviderSetting;
  publishPriceMinor: string;
  publishCurrency: string;
  appOrigin: string;
  passwordConfigured: boolean;
};

type KvEnv = {
  IDEMPOTENCY?: KVNamespace;
};

type EnvLike = {
  TURBO_JWK?: string;
  SITE_JWK?: string;
  KASPI_MERCHANT_TOKEN?: string;
  KASPI_TRADE_POINT_ID?: string;
  KASPI_API_BASE?: string;
  PAYMENT_PROVIDER?: string;
  PUBLISH_PRICE_MINOR?: string;
  PUBLISH_CURRENCY?: string;
  APP_ORIGIN?: string;
  ADMIN_TOKEN?: string;
  TREASURY_ADDRESS?: string;
  IDEMPOTENCY?: KVNamespace;
};

let memorySecrets: StoredOpsSecrets = {};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function parseStoredSecrets(value: unknown): StoredOpsSecrets {
  const rec = asRecord(value);
  const provider =
    rec.paymentProvider === "kaspi" ? "kaspi" : rec.paymentProvider === "mock" ? "mock" : undefined;
  return {
    passwordHash: str(rec.passwordHash),
    opsSalt: str(rec.opsSalt),
    turboJwk: str(rec.turboJwk),
    siteJwk: str(rec.siteJwk),
    kaspiMerchantToken: str(rec.kaspiMerchantToken),
    kaspiTradePointId: str(rec.kaspiTradePointId) || str(rec.kaspiTradePoint),
    kaspiApiBase: str(rec.kaspiApiBase),
    paymentProvider: provider,
    publishPriceMinor: str(rec.publishPriceMinor) || str(rec.priceKzt),
    publishCurrency: str(rec.publishCurrency) || str(rec.currency),
    appOrigin: str(rec.appOrigin),
  };
}

export function kvBound(env: KvEnv): boolean {
  return Boolean(env.IDEMPOTENCY);
}

export async function loadOpsSecrets(env: KvEnv): Promise<StoredOpsSecrets> {
  if (!env.IDEMPOTENCY) return { ...memorySecrets };
  try {
    const raw = await env.IDEMPOTENCY.get(OPS_SECRETS_KEY, "json");
    return parseStoredSecrets(raw);
  } catch {
    return {};
  }
}

export async function saveOpsSecrets(env: KvEnv, secrets: StoredOpsSecrets): Promise<void> {
  memorySecrets = { ...secrets };
  if (env.IDEMPOTENCY) {
    await env.IDEMPOTENCY.put(OPS_SECRETS_KEY, JSON.stringify(secrets));
  }
}

export function randomOpsSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function assignOptional(
  next: StoredOpsSecrets,
  key: keyof StoredOpsSecrets,
  value: unknown,
  emptyClears: boolean,
) {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (!trimmed) {
    if (emptyClears) delete next[key];
    return;
  }
  (next as Record<string, unknown>)[key] = trimmed;
}

export function applySecretPatch(
  current: StoredOpsSecrets,
  patch: Record<string, unknown>,
): StoredOpsSecrets {
  const next = { ...current };
  assignOptional(next, "turboJwk", patch.turboJwk, false);
  assignOptional(next, "siteJwk", patch.siteJwk, false);
  assignOptional(next, "kaspiMerchantToken", patch.kaspiMerchantToken, false);
  assignOptional(next, "kaspiTradePointId", patch.kaspiTradePointId, true);
  assignOptional(next, "kaspiApiBase", patch.kaspiApiBase, true);
  assignOptional(next, "publishPriceMinor", patch.publishPriceMinor, false);
  assignOptional(next, "publishCurrency", patch.publishCurrency, false);
  assignOptional(next, "appOrigin", patch.appOrigin, false);

  if (patch.paymentProvider === "kaspi" || patch.paymentProvider === "mock") {
    next.paymentProvider = patch.paymentProvider;
  }
  if (patch.clearTreasury === true) delete next.turboJwk;
  if (patch.clearSiteKey === true) delete next.siteJwk;
  if (patch.clearKaspiToken === true) delete next.kaspiMerchantToken;
  return next;
}

export function assertJwkJson(raw: string, label: string): void {
  try {
    parseTreasuryJwk(raw);
  } catch {
    throw new Error(`${label}_invalid`);
  }
}

export async function deriveTreasuryAddress(jwkJson: string | undefined): Promise<string | null> {
  if (!jwkJson) return null;
  try {
    const jwk = parseTreasuryJwk(jwkJson);
    const { default: Arweave } = await import("arweave");
    const arweave = Arweave.init({ host: "arweave.net", port: 443, protocol: "https" });
    return await arweave.wallets.jwkToAddress(jwk);
  } catch {
    return null;
  }
}

export async function generateTreasuryJwk(): Promise<{ jwk: string; address: string }> {
  const { default: Arweave } = await import("arweave");
  const arweave = Arweave.init({ host: "arweave.net", port: 443, protocol: "https" });
  const jwk = await arweave.wallets.generate();
  const address = await arweave.wallets.jwkToAddress(jwk);
  return { jwk: JSON.stringify(jwk), address };
}

export async function redactSecrets(env: EnvLike, secrets: StoredOpsSecrets): Promise<RedactedOpsSecrets> {
  const turbo = secrets.turboJwk || env.TURBO_JWK;
  const derived = await deriveTreasuryAddress(turbo);
  return {
    persisted: kvBound(env),
    treasuryConfigured: Boolean(turbo),
    treasuryAddress: derived || (env.TREASURY_ADDRESS || "").trim() || null,
    siteKeyConfigured: Boolean(secrets.siteJwk || env.SITE_JWK),
    kaspiTokenConfigured: Boolean(secrets.kaspiMerchantToken || env.KASPI_MERCHANT_TOKEN),
    kaspiTradePointId: secrets.kaspiTradePointId || env.KASPI_TRADE_POINT_ID || "",
    kaspiApiBase: secrets.kaspiApiBase || env.KASPI_API_BASE || "",
    paymentProvider: secrets.paymentProvider || (env.PAYMENT_PROVIDER === "kaspi" ? "kaspi" : "mock"),
    publishPriceMinor: secrets.publishPriceMinor || env.PUBLISH_PRICE_MINOR || "",
    publishCurrency: secrets.publishCurrency || env.PUBLISH_CURRENCY || "KZT",
    appOrigin: secrets.appOrigin || env.APP_ORIGIN || "",
    passwordConfigured: Boolean(secrets.passwordHash || ((env.ADMIN_TOKEN || "").trim().length >= 16)),
  };
}

export function mergeRuntime<T extends EnvLike>(env: T, secrets: StoredOpsSecrets): T {
  return {
    ...env,
    TURBO_JWK: secrets.turboJwk || env.TURBO_JWK,
    SITE_JWK: secrets.siteJwk || env.SITE_JWK,
    KASPI_MERCHANT_TOKEN: secrets.kaspiMerchantToken || env.KASPI_MERCHANT_TOKEN,
    KASPI_TRADE_POINT_ID: secrets.kaspiTradePointId || env.KASPI_TRADE_POINT_ID,
    KASPI_API_BASE: secrets.kaspiApiBase || env.KASPI_API_BASE,
    PAYMENT_PROVIDER: secrets.paymentProvider || env.PAYMENT_PROVIDER,
    PUBLISH_PRICE_MINOR: secrets.publishPriceMinor || env.PUBLISH_PRICE_MINOR,
    PUBLISH_CURRENCY: secrets.publishCurrency || env.PUBLISH_CURRENCY,
    APP_ORIGIN: secrets.appOrigin || env.APP_ORIGIN,
  };
}

export function runtimeOpsSalt(env: { OPS_SALT?: string; ADMIN_TOKEN?: string }, secrets: StoredOpsSecrets): string {
  return (env.OPS_SALT || secrets.opsSalt || env.ADMIN_TOKEN || "sejire-ops-dev").trim();
}

/** Test helper: drop the in-memory fallback between cases. */
export function resetMemorySecrets(): void {
  memorySecrets = {};
}
