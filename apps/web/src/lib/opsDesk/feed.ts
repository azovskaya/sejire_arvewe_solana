import { fingerprintVaultId } from "../crypto/keys";
import { graphqlQuery } from "../arweave/gateways";
import type { NetworkSave, OpsMovement, OpsOverview, PaymentProviderSetting } from "./types";

type GqlTag = { name: string; value: string };
type GqlEdge = {
  node: {
    id: string;
    owner?: { address?: string | null } | null;
    block: { timestamp: number } | null;
    tags?: GqlTag[];
  };
};

function tagValue(tags: GqlTag[] | undefined, name: string): string | null {
  if (!tags) return null;
  return tags.find((t) => t.name === name)?.value ?? null;
}

export function mapNetworkSaves(edges: GqlEdge[]): NetworkSave[] {
  return edges.map((edge) => {
    const vaultId = tagValue(edge.node.tags, "Vault-Id") || "";
    const updated = tagValue(edge.node.tags, "Updated-At");
    const block = edge.node.block?.timestamp;
    const at =
      updated && !Number.isNaN(Date.parse(updated))
        ? updated
        : block
          ? new Date(block * 1000).toISOString()
          : new Date(0).toISOString();
    return {
      txId: edge.node.id,
      at,
      vaultFp: vaultId ? fingerprintVaultId(vaultId) : "————",
      owner: edge.node.owner?.address ?? null,
    };
  });
}

export async function fetchNetworkSaves(limit = 80): Promise<NetworkSave[]> {
  const query = `
    query ($limit: Int!) {
      transactions(
        first: $limit
        tags: [
          { name: "App-Name", values: ["SEJIRE"] }
          { name: "Type", values: ["vault-envelope"] }
        ]
        sort: HEIGHT_DESC
      ) {
        edges {
          node {
            id
            owner { address }
            block { timestamp }
            tags { name value }
          }
        }
      }
    }
  `;
  const data = await graphqlQuery<{ transactions?: { edges: GqlEdge[] } }>(query, { limit });
  return mapNetworkSaves(data.transactions?.edges ?? []);
}

export function mergeOpsOverview(opts: {
  network: NetworkSave[];
  movements: OpsMovement[];
  treasuryAddress: string | null;
  treasuryReady: boolean;
  kaspiReady: boolean;
  provider: PaymentProviderSetting;
  currency: string;
}): OpsOverview {
  const vaults = new Map<string, string>();
  for (const row of [...opts.network].reverse()) {
    if (!vaults.has(row.vaultFp)) vaults.set(row.vaultFp, row.at);
  }
  const created = [...vaults.entries()]
    .map(([, at]) => ({ at }))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const payments = opts.movements.map((m) => ({
    at: new Date(m.at).toISOString(),
    amountMinor: m.amountMinor,
    currency: m.currency,
    provider: m.provider,
    status: m.kind,
  }));
  const paid = opts.movements.filter((m) => m.kind === "paid" || m.kind === "saved");
  return {
    trees: vaults.size,
    saves: opts.network.length,
    paidCount: paid.length,
    paidMinor: paid.reduce((sum, m) => sum + (m.amountMinor || 0), 0),
    currency: opts.currency,
    created,
    payments,
    network: opts.network,
    treasuryReady: opts.treasuryReady,
    treasuryAddress: opts.treasuryAddress,
    kaspiReady: opts.kaspiReady,
    provider: opts.provider,
  };
}
