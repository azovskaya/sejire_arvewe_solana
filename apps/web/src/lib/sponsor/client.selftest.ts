/**
 * Sponsor client selftest (no network).
 */
import { assertEnvelopeOnly } from "./client";
import type { EnvelopeV1 } from "../crypto/encrypt";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const envelope: EnvelopeV1 = {
  schema: "sejire/envelope/v1",
  vault_id: "vaultid12345678",
  cipher: "aes-gcm-256",
  kdf: "hkdf-sha256",
  iv: "AAEC",
  ciphertext: "Y2lwaGVydGV4dA",
  protocol: "sejire/v0.3",
};

let n = 0;
assertEnvelopeOnly({ sessionId: "sej_test", envelope });
n += 1;

try {
  const bad = {
    sessionId: "sej_test",
    envelope,
    mnemonic: "abandon abandon abandon",
  };
  assertEnvelopeOnly(bad as { sessionId: string; envelope: EnvelopeV1 });
  throw new Error("should refuse mnemonic field");
} catch (e) {
  assert(e instanceof Error && e.message === "refuse_seed_to_sponsor", "refuse seed");
  n += 1;
}

console.log(`sponsor.client.selftest: ${n} asserts ok`);
