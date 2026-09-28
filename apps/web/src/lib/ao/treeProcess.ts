/**
 * In-memory Tree Process — mirrors ao/processes/tree.lua
 * Spec: docs/processes/TREE.md (Lua is normative on-chain; this is the testable double).
 */
import { splitParents } from "../pedigree";
import { ancestorsOf, kinshipCodeFromDistances } from "../kinship";
import type { Commit, Person, Snapshot } from "../types";
import {
  JETI_ATA_MAX,
  PROTOCOL_RELEASE,
  TREE_PROTOCOL,
  type AoMsg,
  type AoReply,
  type TreeCommitPayload,
} from "./types";

export type LocalTreeState = {
  id: string;
  title: string;
  owners: Record<string, boolean>;
  head: string | null;
  commits: Record<string, Commit>;
  versions: Record<number, string>;
  next_version: number;
  created_at: string | null;
};

function errorReply(code: string, message: string): AoReply {
  return { Data: message, Tags: { Action: "Error", "Error-Code": code } };
}

function ok(action: string, data: unknown, extra: Record<string, string> = {}): AoReply {
  return { Data: JSON.stringify(data), Tags: { Action: action, ...extra } };
}

function personActive(p: Person | undefined): p is Person {
  return Boolean(p) && !p!.tombstone;
}

function personCount(snapshot: Snapshot) {
  return Object.keys(snapshot.persons ?? {}).length;
}

export class LocalTreeProcess {
  readonly state: LocalTreeState;
  private seq = 0;

  constructor(id = "tree_local") {
    this.state = {
      id,
      title: "Untitled Family Tree",
      owners: {},
      head: null,
      commits: {},
      versions: {},
      next_version: 1,
      created_at: null,
    };
  }

  handle(msg: AoMsg): AoReply {
    const action = msg.Tags.Action;
    const full: AoMsg = {
      ...msg,
      Id: msg.Id ?? `m_${++this.seq}`,
      Timestamp: msg.Timestamp ?? new Date().toISOString(),
    };
    switch (action) {
      case "Ping":
        return { Data: "sejire-ok", Tags: { Action: "Pong" } };
      case "Info":
        return this.info();
      case "Init":
        return this.init(full);
      case "GetHead":
        return this.getHead();
      case "GetCommit":
        return this.getCommit(full);
      case "History":
        return this.history();
      case "Commit":
        return this.commit(full);
      case "AddOwner":
        return this.addOwner(full);
      case "RemoveOwner":
        return this.removeOwner(full);
      case "GetAncestors":
        return this.getAncestors(full);
      case "GetJetiAta":
        return this.getJetiAta(full);
      case "Relate":
        return this.relate(full);
      default:
        return errorReply("UnknownAction", `Unknown Action: ${action ?? ""}`);
    }
  }

  private isOwner(addr: string) {
    const keys = Object.keys(this.state.owners);
    if (!keys.length) return true;
    return this.state.owners[addr] === true;
  }

  private ensureOwnerBoot(addr: string) {
    if (!Object.keys(this.state.owners).length) this.state.owners[addr] = true;
  }

  private resolveSnapshot(msg: AoMsg): { snapshot: Snapshot; commitId: string } | AoReply {
    if (!this.state.head) return errorReply("EmptyTree", "Tree has no commits");
    const cid = msg.Tags["Commit-Id"];
    if (cid) {
      const c = this.state.commits[cid];
      if (!c) return errorReply("NotFound", "Commit not found");
      return { snapshot: c.snapshot, commitId: cid };
    }
    const c = this.state.commits[this.state.head];
    return { snapshot: c.snapshot, commitId: this.state.head };
  }

  private info(): AoReply {
    return ok("Info-Response", {
      protocol: TREE_PROTOCOL,
      release: PROTOCOL_RELEASE,
      process: this.state.id,
      title: this.state.title,
      head: this.state.head,
      version_count: this.state.next_version - 1,
      owners: this.state.owners,
      created_at: this.state.created_at,
      queries: ["GetAncestors", "GetJetiAta", "Relate"],
    });
  }

