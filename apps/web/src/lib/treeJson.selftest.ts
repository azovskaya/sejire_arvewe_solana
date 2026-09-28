import { buildTreeExport, coerceTreeStore, parseTreeJson, TREE_JSON_SCHEMA } from "./treeJson";
import { createTree, setDraftPerson } from "./treeEngine";
import { defaultGuide } from "./guide";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

let store = createTree("Тест");
store = setDraftPerson(store, {
  id: "me",
  name: "Иван",
  sex: "M",
  born: "1990-01-02",
  died: null,
  birthPlace: "Астана",
  deathPlace: null,
  burialDate: null,
  burialPlace: null,
  occupation: "инженер",
  maidenName: null,
  parents: ["fa"],
  media: [],
  notes: "заметка",
  tombstone: false,
});
store = setDraftPerson(store, {
  id: "fa",
  name: "Пётр",
  sex: "M",
  born: "1960",
  died: null,
  parents: [],
  media: [],
  notes: "",
  tombstone: false,
});

const guide = {
  ...defaultGuide(),
  step: "done" as const,
  selfId: "me",
  fatherId: "fa",
};

const exported = buildTreeExport(store, guide);
assert(exported.schema === TREE_JSON_SCHEMA, "schema");
assert(exported.store.draft.persons.me.birthPlace === "Астана", "birthPlace");
assert(exported.store.draft.persons.me.occupation === "инженер", "occupation");
assert(exported.guide.selfId === "me", "guide self");

const round = parseTreeJson(JSON.stringify(exported));
assert(round.ok, "parse ok");
if (round.ok) {
  assert(round.store.draft.persons.me.name === "Иван", "name");
  assert(round.store.draft.persons.fa.name === "Пётр", "father");
  assert(round.guide.fatherId === "fa", "guide father");
  assert(round.store.meta.title === "Тест", "title");
}

const bareSnap = parseTreeJson(JSON.stringify({ persons: { a: { id: "a", name: "A", parents: [] } } }));
assert(bareSnap.ok, "bare snapshot");

const noMeta = coerceTreeStore({
  draft: { persons: { me: { id: "me", name: "Пётр", parents: [], media: [] } } },
  dirty: true,
});
assert(noMeta?.draft.persons.me.name === "Пётр", "people survive missing meta");
assert(noMeta?.meta && noMeta.meta.zhuz === null, "missing meta gets zhuz: null");

let threw = false;
try {
  const broken = { draft: { persons: {} } } as { meta?: { zhuz?: string } };
  void broken.meta!.zhuz;
} catch {
  threw = true;
}
assert(threw, "reading .meta.zhuz on a draft without meta throws (Safari crash)");

const wrapped = coerceTreeStore({
  schema: TREE_JSON_SCHEMA,
  app: "SEJIRE",
  store: exported.store,
  guide,
});
assert(wrapped?.meta.title === "Тест", "unwrap export");
assert(wrapped?.draft.persons.me.name === "Иван", "unwrap people");

const oldMeta = coerceTreeStore({
  ...store,
  meta: { id: store.meta.id, title: store.meta.title, head: null, next_version: 1, created_at: store.meta.created_at, author: "local" },
});
assert(oldMeta?.meta.zhuz === null, "pre-zhuz meta is filled");
assert(oldMeta?.meta.title === "Тест", "pre-zhuz title kept");

const polluted = parseTreeJson(
  JSON.stringify({
    persons: {
      me: { id: "me", name: "Safe", parents: ["__proto__"], media: [{ tx: "x", kind: "nope" }] },
      __proto__: { id: "__proto__", name: "pollute", parents: [] },
    },
  })
);
assert(polluted.ok, "pollution parse ok");
if (polluted.ok) {
  assert(!Object.hasOwn(polluted.store.draft.persons, "__proto__"), "skip proto person id");
  assert(polluted.store.draft.persons.me.parents.length === 0, "drop proto parent id");
  assert(polluted.store.draft.persons.me.media.length === 0, "drop bad media kind");
  assert(!Object.hasOwn(Object.prototype, "name"), "Object.prototype not polluted");
}

console.log("treeJson.selftest: OK");
