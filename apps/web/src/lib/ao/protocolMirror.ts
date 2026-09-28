import { SejireAoClient, isErrorReply, parseReplyJson } from "./client";
import type { TreeStore } from "../types";

const AUTHOR = "local:draft-author";

type Mirror = {
  client: SejireAoClient;
  processId: string;
  mirroredVersions: Set<number>;
};

const mirrors = new Map<string, Mirror>();

export function resetProtocolMirrors(): void {
  mirrors.clear();
}

export function getMirroredProcessId(treeId: string): string | undefined {
  return mirrors.get(treeId)?.processId;
}

/**
 * Зеркало версий редактора в локальный Tree Process.
 * Id коммитов процесса ≠ id коммитов редактора — parent_commit_id не передаём.
 */
export async function mirrorStoreToProtocol(
  store: TreeStore
): Promise<{ client: SejireAoClient; processId: string }> {
  let m = mirrors.get(store.meta.id);
  if (!m) {
    const client = new SejireAoClient({ mode: "local" });
    const spawned = parseReplyJson<{ process_id: string }>(client.spawnTree(AUTHOR, store.meta.title));
    const processId = spawned.process_id;
    if (!processId) throw new Error("SpawnTree did not return process_id");
    const init = await client.init(processId, AUTHOR, store.meta.title);
    if (isErrorReply(init)) throw new Error(init.Data || "Init failed");
    m = { client, processId, mirroredVersions: new Set() };
    mirrors.set(store.meta.id, m);
  }

  const versions = Object.keys(store.versions)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  for (const version of versions) {
    if (m.mirroredVersions.has(version)) continue;
    const editorCommitId = store.versions[version];
    const commit = store.commits[editorCommitId];
    if (!commit) continue;
    const res = await m.client.commit(m.processId, AUTHOR, {
      message: commit.message,
      snapshot: commit.snapshot,
    });
    if (isErrorReply(res)) throw new Error(res.Data || "Commit failed");
    m.mirroredVersions.add(version);
  }

  return { client: m.client, processId: m.processId };
}
