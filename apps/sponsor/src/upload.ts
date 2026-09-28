/**
 * Upload sealed envelope to Arweave via Turbo (treasury JWK).
 * Mock mode returns a deterministic fake tx id when TURBO_JWK is absent.
 */

import type { EnvelopeLike } from "./envelope";
import { uploadJsonWithTreasury } from "./turbo";

export type UploadResult = { txId: string; mock: boolean };

function mockTxId(vaultId: string): string {
  // Unique per upload so mock republish creates a distinct "version" id.
  const salt = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const base = `${vaultId}${salt}`.replace(/[^a-zA-Z0-9_-]/g, "x");
  return `mock_${base.slice(0, 38)}`;
}

export type UploadEnvelopeOptions = {
  turboJwk?: string;
  allowMockUpload: boolean;
  /** Previous vault TX under the same Vault-Id. */
  parentTxId?: string | null;
  updatedAt?: string;
};

export async function uploadEnvelope(
  envelope: EnvelopeLike,
  opts: UploadEnvelopeOptions
): Promise<UploadResult> {
  if (opts.turboJwk && opts.allowMockUpload) {
    throw new Error("mock_forbidden_with_treasury");
  }
  if (!opts.turboJwk) {
    if (!opts.allowMockUpload) {
      throw new Error("turbo_not_configured");
    }
    return { txId: mockTxId(String(envelope.vault_id || "vault")), mock: true };
  }

  const tags = buildArweaveTags(String(envelope.vault_id || "vault"), {
    parentTxId: opts.parentTxId,
    updatedAt: opts.updatedAt,
    schema: typeof envelope.schema === "string" ? envelope.schema : undefined,
  });
  const live = await uploadJsonWithTreasury(envelope, { turboJwk: opts.turboJwk, tags });
  return { txId: live.txId, mock: false };
}

export function buildArweaveTags(
  vaultId: string,
  opts?: { parentTxId?: string | null; updatedAt?: string; schema?: string }
): Array<[string, string]> {
  const tags: Array<[string, string]> = [
    ["Content-Type", "application/json"],
    ["App-Name", "SEJIRE"],
    ["Protocol", "sejire/v0.3"],
    ["Type", "vault-envelope"],
    ["Vault-Id", vaultId],
    ["Updated-At", opts?.updatedAt ?? new Date().toISOString()],
  ];
  if (opts?.schema) tags.push(["Schema", opts.schema]);
  if (opts?.parentTxId) tags.push(["Parent-Tx", opts.parentTxId]);
  return tags;
}

export const ARWEAVE_TAGS = [
  ["Content-Type", "application/json"],
  ["App-Name", "SEJIRE"],
  ["Protocol", "sejire/v0.3"],
  ["Type", "vault-envelope"],
] as const;
