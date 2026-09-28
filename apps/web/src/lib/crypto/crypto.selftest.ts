/**
 * Crypto + vault self-test (Node 22+ WebCrypto).
 * npm run test:crypto
 */
import { createMnemonic, isValidMnemonic, normalizeMnemonic } from "./bip39";
import { deriveKeysFromMnemonic } from "./keys";
import { decryptJson, encryptJson } from "./encrypt";
import { buildSeedBackup, parseSeedBackup } from "./seedBackup";
import { emptyVault, putTree } from "./vault";
import { createTree, commitDraft, upsertPersonFields } from "../treeEngine";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const m1 = createMnemonic();
assert(isValidMnemonic(m1), "generated mnemonic valid");
assert(normalizeMnemonic(`  ${m1.toUpperCase()}  `) === m1, "normalize");

const keysA = deriveKeysFromMnemonic(m1);
const keysB = deriveKeysFromMnemonic(m1);
assert(keysA.vaultId === keysB.vaultId, "vaultId deterministic");
assert(Buffer.from(keysA.encKey).equals(Buffer.from(keysB.encKey)), "encKey deterministic");

const other = deriveKeysFromMnemonic(createMnemonic());
assert(other.vaultId !== keysA.vaultId, "different mnemonic → different vault");

let tree = createTree("Test");
tree = upsertPersonFields(tree, { name: "Ayan", parents: [] });
tree = commitDraft(tree, "genesis");
let vault = emptyVault(keysA.vaultId);
vault = putTree(vault, tree);

const envelope = await encryptJson(keysA.encKey, keysA.vaultId, vault);
const opened = await decryptJson<typeof vault>(keysA.encKey, envelope);
assert(opened.trees[tree.meta.id]?.meta.title === "Test", "roundtrip vault");

let failed = false;
try {
  await decryptJson(other.encKey, envelope);
} catch {
  failed = true;
}
assert(failed, "wrong key cannot decrypt");

const seedBackup = buildSeedBackup(m1);
assert(seedBackup.schema === "sejire/seed/v1", "seed schema");
assert(seedBackup.word_count === 12, "seed word_count");
assert(parseSeedBackup(seedBackup) === m1, "seed backup roundtrip");
assert(parseSeedBackup({ schema: "sejire/envelope/v1" }) === null, "reject non-seed");

console.log("crypto.selftest: OK", { vaultId: keysA.vaultId.slice(0, 8) });
