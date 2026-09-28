/**
 * AO client — local Tree/Factory processes, or live HyperBEAM reads.
 *
 * Product vault path (BIP-39 + Arweave envelopes) is unchanged.
 * This module is the protocol bridge: spawn / commit / kinship queries.
 *
 * Live writes: pass the object from `encodeTreeMessage()` to @permaweb/aoconnect
 * `message()` with a wallet signer. This package does not bundle aoconnect
 * (Vite + SPA size). Process IDs come from env after aos deploy.
 */
import { LocalFactoryProcess } from "./factoryProcess";
import { LocalTreeProcess } from "./treeProcess";
import { PROTOCOL_RELEASE, encodeTreeMessage, type AoMsg, type AoReply, type TreeCommitPayload } from "./types";

export {
  PROTOCOL_RELEASE,
  TREE_PROTOCOL,
  FACTORY_PROTOCOL,
  APP_NAME,
  JETI_ATA_MAX,
  appTags,
  encodeTreeMessage,
  tagsToRecord,
  parseReplyJson,
  isErrorReply,
} from "./types";

export type { AoTag, AoMsg, AoReply, TreeCommitPayload } from "./types";
export { LocalTreeProcess } from "./treeProcess";
export { LocalFactoryProcess } from "./factoryProcess";

export type AoEndpoints = {
  mu?: string;
  cu?: string;
  gateway?: string;
  hbNode?: string;
};

export const DEFAULT_AO: AoEndpoints = {
  hbNode: "https://push.forward.computer",
  gateway: "https://arweave.net",
};

export type AoMode = "local" | "live";

export type AoClientConfig = {
  mode?: AoMode;
  factoryId?: string;
  hbNode?: string;
  /** Injected live sender (aoconnect wrapper). Required for live mutations. */
  send?: (input: { process: string; tags: { name: string; value: string }[]; data?: string }) => Promise<AoReply>;
};

function envString(key: string): string | undefined {
  try {
    const meta = import.meta as { env?: Record<string, string | undefined> };
    const v = meta.env?.[key];
    return v && v.length ? v : undefined;
  } catch {
    return undefined;
  }
}

export function getAoConfig(): Required<Pick<AoClientConfig, "mode" | "factoryId" | "hbNode">> {
  const mode = (envString("VITE_AO_MODE") as AoMode | undefined) || "local";
  return {
    mode: mode === "live" ? "live" : "local",
    factoryId: envString("VITE_SEJIRE_FACTORY_ID") || "",
    hbNode: envString("VITE_AO_HB_NODE") || DEFAULT_AO.hbNode!,
  };
}

export function hyperbeamPatchUrl(processId: string, path = "sejire", hbNode = DEFAULT_AO.hbNode) {
  return `${hbNode}/${processId}~process@1.0/compute/${path}`;
}

export async function probeHyperBeam(processId: string, endpoints: AoEndpoints = DEFAULT_AO) {
  const base = endpoints.hbNode ?? DEFAULT_AO.hbNode!;
  const url = hyperbeamPatchUrl(processId, "sejire", base);
  const res = await fetch(url);
  return { ok: res.ok, status: res.status, url };
}

export function describeAoStatus(config: ReturnType<typeof getAoConfig> = getAoConfig()) {
  const liveReady = config.mode === "live" && Boolean(config.factoryId);
  return {
    phase: 3,
    release: PROTOCOL_RELEASE,
    mode: config.mode,
    factoryId: config.factoryId || null,
    liveReady,
    note: liveReady
      ? "AO Tree/Factory process IDs are set. Mutations need a wallet signer."
      : "Local Tree Process simulator is active. Vault access still uses BIP-39 + Arweave envelopes.",
  };
}

/** Session helper: one factory + trees it spawned (local), or live send() adapter. */
export class SejireAoClient {
  readonly config: ReturnType<typeof getAoConfig> & { send?: AoClientConfig["send"] };
  readonly factory: LocalFactoryProcess;

