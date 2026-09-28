/**
 * Vault load policy: poison tags must not become an empty "new" vault.
 */
import { emptyVault, type VaultV1 } from "../crypto/vault";
import { resolvePublishVault, VAULT_POISONED_RU } from "./loadVault";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const empty = emptyVault("vault-test");
const real: VaultV1 = { ...empty, active_tree_id: "tree_1" };
const local: VaultV1 = { ...empty, active_tree_id: "tree_local" };

const opened = resolvePublishVault({
  opened: real,
  remoteListed: 3,
  remoteDecryptFails: 2,
  local,
  empty,
});
assert(opened.ok && opened.vault.active_tree_id === "tree_1", "opened wins");

const poison = resolvePublishVault({
  opened: null,
  remoteListed: 3,
  remoteDecryptFails: 3,
  local: null,
  empty,
});
assert(!poison.ok && poison.error === VAULT_POISONED_RU, "poison without local refuses empty");

const mixedPoison = resolvePublishVault({
  opened: null,
  remoteListed: 3,
  remoteDecryptFails: 1,
  local: null,
  empty,
});
assert(!mixedPoison.ok, "any undecryptable Vault-Id listing refuses empty");

const poisonLocal = resolvePublishVault({
  opened: null,
  remoteListed: 2,
  remoteDecryptFails: 2,
  local,
  empty,
});
assert(poisonLocal.ok && poisonLocal.vault.active_tree_id === "tree_local", "poison with local keeps local");

const fresh = resolvePublishVault({
  opened: null,
  remoteListed: 0,
  remoteDecryptFails: 0,
  local: null,
  empty,
});
assert(fresh.ok && fresh.vault === empty, "no remote → empty ok");

const localOnly = resolvePublishVault({
  opened: null,
  remoteListed: 0,
  remoteDecryptFails: 0,
  local,
  empty,
});
assert(localOnly.ok && localOnly.vault.active_tree_id === "tree_local", "offline local");

console.log("loadVault.selftest: OK");
