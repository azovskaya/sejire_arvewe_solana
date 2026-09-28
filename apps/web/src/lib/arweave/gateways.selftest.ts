import {
  ARWEAVE_HOSTS,
  DATA_GATEWAYS,
  GATEWAY_DOWN_RU,
  GRAPHQL_ENDPOINTS,
  GatewayUnavailableError,
  fetchTxJson,
  graphqlQuery,
  isGatewayUnavailable,
} from "./gateways";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(GRAPHQL_ENDPOINTS.length >= 3, "graphql fallbacks");
assert(GRAPHQL_ENDPOINTS[0].includes("arweave.net"), "primary graphql");
assert(GRAPHQL_ENDPOINTS.some((u) => u.includes("goldsky")), "goldsky graphql");
assert(DATA_GATEWAYS.length >= 3, "data fallbacks");
assert(ARWEAVE_HOSTS.includes("arweave.net") && ARWEAVE_HOSTS.includes("g8way.io"), "js client hosts");

const origFetch = globalThis.fetch;

globalThis.fetch = async () => {
  throw new Error("blocked");
};
try {
  await graphqlQuery("query { ping }", {});
  throw new Error("graphqlQuery should throw when every host fails");
} catch (e) {
  assert(isGatewayUnavailable(e), "network fail → GatewayUnavailableError");
  assert(e instanceof GatewayUnavailableError, "class");
  assert(e.message === GATEWAY_DOWN_RU, "ru copy");
}

let gqlCalls = 0;
globalThis.fetch = async (input) => {
  gqlCalls += 1;
  const url = String(input);
  if (url.includes("arweave.net")) {
    return new Response("bad gateway", { status: 502 });
  }
  return new Response(JSON.stringify({ data: { transactions: { edges: [] } } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
const empty = await graphqlQuery<{ transactions: { edges: unknown[] } }>("query Q { transactions { edges { node { id } } } }", {
  vaultId: "x",
});
assert(empty.transactions.edges.length === 0, "empty vault is success, not 'down'");
assert(gqlCalls >= 2, "walked past the failing primary");

let dataCalls = 0;
globalThis.fetch = async (input) => {
  dataCalls += 1;
  const url = String(input);
  if (url.includes("arweave.net")) {
    return new Response("missing", { status: 404 });
  }
  return new Response(JSON.stringify({ schema: "sejire/envelope/v1", vault_id: "abc" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
const tx = await fetchTxJson("txid123");
assert((tx as { vault_id: string }).vault_id === "abc", "data gateway fallback");
assert(dataCalls >= 2, "skipped 404 primary");

globalThis.fetch = async () => {
  throw new TypeError("Failed to fetch");
};
try {
  await fetchTxJson("offline");
  throw new Error("fetchTxJson should throw when no host answers");
} catch (e) {
  assert(isGatewayUnavailable(e), "all data hosts down");
}

globalThis.fetch = origFetch;

console.log("gateways.selftest: OK", {
  graphql: GRAPHQL_ENDPOINTS.length,
  data: DATA_GATEWAYS.length,
});