  constructor(cfg: AoClientConfig = {}) {
    const env = getAoConfig();
    this.config = {
      mode: cfg.mode ?? env.mode,
      factoryId: cfg.factoryId ?? env.factoryId,
      hbNode: cfg.hbNode ?? env.hbNode,
      send: cfg.send,
    };
    this.factory = new LocalFactoryProcess(this.config.factoryId || "factory_local");
  }

  spawnTree(from: string, title?: string) {
    return this.factory.handle({
      From: from,
      Tags: title ? { Action: "SpawnTree", Title: title } : { Action: "SpawnTree" },
    });
  }

  tree(processId: string): LocalTreeProcess | undefined {
    return this.factory.tree(processId);
  }

  /** Dispatch to a local tree, or `send` in live mode. */
  async dispatch(processId: string, msg: AoMsg): Promise<AoReply> {
    if (this.config.mode === "live" && this.config.send) {
      const { tags, data } = encodeTreeMessage(
        msg.Tags.Action,
        Object.fromEntries(Object.entries(msg.Tags).filter(([k]) => k !== "Action")),
        msg.Data
      );
      return this.config.send({ process: processId, tags, data });
    }
    const existing = this.factory.tree(processId);
    const tree = existing ?? new LocalTreeProcess(processId);
    if (!existing) this.factory.processes[processId] = tree;
    return tree.handle(msg);
  }

  async init(processId: string, from: string, title?: string) {
    const Tags: Record<string, string> = { Action: "Init" };
    if (title) Tags.Title = title;
    return this.dispatch(processId, { From: from, Tags });
  }

  async commit(processId: string, from: string, payload: TreeCommitPayload) {
    return this.dispatch(processId, {
      From: from,
      Tags: { Action: "Commit" },
      Data: JSON.stringify(payload),
    });
  }

  async relate(processId: string, from: string, a: string, b: string, commitId?: string) {
    const Tags: Record<string, string> = { Action: "Relate", "Person-A": a, "Person-B": b };
    if (commitId) Tags["Commit-Id"] = commitId;
    return this.dispatch(processId, { From: from, Tags });
  }

  async jetiAta(processId: string, from: string, personId: string, commitId?: string) {
    const Tags: Record<string, string> = { Action: "GetJetiAta", "Person-Id": personId };
    if (commitId) Tags["Commit-Id"] = commitId;
    return this.dispatch(processId, { From: from, Tags });
  }

  async ancestors(processId: string, from: string, personId: string, opts?: { maxDepth?: number; commitId?: string }) {
    const Tags: Record<string, string> = { Action: "GetAncestors", "Person-Id": personId };
    if (opts?.maxDepth != null) Tags["Max-Depth"] = String(opts.maxDepth);
    if (opts?.commitId) Tags["Commit-Id"] = opts.commitId;
    return this.dispatch(processId, { From: from, Tags });
  }

  async head(processId: string, from: string) {
    return this.dispatch(processId, { From: from, Tags: { Action: "GetHead" } });
  }

  async commitById(processId: string, from: string, commitId: string) {
    return this.dispatch(processId, {
      From: from,
      Tags: { Action: "GetCommit", "Commit-Id": commitId },
    });
  }

  async history(processId: string, from: string) {
    return this.dispatch(processId, { From: from, Tags: { Action: "History" } });
  }

  async addOwner(processId: string, from: string, address: string) {
    return this.dispatch(processId, {
      From: from,
      Tags: { Action: "AddOwner", Address: address },
    });
  }

  async removeOwner(processId: string, from: string, address: string) {
    return this.dispatch(processId, {
      From: from,
      Tags: { Action: "RemoveOwner", Address: address },
    });
  }

  registerTree(from: string, processId: string, title?: string) {
    const Tags: Record<string, string> = { Action: "RegisterTree", "Process-Id": processId };
    if (title) Tags.Title = title;
    return this.factory.handle({ From: from, Tags });
  }
}
