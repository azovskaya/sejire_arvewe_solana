import { isOpsHash, opsHash } from "./route";
import {
  applyOpsKeyPatch,
  assertNoSecretsInBlob,
  loginOps,
  opsNeedsSetup,
  redactOpsKeys,
  recordOpsMovement,
  resetOpsDesk,
  setupOpsPassword,
} from "./store";
import { mapNetworkSaves, mergeOpsOverview } from "./feed";
import { looksLikeJwk } from "./store";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

resetOpsDesk();
assert(opsNeedsSetup(), "needs setup");
assert(isOpsHash("#/admin"), "admin hash");
assert(isOpsHash("#admin"), "admin hash no slash");
assert(!isOpsHash("#/work"), "work is not admin");
assert(opsHash() === "#/admin", "canonical hash");

assert(!looksLikeJwk("nope"), "reject junk");
assert(
  looksLikeJwk(JSON.stringify({ kty: "RSA", n: "mod", d: "sec" })),
  "accept jwk shape"
);

await setupOpsPassword("owner-password-ok");
assert(!opsNeedsSetup(), "setup done");
assert(await loginOps("owner-password-ok"), "login");
assert(!(await loginOps("wrong-password-xx")), "bad login");

await applyOpsKeyPatch({
  turboJwk: JSON.stringify({ kty: "RSA", n: "secret-modulus-not-in-ui", d: "secret-d" }),
  paymentProvider: "kaspi",
  publishPriceMinor: "2000",
  hotAddress: "treasuryAddressPublic",
});
await applyOpsKeyPatch({ turboJwk: "   ", publishPriceMinor: "2500" });
const keys = redactOpsKeys();
assert(keys.treasuryConfigured && keys.publishPriceMinor === "2500", "empty paste keeps treasury");
assert(keys.paymentProvider === "kaspi", "provider from admin");
const dumped = JSON.stringify(keys);
assert(!dumped.includes("secret-modulus") && !dumped.includes("secret-d"), "no jwk in redact");
assertNoSecretsInBlob(dumped);

recordOpsMovement({
  kind: "saved",
  txId: "abcdefghijklmnopqrstuvwxyz1234567890ABCD",
  vaultId: "vault-one-xxxxxxxxxxxxxxxxxxxx",
  amountMinor: 1500,
  provider: "treasury",
});
const overview = mergeOpsOverview({
  network: mapNetworkSaves([
    {
      node: {
        id: "tx_one",
        owner: { address: "treasuryAddressPublic" },
        block: { timestamp: 1_700_000_000 },
        tags: [
          { name: "Vault-Id", value: "vault-one-xxxxxxxxxxxxxxxxxxxx" },
          { name: "Updated-At", value: "2024-01-15T12:00:00.000Z" },
        ],
      },
    },
    {
      node: {
        id: "tx_two",
        owner: { address: "treasuryAddressPublic" },
        block: { timestamp: 1_700_000_100 },
        tags: [{ name: "Vault-Id", value: "vault-one-xxxxxxxxxxxxxxxxxxxx" }],
      },
    },
  ]),
  movements: [
    {
      at: 1_700_000_000_000,
      kind: "saved",
      amountMinor: 1500,
      currency: "KZT",
      provider: "treasury",
      vaultFp: "vaul…xxxx",
    },
  ],
  treasuryAddress: "treasuryAddressPublic",
  treasuryReady: true,
  kaspiReady: false,
  provider: "mock",
  currency: "KZT",
});
assert(overview.trees === 1, "one unique tree");
assert(overview.saves === 2, "two network saves");
assert(overview.network[0].vaultFp.includes("…"), "fingerprint not full vault id");
const publicJson = JSON.stringify(overview);
assert(!publicJson.includes("vault-one-xxxxxxxxxxxxxxxxxxxx"), "no full vault id in overview");
assert(!publicJson.includes("secret-modulus"), "no treasury jwk in overview");

resetOpsDesk();
console.log("opsDesk.selftest: OK");
