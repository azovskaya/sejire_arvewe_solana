/**
 * Kaspi Pay Business (Merchant API v2).
 * Money never touches SEJIRE — Kaspi settles to the merchant account.
 *
 * Sandbox:  https://testpay.kaspi.kz/api/v2
 * Live:     https://pay.kaspi.kz/api/v2
 *
 * IIN/BIN + договор мерчанта выдаёт Kaspi. Этот модуль — только протокол.
 */

export const KASPI_LIVE_BASE = "https://pay.kaspi.kz/api/v2";
export const KASPI_TEST_BASE = "https://testpay.kaspi.kz/api/v2";

export type KaspiInvoice = {
  orderId: string;
  payUrl: string;
  rawStatus?: string;
};

export type KaspiStatus = "pending" | "paid" | "failed" | "unknown";

function bytesToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i += 1) {
    out |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  }
  return out === 0;
}

/** HMAC-SHA256 over sorted param values (Kaspi Merchant API v2). */
export async function signKaspiParams(
  params: Record<string, string>,
  apiKey: string
): Promise<string> {
  const joined = Object.keys(params)
    .sort()
    .map((k) => params[k])
    .join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(joined));
  return bytesToHex(sig);
}

export function mapKaspiStatus(raw: unknown): KaspiStatus {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "unknown";
  if (["APPROVED", "PAID", "PROCESSED", "SUCCESS", "OK", "CAPTURED"].includes(s)) {
    return "paid";
  }
  if (["DECLINED", "CANCELLED", "CANCELED", "ERROR", "FAILED", "REFUNDED"].includes(s)) {
    return "failed";
  }
  if (["PENDING", "CREATED", "NEW", "WAIT", "WAITING", "IN_PROGRESS"].includes(s)) {
    return "pending";
  }
  return "unknown";
}

export async function verifyKaspiWebhook(
  payload: Record<string, unknown>,
  apiKey: string
): Promise<boolean> {
  const signature = String(payload.signature || payload.sign || "");
  if (!signature) return false;
  const rest: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === "signature" || k === "sign") continue;
    if (v == null) continue;
    rest[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  const expected = await signKaspiParams(rest, apiKey);
  return timingSafeEqual(expected, signature);
}

function readPayUrl(data: Record<string, unknown>): string | null {
  const nested =
    data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : data;
  const url =
    nested.paymentUrl ||
    nested.payUrl ||
    nested.qrUrl ||
    nested.deepLink ||
    nested.redirectUrl ||
    nested.redirect_url ||
    data.paymentUrl;
  return typeof url === "string" && url.startsWith("http") ? url : null;
}

function readOrderId(data: Record<string, unknown>, fallback: string): string {
  const nested =
    data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : data;
  const id = nested.orderId || nested.id || nested.kaspiOrderId || data.orderId;
  return typeof id === "string" && id.length > 0 ? id : fallback;
}

export async function createKaspiInvoice(
  opts: {
    apiBase: string;
    apiKey: string;
    tradePointId?: string;
    amountTenge: number;
    orderId: string;
    description: string;
    returnUrl?: string;
    failUrl?: string;
  },
  fetchImpl: typeof fetch = fetch
): Promise<KaspiInvoice> {
  const params: Record<string, string> = {
    amount: String(Math.round(opts.amountTenge)),
    description: opts.description.slice(0, 255),
    orderId: opts.orderId,
  };
  if (opts.tradePointId) params.tradePointId = opts.tradePointId;
  if (opts.returnUrl) params.returnUrl = opts.returnUrl;
  if (opts.failUrl) params.failUrl = opts.failUrl;
  const signature = await signKaspiParams(params, opts.apiKey);
  const res = await fetchImpl(`${opts.apiBase.replace(/\/$/, "")}/orders/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({ ...params, signature }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error("kaspi_create_failed");
    (err as Error & { detail?: string }).detail = JSON.stringify(data).slice(0, 400);
    throw err;
  }
  const payUrl = readPayUrl(data);
  if (!payUrl) throw new Error("kaspi_missing_pay_url");
  return { orderId: readOrderId(data, opts.orderId), payUrl, rawStatus: String(data.status || "") };
}

export async function fetchKaspiOrderStatus(
  opts: { apiBase: string; apiKey: string; orderId: string },
  fetchImpl: typeof fetch = fetch
): Promise<KaspiStatus> {
  const res = await fetchImpl(
    `${opts.apiBase.replace(/\/$/, "")}/orders/${encodeURIComponent(opts.orderId)}/status`,
    { headers: { Authorization: `Bearer ${opts.apiKey}` } }
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error("kaspi_status_failed");
  return mapKaspiStatus(
    data.status || data.state || (data.data as { status?: string } | undefined)?.status
  );
}
