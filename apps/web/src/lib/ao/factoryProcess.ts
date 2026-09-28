/**
 * In-memory Factory Process — mirrors ao/processes/factory.lua
 */
import { FACTORY_PROTOCOL, PROTOCOL_RELEASE, type AoMsg, type AoReply } from "./types";
import { LocalTreeProcess } from "./treeProcess";

export type TreeMeta = {
  process_id: string;
  title: string;
  owner: string;
  created_at: string;
  spawn_msg: string;
};

function errorReply(code: string, message: string): AoReply {
  return { Data: message, Tags: { Action: "Error", "Error-Code": code } };
}

function ok(action: string, data: unknown, extra: Record<string, string> = {}): AoReply {
  return { Data: JSON.stringify(data), Tags: { Action: action, ...extra } };
}

export class LocalFactoryProcess {
  readonly id: string;
  readonly trees: Record<string, TreeMeta> = {};
  readonly byOwner: Record<string, string[]> = {};
  /** Spawned Tree processes (local mode only). */
  readonly processes: Record<string, LocalTreeProcess> = {};
  private seq = 0;

  constructor(id = "factory_local") {
    this.id = id;
  }

  handle(msg: AoMsg): AoReply {
    const action = msg.Tags.Action;
    const full: AoMsg = {
      ...msg,
      Id: msg.Id ?? `fm_${++this.seq}`,
      Timestamp: msg.Timestamp ?? new Date().toISOString(),
    };
    switch (action) {
      case "Ping":
        return { Data: "sejire-factory-ok", Tags: { Action: "Pong" } };
      case "Info":
        return ok("Info-Response", {
          protocol: FACTORY_PROTOCOL,
          release: PROTOCOL_RELEASE,
          process: this.id,
          tree_count: Object.keys(this.trees).length,
        });
      case "SpawnTree":
        return this.spawnTree(full);
      case "RegisterTree":
        return this.registerTree(full);
      case "ListTrees":
        return this.listTrees(full);
      default:
        return errorReply("UnknownAction", `Unknown Action: ${action ?? ""}`);
    }
  }

  tree(processId: string): LocalTreeProcess | undefined {
    return this.processes[processId];
  }

  private pushOwner(owner: string, processId: string) {
    const list = this.byOwner[owner] ?? [];
    if (!list.includes(processId)) list.push(processId);
    this.byOwner[owner] = list;
  }

  private spawnTree(msg: AoMsg): AoReply {
    const title = msg.Tags.Title || "Untitled Family Tree";
    const created_at = msg.Timestamp ?? new Date().toISOString();
    const process = new LocalTreeProcess(`tree_${Object.keys(this.processes).length + 1}`);
    const process_id = process.state.id;
    const meta: TreeMeta = {
      process_id,
      title,
      owner: msg.From,
      created_at,
      spawn_msg: msg.Id ?? "",
    };
    this.processes[process_id] = process;
    this.trees[process_id] = meta;
    this.pushOwner(msg.From, process_id);
    return ok("SpawnTree-Response", meta, { "Process-Id": process_id });
  }

  private registerTree(msg: AoMsg): AoReply {
    const process_id = msg.Tags["Process-Id"];
    if (!process_id) return errorReply("BadProcessId", "Process-Id required");
    const title = msg.Tags.Title || "Untitled Family Tree";
    const meta: TreeMeta = {
      process_id,
      title,
      owner: msg.From,
      created_at: msg.Timestamp ?? new Date().toISOString(),
      spawn_msg: msg.Id ?? "",
    };
    this.trees[process_id] = meta;
    this.pushOwner(msg.From, process_id);
    if (!this.processes[process_id]) this.processes[process_id] = new LocalTreeProcess(process_id);
    return ok("RegisterTree-Response", meta);
  }

  private listTrees(msg: AoMsg): AoReply {
    const owner = msg.Tags.Owner || msg.From;
    const ids = this.byOwner[owner] ?? [];
    const trees = ids.map((id) => this.trees[id]).filter(Boolean);
    return ok("ListTrees-Response", { owner, trees });
  }
}
