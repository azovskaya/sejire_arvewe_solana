import forge from "node-forge";
import type { JWKInterface } from "arweave/web/lib/wallet";
import { bytesToHex } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { createArweaveClient } from "./client";

/**
 * Deterministic RSA-2048 JWK from BIP-39 seed.
 * Same seed → same Arweave address (required for recover-anywhere).
 * Spec: docs/security/SEED_ACCESS.md
 */
export async function jwkFromSeed(seed: Uint8Array): Promise<JWKInterface> {
  // Yield to UI between heavy steps
  await new Promise((r) => setTimeout(r, 0));

  let state = sha256(seed);
  const prng = {
    getBytesSync(size: number) {
      let out = "";
      while (out.length < size) {
        state = sha256(state);
        for (let i = 0; i < state.length; i += 1) {
          out += String.fromCharCode(state[i]);
        }
      }
      return out.slice(0, size);
    },
  };

  const keyPair = forge.pki.rsa.generateKeyPair({
    bits: 2048,
    workers: -1,
    prng,
  });

  const priv = keyPair.privateKey;
  const d = priv.d;
  const p = priv.p;
  const q = priv.q;
  const one = new forge.jsbn.BigInteger("1");
  const dP = d.mod(p.subtract(one));
  const dQ = d.mod(q.subtract(one));
  const qInv = q.modInverse(p);

  return {
    kty: "RSA",
    e: bnToB64Url(priv.e),
    n: bnToB64Url(priv.n),
    d: bnToB64Url(d),
    p: bnToB64Url(p),
    q: bnToB64Url(q),
    dp: bnToB64Url(dP),
    dq: bnToB64Url(dQ),
    qi: bnToB64Url(qInv),
  };
}

function bnToB64Url(bn: forge.jsbn.BigInteger): string {
  const hex = bn.toString(16);
  const even = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = forge.util.hexToBytes(even);
  const b64 = forge.util.encode64(bytes);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function addressFromJwk(jwk: JWKInterface): Promise<string> {
  const arweave = createArweaveClient();
  return arweave.wallets.jwkToAddress(jwk);
}

export function seedFingerprint(seed: Uint8Array): string {
  return bytesToHex(sha256(seed)).slice(0, 8);
}
