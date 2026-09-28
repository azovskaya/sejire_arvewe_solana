/**
 * Payment providers: mock (dev) and Kaspi Pay Business (live).
 */

import {
  createKaspiInvoice,
  fetchKaspiOrderStatus,
  type KaspiInvoice,
  type KaspiStatus,
} from "./kaspi";
import { createSessionId, type PaymentSession, type SessionStore } from "./sessions";

export type CheckoutResult = {
  sessionId: string;
  amountMinor: number;
  currency: string;
  provider: string;
  /** Kaspi/deep-link when live; null in mock */
  payUrl: string | null;
  /** mock only — client can confirm without bank */
  mockPayable: boolean;
};

export type KaspiRuntime = {
  apiBase: string;
  apiKey: string;
  tradePointId?: string;
  description: string;
  returnUrl?: string;
  failUrl?: string;
  createInvoice?: typeof createKaspiInvoice;
  fetchStatus?: typeof fetchKaspiOrderStatus;
};

export async function createCheckoutSession(
  store: SessionStore,
  opts: {
    provider: string;
    amountMinor: number;
    currency: string;
    vaultId: string;
    kaspiMerchantToken?: string;
    successUrl?: string;
    cancelUrl?: string;
    kaspi?: KaspiRuntime;
  }
): Promise<CheckoutResult> {
  const provider = (opts.provider || "mock").toLowerCase();
  const vaultId = (opts.vaultId || "").trim();
  if (vaultId.length < 8) throw new Error("missing_vault_id");
  const id = createSessionId();
  const session: PaymentSession = {
    id,
    status: "pending",
    amountMinor: opts.amountMinor,
    currency: opts.currency,
    provider,
    vaultId,
    createdAt: Date.now(),
  };
  await store.put(session);

  if (provider === "mock") {
    return {
      sessionId: id,
      amountMinor: opts.amountMinor,
      currency: opts.currency,
      provider: "mock",
      payUrl: null,
      mockPayable: true,
    };
  }

  if (provider === "kaspi") {
    const token = opts.kaspiMerchantToken || opts.kaspi?.apiKey;
    if (!token) {
      const err = new Error("kaspi_merchant_not_configured");
      (err as Error & { code?: string }).code = "kaspi_merchant_not_configured";
      throw err;
    }
    const kaspi = opts.kaspi;
    if (!kaspi) throw new Error("kaspi_api_not_wired");
    const create = kaspi.createInvoice || createKaspiInvoice;
    const invoice: KaspiInvoice = await create({
      apiBase: kaspi.apiBase,
      apiKey: token,
      tradePointId: kaspi.tradePointId,
      amountTenge: opts.amountMinor,
      orderId: id,
      description: kaspi.description,
      returnUrl: kaspi.returnUrl || opts.successUrl,
      failUrl: kaspi.failUrl || opts.cancelUrl,
    });
    await store.put({ ...session, kaspiOrderId: invoice.orderId });
    return {
      sessionId: id,
      amountMinor: opts.amountMinor,
      currency: opts.currency,
      provider: "kaspi",
      payUrl: invoice.payUrl,
      mockPayable: false,
    };
  }

  const err = new Error("unknown_provider");
  (err as Error & { code?: string }).code = "unknown_provider";
  throw err;
}

export async function markSessionPaid(
  store: SessionStore,
  sessionId: string,
  opts: { allowMock: boolean; provider: string }
): Promise<PaymentSession> {
  const session = await store.get(sessionId);
  if (!session) throw new Error("session_not_found");
  if (session.status === "paid" || session.status === "consumed") return session;
  if (session.provider === "mock" && !opts.allowMock) {
    throw new Error("mock_pay_disabled");
  }
  if (session.provider !== "mock" && opts.provider === "mock") {
    throw new Error("provider_mismatch");
  }
  const next: PaymentSession = {
    ...session,
    status: "paid",
    paidAt: Date.now(),
  };
  await store.put(next);
  return next;
}

export async function syncKaspiSession(
  store: SessionStore,
  sessionId: string,
  kaspi: KaspiRuntime
): Promise<{ session: PaymentSession; kaspiStatus: KaspiStatus }> {
  const session = await store.get(sessionId);
  if (!session) throw new Error("session_not_found");
  if (session.status === "paid" || session.status === "consumed") {
    return { session, kaspiStatus: "paid" };
  }
  if (session.provider !== "kaspi") {
    return { session, kaspiStatus: "unknown" };
  }
  const orderId = session.kaspiOrderId || session.id;
  const fetchStatus = kaspi.fetchStatus || fetchKaspiOrderStatus;
  const kaspiStatus = await fetchStatus({
    apiBase: kaspi.apiBase,
    apiKey: kaspi.apiKey,
    orderId,
  });
  if (kaspiStatus === "paid") {
    const paid = await markSessionPaid(store, sessionId, { allowMock: false, provider: "kaspi" });
    return { session: paid, kaspiStatus };
  }
  return { session, kaspiStatus };
}

export async function assertSessionPaid(
  store: SessionStore,
  sessionId: string,
  expectedAmount: number,
  expectedVaultId?: string
): Promise<PaymentSession> {
  const session = await store.get(sessionId);
  if (!session) throw new Error("session_not_found");
  if (expectedVaultId && session.vaultId !== expectedVaultId) {
    throw new Error("vault_mismatch");
  }
  if (session.status === "consumed" && session.txId) return session;
  if (session.status !== "paid" && session.status !== "consumed") {
    throw new Error("not_paid");
  }
  if (session.amountMinor !== expectedAmount) {
    throw new Error("amount_mismatch");
  }
  return session;
}
