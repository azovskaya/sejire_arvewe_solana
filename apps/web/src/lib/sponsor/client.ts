/**
 * SEJIRE sponsor cashier client — ciphertext only, never seed.
 */
import type { EnvelopeV1 } from "../crypto/encrypt";
import { getSponsorUrl } from "./config";

export type CheckoutResponse = {
  ok: true;
  sessionId: string;
  amountMinor: number;
  currency: string;
  provider: string;
  payUrl: string | null;
  mockPayable: boolean;
};

export type PublishResponse = {
  ok: true;
  txId: string;
  mock?: boolean;
  idempotent?: boolean;
  vaultId?: string;
};

type ErrBody = { ok?: false; error?: string; hint?: string };

async function sponsorFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getSponsorUrl();
  if (!base) throw new Error("VITE_SPONSOR_URL не задан");
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & ErrBody;
  if (!res.ok) {
    const err = (body as ErrBody).error || `HTTP ${res.status}`;
    const hint = (body as ErrBody).hint;
    throw new Error(hint ? `${err}: ${hint}` : err);
  }
  return body;
}

/** Guard: never send seed-shaped fields to the cashier. */
export function assertEnvelopeOnly(payload: { sessionId: string; envelope: EnvelopeV1 }) {
  const json = JSON.stringify(payload);
  const banned = ["mnemonic", "\"seed\"", "bip39", "\"trees\"", "\"people\""];
  for (const b of banned) {
    if (json.toLowerCase().includes(b.toLowerCase())) {
      throw new Error("refuse_seed_to_sponsor");
    }
  }
  if (payload.envelope.schema !== "sejire/envelope/v1") {
    throw new Error("bad_envelope_schema");
  }
}

export async function sponsorHealth(): Promise<{
  ok: boolean;
  provider?: string;
  priceMinor?: number;
  currency?: string;
  kaspiReady?: boolean;
  treasuryReady?: boolean;
}> {
  const res = await sponsorFetch("/v1/health", { method: "GET" });
  return readJson(res);
}

export async function sponsorCheckout(opts: {
  vaultId: string;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<CheckoutResponse> {
  const res = await sponsorFetch("/v1/checkout", {
    method: "POST",
    body: JSON.stringify(opts || {}),
  });
  return readJson(res);
}

/** Dev only — Worker rejects unless PAYMENT_PROVIDER=mock */
export async function sponsorMockPay(sessionId: string): Promise<void> {
  const res = await sponsorFetch("/v1/mock-pay", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
  await readJson(res);
}

export type SessionStatusResponse = {
  ok: true;
  sessionId: string;
  status: string;
  provider?: string;
  paid: boolean;
};

export async function sponsorSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
  const res = await sponsorFetch(`/v1/session?sessionId=${encodeURIComponent(sessionId)}`, {
    method: "GET",
  });
  return readJson(res);
}

export async function sponsorPublish(
  sessionId: string,
  envelope: EnvelopeV1,
  opts?: { parentTxId?: string | null }
): Promise<PublishResponse> {
  const payload = {
    sessionId,
    envelope,
    ...(opts?.parentTxId ? { parentTxId: opts.parentTxId } : {}),
  };
  assertEnvelopeOnly(payload);
  const res = await sponsorFetch("/v1/publish", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return readJson(res);
}