  private init(msg: AoMsg): AoReply {
    if (this.state.created_at) return errorReply("AlreadyInitialized", "Tree already initialized");
    this.state.title = msg.Tags.Title || "Untitled Family Tree";
    this.state.created_at = msg.Timestamp ?? new Date().toISOString();
    this.ensureOwnerBoot(msg.From);
    this.state.owners[msg.From] = true;
    return ok("Init-Response", {
      process: this.state.id,
      title: this.state.title,
      owners: this.state.owners,
    });
  }

  private getHead(): AoReply {
    if (!this.state.head) return ok("GetHead-Response", { head: null, commit: null });
    return ok("GetHead-Response", {
      head: this.state.head,
      commit: this.state.commits[this.state.head],
    });
  }

  private getCommit(msg: AoMsg): AoReply {
    const id = msg.Tags["Commit-Id"];
    if (!id || !this.state.commits[id]) return errorReply("NotFound", "Commit not found");
    return ok("GetCommit-Response", this.state.commits[id]);
  }

  private history(): AoReply {
    const list = [];
    for (let v = 1; v < this.state.next_version; v += 1) {
      const cid = this.state.versions[v];
      const c = this.state.commits[cid];
      if (!c) continue;
      list.push({
        commit_id: c.commit_id,
        version: c.version,
        parent_commit_id: c.parent_commit_id,
        author: c.author,
        created_at: c.created_at,
        message: c.message,
        person_count: personCount(c.snapshot),
      });
    }
    return ok("History-Response", { head: this.state.head, commits: list });
  }

  private commit(msg: AoMsg): AoReply {
    this.ensureOwnerBoot(msg.From);
    if (!this.isOwner(msg.From)) return errorReply("Unauthorized", "Only owners can commit");

    let body: TreeCommitPayload;
    try {
      body = JSON.parse(msg.Data || "{}") as TreeCommitPayload;
    } catch {
      return errorReply("BadPayload", "Data must be JSON object");
    }
    if (!body || typeof body !== "object" || !body.snapshot || typeof body.snapshot.persons !== "object") {
      return errorReply("BadSnapshot", "snapshot.persons required");
    }

    const parent = this.state.head;
    if (typeof body.parent_commit_id === "string" && body.parent_commit_id !== parent) {
      return errorReply("StaleParent", "parent_commit_id must equal current HEAD");
    }

    const version = this.state.next_version;
    const commit_id = `c_${version}_${msg.Id ?? msg.Timestamp ?? Date.now()}`;
    const commit: Commit = {
      schema: "sejire/commit/v1",
      tree_id: this.state.id,
      commit_id,
      parent_commit_id: parent,
      version,
      author: msg.From,
      created_at: msg.Timestamp ?? new Date().toISOString(),
      message: body.message || `Commit v${version}`,
      snapshot: body.snapshot as Snapshot,
    };

    this.state.commits[commit_id] = commit;
    this.state.versions[version] = commit_id;
    this.state.head = commit_id;
    this.state.next_version = version + 1;
    if (typeof body.title === "string" && body.title.length > 0) this.state.title = body.title;

    return ok("Commit-Response", commit, { "Commit-Id": commit_id, Version: String(version) });
  }

  private addOwner(msg: AoMsg): AoReply {
    if (!this.isOwner(msg.From)) return errorReply("Unauthorized", "Only owners can add owners");
    const addr = msg.Tags.Address;
    if (!addr) return errorReply("BadAddress", "Address tag required");
    this.state.owners[addr] = true;
    return ok("AddOwner-Response", { owners: this.state.owners });
  }

  private removeOwner(msg: AoMsg): AoReply {
    if (!this.isOwner(msg.From)) return errorReply("Unauthorized", "Only owners can remove owners");
    const addr = msg.Tags.Address;
    if (!addr) return errorReply("BadAddress", "Address tag required");
    const count = Object.keys(this.state.owners).length;
    if (count <= 1 && this.state.owners[addr]) {
      return errorReply("LastOwner", "Cannot remove the last owner");
    }
    delete this.state.owners[addr];
    return ok("RemoveOwner-Response", { owners: this.state.owners });
  }

