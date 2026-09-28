import {
  archiveLocalVaultVersion,
  getLocalVaultVersion,
  listLocalVaultVersions,
  makeLocalVersionId,
} from "./localArchive";
import type { EnvelopeV1 } from "../crypto/encrypt";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

// Node selftest: minimal localStorage
const mem = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => {
    mem.set(k, String(v));
  },
  removeItem: (k) => {
    mem.delete(k);
  },
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size;
  },
} as Storage;

const envelope = (vaultId: string): EnvelopeV1 => ({
  schema: "sejire/envelope/v1",
  vault_id: vaultId,
  cipher: "aes-gcm-256",
  kdf: "hkdf-sha256",
  iv: "AAEC",
  ciphertext: "Y2lwaGVydGV4dA",
  protocol: "sejire/v0.3",
});

const vaultId = "abcd1234vaultiddemo000000000000";
const id1 = makeLocalVersionId("demo");
const id2 = makeLocalVersionId("demo");
assert(id1 !== id2, "unique ids");

archiveLocalVaultVersion({
  id: id1,
  vaultId,
  parentId: null,
  source: "demo",
  envelope: envelope(vaultId),
  savedAt: "2026-01-01T00:00:00.000Z",
});
archiveLocalVaultVersion({
  id: id2,
  vaultId,
  parentId: id1,
  source: "demo",
  envelope: envelope(vaultId),
  savedAt: "2026-02-01T00:00:00.000Z",
});

const list = listLocalVaultVersions(vaultId);
assert(list.length >= 2, "archived");
assert(list[0].id === id2, "newest first");
assert(getLocalVaultVersion(vaultId, id1)?.parentId === null, "parent link");

console.log("localArchive.selftest: OK", { count: list.length });
