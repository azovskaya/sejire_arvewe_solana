/**
 * Project ops ledger: counts and timestamps only.
 * Never stores names, 12 words, vault ids, or ciphertext.
 * Unique trees are keyed by HMAC(salt, vaultId) which is not shown in the admin UI.
 */

export type OpsPayment = {
  at: number;
  amountMinor: number;
  currency: string;
  provider: string;
  status: "paid" | "saved";
  /** HMAC of session id — internal idempotency, never returned. */
  sid: string;
};

export type OpsVault = {
  firstAt: number;
  saves: number;
};

export type OpsState = {
  vaults: Record<string, OpsVault>;
  payments: OpsPayment[];
};

export type OpsPublic = {
  trees: number;
  saves: number;
  paidCount: number;
  paidMinor: number;
  currency: string;
  created: { at: string }[];
  payments: {
    at: string;
    amountMinor: number;
    currency: string;
    provider: string;
    status: "paid" | "saved";
  }[];
};

export const EMPTY_OPS: OpsState = { vaults: {}, payments: [] };

export interface OpsStore {
  load(): Promise<OpsState>;
  save(state: OpsState): Promise<void>;
}

export function memoryOpsStore(initial: OpsState = EMPTY_OPS): OpsStore {
  let state: OpsState = cloneOps(initial);
  return {
    async load() {
      return cloneOps(state);
    },
    async save(next) {
      state = cloneOps(next);
    },
  };
}

export function kvOpsStore(kv: KVNamespace, key = "ops:state"): OpsStore {
  return {
    async load() {
      const raw = await kv.get(key);
      if (!raw) return cloneOps(EMPTY_OPS);
      try {
        const parsed = JSON.parse(raw) as OpsState;
        return {
          vaults: parsed.vaults && typeof parsed.vaults === "object" ? parsed.vaults : {},
          payments: Array.isArray(parsed.payments) ? parsed.payments : [],
        };
      } catch {
        return cloneOps(EMPTY_OPS);
      }
    },
    async save(state) {
      await kv.put(key, JSON.stringify(state));
    },
  };
}

function cloneOps(state: OpsState): OpsState {
  return {
    vaults: { ...state.vaults },
    payments: state.payments.map((p) => ({ ...p })),
  };
}

export async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function recordPaid(
  store: OpsStore,
  salt: string,
  event: {
    sessionId: string;
    amountMinor: number;
    currency: string;
    provider: string;
    at?: number;
  }
): Promise<void> {
  const sid = await hmacHex(salt, `sid:${event.sessionId}`);
  const state = await store.load();
  if (state.payments.some((p) => p.sid === sid)) {
    await store.save(state);
    return;
  }
  state.payments.push({
    at: event.at ?? Date.now(),
    amountMinor: event.amountMinor,
    currency: event.currency,
    provider: event.provider,
    status: "paid",
    sid,
  });
  await store.save(state);
}

export async function recordSaved(
  store: OpsStore,
  salt: string,
  event: {
    sessionId: string;
    vaultId: string;
    at?: number;
  }
): Promise<void> {
  const hid = await hmacHex(salt, `vault:${event.vaultId}`);
  const sid = await hmacHex(salt, `sid:${event.sessionId}`);
  const state = await store.load();
  const at = event.at ?? Date.now();
  const existing = state.vaults[hid];
  if (existing) {
    state.vaults[hid] = { firstAt: existing.firstAt, saves: existing.saves + 1 };
  } else {
    state.vaults[hid] = { firstAt: at, saves: 1 };
  }
  const pay = state.payments.find((p) => p.sid === sid);
  if (pay) pay.status = "saved";
  await store.save(state);
}

export function toPublicOps(state: OpsState, fallbackCurrency = "KZT"): OpsPublic {
  const vaultList = Object.values(state.vaults);
  const created = vaultList
    .map((v) => v.firstAt)
    .sort((a, b) => b - a)
    .map((at) => ({ at: new Date(at).toISOString() }));
  const payments = [...state.payments]
    .sort((a, b) => b.at - a.at)
    .map((p) => ({
      at: new Date(p.at).toISOString(),
      amountMinor: p.amountMinor,
      currency: p.currency,
      provider: p.provider,
      status: p.status,
    }));
  const paidMinor = state.payments.reduce((sum, p) => sum + p.amountMinor, 0);
  return {
    trees: vaultList.length,
    saves: vaultList.reduce((sum, v) => sum + v.saves, 0),
    paidCount: state.payments.length,
    paidMinor,
    currency: state.payments[0]?.currency || fallbackCurrency,
    created,
    payments,
  };
}

export function assertNoSecretsInPublic(pub: OpsPublic): void {
  const blob = JSON.stringify(pub);
  if (/"vaultId"|"vault_id"|"mnemonic"|"seed"|"ciphertext"/i.test(blob)) {
    throw new Error("ops_leaked_user");
  }
}
