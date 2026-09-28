import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { mnemonicToSeed } from "./bip39";

export type SejireKeys = {
  vaultId: string;
  encKey: Uint8Array; // 32 bytes
  master: Uint8Array;
  seed: Uint8Array;
};

export function deriveKeysFromMnemonic(mnemonic: string): SejireKeys {
  const seed = mnemonicToSeed(mnemonic);
  const master = hkdf(sha256, seed, undefined, utf8ToBytes("sejire/v1"), 32);
  const encKey = hkdf(sha256, master, undefined, utf8ToBytes("enc"), 32);
  const vaultId = bytesToHex(sha256(concatBytes(master, utf8ToBytes("vault")))).slice(0, 32);

  return { vaultId, encKey, master, seed };
}

export function fingerprintVaultId(vaultId: string): string {
  return `${vaultId.slice(0, 4)}…${vaultId.slice(-4)}`;
}
