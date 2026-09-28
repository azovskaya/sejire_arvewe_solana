import { LocalTreeProcess } from "./treeProcess";
import { isErrorReply, parseReplyJson } from "./types";
import type { JetiAtaPerson } from "./types";
import { activePersons } from "../treeEngine";
import { kinshipCodeLabel } from "../kinship";
import type { Person, Snapshot, TreeStore } from "../types";

const DRAFT_AUTHOR = "local:draft-author";

export type KinshipRow = {
  id: string;
  name: string;
  code: string;
  label: string;
};

export type PersonProtocolView = {
  processId: string;
  commitId: string;
  jetiAta: JetiAtaPerson[];
  ancestors: { id: string; name: string; distance: number }[];
  relatives: KinshipRow[];
};

const REL_ORDER = [
  "parent",
  "child",
  "sibling",
  "grandparent",
  "grandchild",
  "pibling",
  "nibling",
  "cousin",
  "related",
];

function personName(people: Person[], id: string): string {
  const p = people.find((x) => x.id === id);
  return p?.name?.trim() || id;
}

function activeSnapshot(store: TreeStore): Snapshot {
  const persons: Record<string, Person> = {};
  for (const p of activePersons(store.draft)) persons[p.id] = p;
  return { persons };
}

/** Черновик редактора → локальный Tree Process (Init + один Commit). Без сети AO. */
export async function queryPersonFromDraft(
  store: TreeStore,
  focusId: string
): Promise<PersonProtocolView | null> {
  const snapshot = activeSnapshot(store);
  const people = Object.values(snapshot.persons);
  if (people.length === 0) return null;
  const focus = snapshot.persons[focusId];
  if (!focus) return null;

  const process = new LocalTreeProcess(`tree_draft_${store.meta.id}`);
  const init = process.handle({
    From: DRAFT_AUTHOR,
    Tags: { Action: "Init", Title: store.meta.title },
  });
  if (isErrorReply(init)) return null;

  const committed = process.handle({
    From: DRAFT_AUTHOR,
    Tags: { Action: "Commit" },
    Data: JSON.stringify({ message: "draft-query", snapshot }),
  });
  if (isErrorReply(committed)) return null;
  const commitId = parseReplyJson<{ commit_id: string }>(committed).commit_id;
  if (!commitId) return null;

  const jeti = process.handle({
    From: DRAFT_AUTHOR,
    Tags: { Action: "GetJetiAta", "Person-Id": focusId, "Commit-Id": commitId },
  });
  const anc = process.handle({
    From: DRAFT_AUTHOR,
    Tags: {
      Action: "GetAncestors",
      "Person-Id": focusId,
      "Max-Depth": "8",
      "Commit-Id": commitId,
    },
  });
  if (isErrorReply(jeti) || isErrorReply(anc)) return null;

  const jetiAta = parseReplyJson<{ line: JetiAtaPerson[] }>(jeti).line ?? [];
  const ancestorsRaw = parseReplyJson<{ ancestors: { id: string; distance: number }[] }>(anc)
    .ancestors ?? [];

  const relatives: KinshipRow[] = [];
  for (const other of people) {
    if (other.id === focusId) continue;
    const rel = process.handle({
      From: DRAFT_AUTHOR,
      Tags: {
        Action: "Relate",
        "Person-A": focusId,
        "Person-B": other.id,
        "Commit-Id": commitId,
      },
    });
    if (isErrorReply(rel)) continue;
    const code = parseReplyJson<{ code: string }>(rel).code ?? "unrelated";
    if (code === "unrelated" || code === "self") continue;
    relatives.push({
      id: other.id,
      name: personName(people, other.id),
      code,
      label: kinshipCodeLabel(code),
    });
  }

  relatives.sort((a, b) => {
    const ia = REL_ORDER.indexOf(a.code);
    const ib = REL_ORDER.indexOf(b.code);
    const da = ia === -1 ? REL_ORDER.length : ia;
    const db = ib === -1 ? REL_ORDER.length : ib;
    return da - db || a.name.localeCompare(b.name, "ru");
  });

  return {
    processId: process.state.id,
    commitId,
    jetiAta,
    ancestors: ancestorsRaw.map((row) => ({
      id: row.id,
      name: personName(people, row.id),
      distance: row.distance,
    })),
    relatives,
  };
}

export function protocolViewHasKin(view: PersonProtocolView | null): boolean {
  if (!view) return false;
  return (
    view.jetiAta.some((x) => x.generation > 0) ||
    view.ancestors.some((x) => x.distance > 0) ||
    view.relatives.length > 0
  );
}