  private getAncestors(msg: AoMsg): AoReply {
    const resolved = this.resolveSnapshot(msg);
    if ("Tags" in resolved) return resolved;
    const personId = msg.Tags["Person-Id"];
    if (!personId) return errorReply("BadPersonId", "Person-Id tag required");
    if (!resolved.snapshot.persons[personId]) return errorReply("NotFound", "Person not found");
    const maxDepth = msg.Tags["Max-Depth"] ? Number(msg.Tags["Max-Depth"]) : undefined;
    const dist = ancestorsOf(resolved.snapshot, personId);
    const ancestors = [...dist.entries()]
      .filter(([, d]) => maxDepth === undefined || Number.isNaN(maxDepth) || d <= maxDepth)
      .map(([id, distance]) => ({ id, distance }))
      .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
    return ok("GetAncestors-Response", {
      schema: "sejire/ancestors/v1",
      person_id: personId,
      commit_id: resolved.commitId,
      ancestors,
    });
  }

  private getJetiAta(msg: AoMsg): AoReply {
    const resolved = this.resolveSnapshot(msg);
    if ("Tags" in resolved) return resolved;
    const personId = msg.Tags["Person-Id"];
    if (!personId) return errorReply("BadPersonId", "Person-Id tag required");
    const start = resolved.snapshot.persons[personId];
    if (!personActive(start)) return errorReply("NotFound", "Person not found");

    const line: {
      generation: number;
      id: string;
      name: string;
      sex?: string;
      born?: string | null;
      died?: string | null;
    }[] = [];
    const seen = new Set<string>();
    let currentId: string | null = personId;
    while (currentId && !seen.has(currentId) && line.length < JETI_ATA_MAX) {
      seen.add(currentId);
      const p = resolved.snapshot.persons[currentId];
      if (!personActive(p)) break;
      line.push({
        generation: line.length,
        id: p.id,
        name: p.name,
        sex: p.sex,
        born: p.born,
        died: p.died,
      });
      currentId = splitParents(resolved.snapshot, currentId).fatherId;
    }
    return ok("GetJetiAta-Response", {
      schema: "sejire/jeti-ata/v1",
      person_id: personId,
      commit_id: resolved.commitId,
      max: JETI_ATA_MAX,
      complete: line.length >= JETI_ATA_MAX,
      line,
    });
  }

  private relate(msg: AoMsg): AoReply {
    const resolved = this.resolveSnapshot(msg);
    if ("Tags" in resolved) return resolved;
    const aId = msg.Tags["Person-A"];
    const bId = msg.Tags["Person-B"];
    if (!aId || !bId) return errorReply("BadPersonId", "Person-A and Person-B tags required");
    if (!resolved.snapshot.persons[aId] || !resolved.snapshot.persons[bId]) {
      return errorReply("NotFound", "Person not found");
    }
    if (aId === bId) {
      return ok("Relate-Response", {
        schema: "sejire/relate/v1",
        a: aId,
        b: bId,
        commit_id: resolved.commitId,
        lca: aId,
        da: 0,
        db: 0,
        degree: 0,
        code: "self",
      });
    }
    const a = ancestorsOf(resolved.snapshot, aId);
    const b = ancestorsOf(resolved.snapshot, bId);
    let best: { id: string; da: number; db: number } | null = null;
    for (const [id, da] of a) {
      if (!b.has(id)) continue;
      const db = b.get(id)!;
      if (!best || da + db < best.da + best.db) best = { id, da, db };
    }
    if (!best) {
      return ok("Relate-Response", {
        schema: "sejire/relate/v1",
        a: aId,
        b: bId,
        commit_id: resolved.commitId,
        code: "unrelated",
      });
    }
    return ok("Relate-Response", {
      schema: "sejire/relate/v1",
      a: aId,
      b: bId,
      commit_id: resolved.commitId,
      lca: best.id,
      da: best.da,
      db: best.db,
      degree: best.da + best.db,
      code: kinshipCodeFromDistances(best.da, best.db),
    });
  }
}
