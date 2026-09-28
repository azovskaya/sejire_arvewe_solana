import { mapVaultVersionEdges, formatVersionWhen } from "./fetch";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const edges = mapVaultVersionEdges([
  {
    node: {
      id: "tx_newest",
      block: { timestamp: 1_700_000_000, height: 100 },
      tags: [
        { name: "Updated-At", value: "2024-01-15T12:00:00.000Z" },
        { name: "Parent-Tx", value: "tx_older" },
      ],
    },
  },
  {
    node: {
      id: "tx_older",
      block: { timestamp: 1_600_000_000, height: 50 },
      tags: [],
    },
  },
  {
    node: {
      id: "tx_pending",
      block: null,
      tags: [{ name: "Parent-Tx", value: "tx_older" }],
    },
  },
]);

assert(edges.length === 3, "three versions");
assert(edges[0].txId === "tx_newest", "order preserved");
assert(edges[0].parentTxId === "tx_older", "Parent-Tx parsed");
assert(edges[0].updatedAt === "2024-01-15T12:00:00.000Z", "Updated-At parsed");
assert(edges[1].parentTxId === null, "missing parent");
assert(edges[2].blockTimestamp === null, "pending block");
assert(formatVersionWhen(edges[1]).length > 0, "formats block time");
assert(formatVersionWhen(edges[2]) === "время неизвестно", "unknown when");

console.log("fetch.selftest: OK", { versions: edges.length });
