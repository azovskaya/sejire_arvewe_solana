/**
 * Payment session store — Cloudflare KV in prod, in-memory for mock/dev.
 */

export type SessionStatus = "pending" | "paid" | "consumed";

export type PaymentSession = {
  id: string;
  status: SessionStatus;
  amountMinor: number;
  currency: string;
  provider: string;
  /** Vault this payment may publish — bind at checkout. */
  vaultId: string;
  /** Kaspi merchant order id (our session id unless Kaspi rewrote it). */
  kaspiOrderId?: string;
  createdAt: number;
  paidAt?: number;
  txId?: string;
};

export interface SessionStore {
  get(id: string): Promise<PaymentSession | null>;
  put(session: PaymentSession): Promise<void>;
  /** Lookup by Kaspi-side order id when it differs from our session id. */
  getByKaspiOrderId(orderId: string): Promise<PaymentSession | null>;
}

function kaspiIndexKey(orderId: string): string {
  return `kaspi:${orderId}`;
}

export function memorySessionStore(): SessionStore {
  const memory = new Map<string, PaymentSession>();
  const byKaspi = new Map<string, string>();
  return {
    async get(id) {
      return memory.get(id) ?? null;
    },
    async put(session) {
      memory.set(session.id, session);
      if (session.kaspiOrderId && session.kaspiOrderId !== session.id) {
        byKaspi.set(session.kaspiOrderId, session.id);
      }
    },
    async getByKaspiOrderId(orderId) {
      const id = byKaspi.get(orderId);
      return id ? memory.get(id) ?? null : null;
    },
  };
}

export function kvSessionStore(kv: KVNamespace): SessionStore {
  return {
    async get(id) {
      const raw = await kv.get(id);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as PaymentSession;
      } catch {
        return {
          id,
          status: "consumed",
          amountMinor: 0,
          currency: "USD",
          provider: "legacy",
          vaultId: "",
          createdAt: 0,
          txId: raw,
        };
      }
    },
    async put(session) {
      await kv.put(session.id, JSON.stringify(session));
      if (session.kaspiOrderId && session.kaspiOrderId !== session.id) {
        await kv.put(kaspiIndexKey(session.kaspiOrderId), session.id);
      }
    },
    async getByKaspiOrderId(orderId) {
      const mapped = await kv.get(kaspiIndexKey(orderId));
      if (mapped) return this.get(mapped);
      return this.get(orderId);
    },
  };
}

export async function findSessionByOrderId(
  store: SessionStore,
  orderId: string
): Promise<PaymentSession | null> {
  const direct = await store.get(orderId);
  if (direct) return direct;
  return store.getByKaspiOrderId(orderId);
}

export function createSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `sej_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
