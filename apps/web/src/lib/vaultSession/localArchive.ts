/**
 * Browser-local archive of vault versions.
 * Lets users see / reopen prior saves even when mock TX never hit Arweave.
 * Network GraphQL versions remain the source of truth when present.
 */

import type { EnvelopeV1 } from "../crypto/encrypt";

export type LocalVaultVersion = {
  /** Stable id: real Arweave TX, mock_…, or local_… */
  id: string;
  vaultId: string;
  savedAt: string;
  parentId: string | null;
  source: "network" | "sponsor" | "export" | "demo";
  envelope: EnvelopeV1;
};

const PREFIX = "sejire.vaultArchive.v1.";
const MAX_PER_VAULT = 40;

function key(vaultId: string) {
  return PREFIX + vaultId;
}

export function listLocalVaultVersions(vaultId: string): LocalVaultVersion[] {
  try {
    const raw = localStorage.getItem(key(vaultId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalVaultVersion[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v) => v && v.vaultId === vaultId && v.envelope?.schema === "sejire/envelope/v1")
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
  } catch {
    return [];
  }
}

export function getLocalVaultVersion(
  vaultId: string,
  id: string
): LocalVaultVersion | null {
  return listLocalVaultVersions(vaultId).find((v) => v.id === id) ?? null;
}

export function archiveLocalVaultVersion(entry: Omit<LocalVaultVersion, "savedAt"> & { savedAt?: string }) {
  const savedAt = entry.savedAt ?? new Date().toISOString();
  const next: LocalVaultVersion = { ...entry, savedAt };
  const prev = listLocalVaultVersions(entry.vaultId).filter((v) => v.id !== next.id);
  const merged = [next, ...prev].slice(0, MAX_PER_VAULT);
  try {
    localStorage.setItem(key(entry.vaultId), JSON.stringify(merged));
  } catch {
    /* quota */
  }
  return next;
}

export function makeLocalVersionId(prefix: "local" | "demo" | "mock" = "local"): string {
  const salt = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}_${salt}`;
}
