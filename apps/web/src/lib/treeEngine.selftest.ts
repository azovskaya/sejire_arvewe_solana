/**
 * Minimal protocol self-check for versioned trees.
 * Spec: docs/PROTOCOL.md, docs/processes/TREE.md
 */
import {
  activePersons,
  commitDraft,
  createTree,
  getCommit,
  listHistory,
  removeDraftPerson,
  restoreDraftPerson,
  upsertPersonFields,
} from "./treeEngine";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

let store = createTree("Test");
store = upsertPersonFields(store, { name: "Ayan", born: "1894-01-01", parents: [] });
store = commitDraft(store, "genesis");
assert(store.meta.head, "head set");
assert(store.meta.next_version === 2, "version bumped");
assert(listHistory(store).length === 1, "one commit");

const v1Head = store.meta.head!;
const v1 = getCommit(store, v1Head);
assert(v1 && activePersons(v1.snapshot).length === 1, "one person in v1");
assert(v1.parent_commit_id === null, "genesis parent null");

const parentId = activePersons(store.draft)[0].id;
store = upsertPersonFields(store, { name: "Child", parents: [parentId] });
store = commitDraft(store, "add child");
assert(listHistory(store).length === 2, "two commits");

const v2 = getCommit(store, store.meta.head!);
assert(v2 && v2.parent_commit_id === v1Head, "linear parent link");
assert(v2.version === 2, "version 2");

const old = getCommit(store, store.versions[1]);
assert(old && activePersons(old.snapshot).length === 1, "v1 unchanged after v2");
assert(activePersons(store.draft).length === 2, "head has two");

// tombstone soft-delete → new commit; old version intact
store = removeDraftPerson(store, parentId);
assert(activePersons(store.draft).length === 1, "tombstoned hidden before commit");
store = restoreDraftPerson(store, parentId);
assert(activePersons(store.draft).length === 2, "restore undoes tombstone in draft");
store = removeDraftPerson(store, parentId);
store = commitDraft(store, "tombstone ancestor");
assert(activePersons(store.draft).length === 1, "tombstoned hidden in active set");
assert(activePersons(getCommit(store, store.versions[1])!.snapshot).length === 1, "history intact");
assert(listHistory(store).length === 3, "three commits");

console.log("treeEngine.selftest: OK");
