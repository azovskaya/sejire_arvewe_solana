/**
 * Envelope safety checks — reject anything that looks like seed/plaintext.
 * Shared rules for the cashier Worker (never touch BIP-39).
 */

const FORBIDDEN_KEYS = new Set([
  "mnemonic",
  "seed",
  "words",
  "bip39",
  "trees",
  "people",
  "plaintext",
  "phrase",
]);

export type EnvelopeLike = {
  schema?: string;
  vault_id?: string;
  cipher?: string;
  kdf?: string;
  iv?: string;
  ciphertext?: string;
  protocol?: string;
};

export function assertSafeEnvelope(raw: unknown): EnvelopeLike {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("invalid_envelope");
  }
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error("forbidden_field");
    }
  }
  if (obj.schema !== "sejire/envelope/v1") throw new Error("bad_schema");
  if (typeof obj.vault_id !== "string" || obj.vault_id.length < 8) {
    throw new Error("bad_vault_id");
  }
  if (obj.cipher !== "aes-gcm-256") throw new Error("bad_cipher");
  if (typeof obj.ciphertext !== "string" || obj.ciphertext.length < 8) {
    throw new Error("bad_ciphertext");
  }
  if (typeof obj.iv !== "string" || obj.iv.length < 4) throw new Error("bad_iv");
  return obj as EnvelopeLike;
}

export function envelopeByteLength(envelope: unknown): number {
  return new TextEncoder().encode(JSON.stringify(envelope)).length;
}
