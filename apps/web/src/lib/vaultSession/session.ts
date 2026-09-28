/**
 * In-session vault context after restore / publish.
 * Mnemonic stays in memory only (never localStorage).
 */

export type VaultSessionMeta = {
  vaultId: string;
  /** Last opened or published network TX for this vault (HEAD). */
  headTxId: string | null;
  source: "network" | "local" | "file" | "publish";
};

const META_KEY = "sejire.vaultSession.v1";

let memoryMnemonic: string | null = null;

export function setVaultSession(meta: VaultSessionMeta, mnemonic?: string | null) {
  try {
    sessionStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* private mode / quota */
  }
  if (mnemonic !== undefined) {
    memoryMnemonic = mnemonic;
  }
}

export function getVaultSession(): VaultSessionMeta | null {
  try {
    const raw = sessionStorage.getItem(META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VaultSessionMeta;
    if (!parsed?.vaultId || typeof parsed.vaultId !== "string") return null;
    return {
      vaultId: parsed.vaultId,
      headTxId: parsed.headTxId ?? null,
      source: parsed.source ?? "network",
    };
  } catch {
    return null;
  }
}

export function getSessionMnemonic(): string | null {
  return memoryMnemonic;
}

export function updateVaultHead(txId: string) {
  const cur = getVaultSession();
  if (!cur) return;
  setVaultSession({ ...cur, headTxId: txId, source: "publish" });
}

export function clearVaultSession() {
  memoryMnemonic = null;
  try {
    sessionStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
}
