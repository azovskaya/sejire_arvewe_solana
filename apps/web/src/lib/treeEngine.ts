/**
 * SEJIRE local tree engine — mirrors ao/processes/tree.lua
 * Spec: docs/processes/TREE.md, docs/PROTOCOL.md
 */
import type { Commit, HistoryItem, Person, Snapshot, TreeStore } from "./types";
import { setLocalJson } from "./storageQuota";

const AUTHOR = "local:draft-author";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptySnapshot(): Snapshot {
  return { persons: {} };
}

function cloneSnapshot(s: Snapshot): Snapshot {
  return JSON.parse(JSON.stringify(s)) as Snapshot;
}

function personCount(s: Snapshot) {
  return Object.keys(s.persons).length;
}

/** Create empty tree store (local stand-in for SpawnTree + Init). */
export function createTree(title: string): TreeStore {
  return {
    meta: {
      id: uid("tree"),
      title: title.trim() || "Семейное древо",
      head: null,
      next_version: 1,
      created_at: new Date().toISOString(),
      author: AUTHOR,
      zhuz: null,
      clanName: null,
      tamgaUrl: null,
    },
    commits: {},
    versions: {},
    draft: emptySnapshot(),
    dirty: false,
  };
}

/** Newest-first history summaries (UI convenience; AO History is ascending). */
export function listHistory(store: TreeStore): HistoryItem[] {
  const items: HistoryItem[] = [];
  for (let v = 1; v < store.meta.next_version; v += 1) {
    const cid = store.versions[v];
    const c = store.commits[cid];
    if (!c) continue;
    items.push({
      commit_id: c.commit_id,
      version: c.version,
      parent_commit_id: c.parent_commit_id,
      author: c.author,
      created_at: c.created_at,
      message: c.message,
      person_count: personCount(c.snapshot),
    });
  }
  return items.reverse();
}

export function getHead(store: TreeStore): Commit | null {
  if (!store.meta.head) return null;
  return store.commits[store.meta.head] ?? null;
}

export function getCommit(store: TreeStore, commitId: string): Commit | null {
  return store.commits[commitId] ?? null;
}

export function setDraftPerson(store: TreeStore, person: Person): TreeStore {
  const draft = cloneSnapshot(store.draft);
  draft.persons[person.id] = person;
  return { ...store, draft, dirty: true };
}

/** Soft-delete in draft; history erasure is forbidden — needs a new commit. */
export function removeDraftPerson(store: TreeStore, personId: string): TreeStore {
  const draft = cloneSnapshot(store.draft);
  const current = draft.persons[personId];
  if (!current) return store;
  draft.persons[personId] = { ...current, tombstone: true };
  return { ...store, draft, dirty: true };
}

/** Undo soft-delete while still in the same draft. */
export function restoreDraftPerson(store: TreeStore, personId: string): TreeStore {
  const draft = cloneSnapshot(store.draft);
  const current = draft.persons[personId];
  if (!current?.tombstone) return store;
  draft.persons[personId] = { ...current, tombstone: false };
  return { ...store, draft, dirty: true };
}

export function upsertPersonFields(
  store: TreeStore,
  partial: Partial<Person> & { id?: string; name: string }
): TreeStore {
  const id = partial.id ?? uid("p");
  const existing = store.draft.persons[id];
  const person: Person = {
    id,
    name: partial.name,
    sex: partial.sex ?? existing?.sex ?? "U",
    born: partial.born ?? existing?.born ?? null,
    died: partial.died ?? existing?.died ?? null,
    place: partial.place ?? existing?.place ?? null,
    birthPlace: partial.birthPlace ?? existing?.birthPlace ?? null,
    deathPlace: partial.deathPlace ?? existing?.deathPlace ?? null,
    burialDate: partial.burialDate ?? existing?.burialDate ?? null,
    burialPlace: partial.burialPlace ?? existing?.burialPlace ?? null,
    occupation: partial.occupation ?? existing?.occupation ?? null,
    maidenName: partial.maidenName ?? existing?.maidenName ?? null,
    parents: partial.parents ?? existing?.parents ?? [],
    media: partial.media ?? existing?.media ?? [],
    notes: partial.notes ?? existing?.notes ?? "",
    tombstone: partial.tombstone ?? false,
  };
  return setDraftPerson(store, person);
}

/**
 * Create immutable commit from draft (mirrors Action=Commit).
 * Parent is always current HEAD (linear history, ADR-0004).
 */
export function commitDraft(store: TreeStore, message: string): TreeStore {
  const version = store.meta.next_version;
  const commit_id = `c_${version}_${Date.now().toString(36)}`;
  const commit: Commit = {
    schema: "sejire/commit/v1",
    tree_id: store.meta.id,
    commit_id,
    parent_commit_id: store.meta.head,
    version,
    author: AUTHOR,
    created_at: new Date().toISOString(),
    message: message.trim() || `Фиксация v${version}`,
    snapshot: cloneSnapshot(store.draft),
  };

  return {
    ...store,
    meta: {
      ...store.meta,
      head: commit_id,
      next_version: version + 1,
    },
    commits: { ...store.commits, [commit_id]: commit },
    versions: { ...store.versions, [version]: commit_id },
    dirty: false,
  };
}

/** Load historical snapshot into draft as a base for a *new* future commit. */
export function loadDraftFromCommit(store: TreeStore, commitId: string): TreeStore {
  const c = store.commits[commitId];
  if (!c) return store;
  return {
    ...store,
    draft: cloneSnapshot(c.snapshot),
    dirty: false,
  };
}

export function activePersons(snapshot: Snapshot): Person[] {
  return Object.values(snapshot.persons).filter((p) => !p.tombstone);
}

export function diffPersonIds(a: Snapshot, b: Snapshot) {
  const aIds = new Set(Object.keys(a.persons));
  const bIds = new Set(Object.keys(b.persons));
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const id of bIds) {
    if (!aIds.has(id)) added.push(id);
    else if (JSON.stringify(a.persons[id]) !== JSON.stringify(b.persons[id])) {
      changed.push(id);
    }
  }
  for (const id of aIds) {
    if (!bIds.has(id)) removed.push(id);
    else if (a.persons[id]?.tombstone !== b.persons[id]?.tombstone && b.persons[id]?.tombstone) {
      removed.push(id);
    }
  }
  return { added, removed, changed };
}

const STORAGE_KEY = "sejire.tree.v1";

export function saveStore(store: TreeStore) {
  setLocalJson(STORAGE_KEY, store);
}

export function loadStore(): TreeStore | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TreeStore;
  } catch {
    return null;
  }
}

export function clearStore() {
  localStorage.removeItem(STORAGE_KEY);
}
