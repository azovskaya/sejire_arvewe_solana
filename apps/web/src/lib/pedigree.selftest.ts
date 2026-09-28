/**
 * Pedigree layout self-test
 */
import {
  buildPedigree,
  generationFromFocus,
  splitParents,
  PEDIGREE_CARD,
  PEDIGREE_MAX_GENERATIONS,
} from "./pedigree";
import type { Person, Snapshot } from "./types";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function assertNoOverlap(
  ped: { items: { kind: string; id?: string; key?: string; x: number; y: number }[] },
  label: string
) {
  const w = PEDIGREE_CARD.w;
  const h = PEDIGREE_CARD.h;
  const boxes = ped.items.map((it) => ({
    id: it.kind === "person" ? it.id : it.key,
    x: it.x,
    y: it.y,
  }));
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlapX = a.x < b.x + w - 1 && a.x + w > b.x + 1;
      const overlapY = a.y < b.y + h - 1 && a.y + h > b.y + 1;
      assert(!overlapX || !overlapY, `${label}: ${a.id} overlaps ${b.id}`);
    }
  }
}

const snapshot: Snapshot = {
  persons: {
    me: { id: "me", name: "Me", sex: "U", parents: ["fa", "mo"], media: [] },
    fa: { id: "fa", name: "Father", sex: "M", parents: [], media: [] },
    mo: { id: "mo", name: "Mother", sex: "F", parents: [], media: [] },
  },
};

const { fatherId, motherId } = splitParents(snapshot, "me");
assert(fatherId === "fa", "father");
assert(motherId === "mo", "mother");

const ped = buildPedigree(snapshot, "me", 3);
assert(ped.items.some((i) => i.kind === "person" && i.id === "me"), "focus present");
assert(ped.items.some((i) => i.kind === "add" && i.role === "father"), "add grandfather slot");

const meCard = ped.items.find((i) => i.kind === "person" && i.id === "me");
assert(meCard && meCard.kind === "person" && meCard.y < 500, "focus card stays in view");

const solo: Snapshot = {
  persons: { me: { id: "me", name: "Me", parents: [], media: [] } },
};
const soloPed = buildPedigree(solo, "me", 7);
const soloMe = soloPed.items.find((i) => i.kind === "person" && i.id === "me");
assert(soloMe && soloMe.kind === "person" && soloMe.y < 250, "solo focus not buried in empty 7-gen canvas");
assert(soloPed.height < 600, "solo tree compact height");
assert(soloPed.items.filter((i) => i.kind === "add").length === 2, "only next-gen + papa/mama");
assertNoOverlap(soloPed, "solo");
assertNoOverlap(ped, "nuclear");

function completeAncestry(gens: number): Snapshot {
  const count = 2 ** gens - 1;
  const persons: Record<string, Person> = {};
  for (let n = 1; n <= count; n += 1) {
    const father = 2 * n <= count ? `a${2 * n}` : null;
    const mother = 2 * n + 1 <= count ? `a${2 * n + 1}` : null;
    persons[`a${n}`] = {
      id: `a${n}`,
      name: `P${n}`,
      sex: n === 1 || n % 2 === 0 ? "M" : "F",
      parents: [father, mother].filter((id): id is string => Boolean(id)),
      media: [],
    };
  }
  return { persons };
}

const six = completeAncestry(6);
assert(generationFromFocus(six, "a1", "a1") === 0, "focus gen 0");
assert(generationFromFocus(six, "a1", "a2") === 1, "father gen 1");
assert(generationFromFocus(six, "a1", "a32") === 5, "oldest 6-knee person is gen 5");

const sixPed = buildPedigree(six, "a1", PEDIGREE_MAX_GENERATIONS);
const sixAdds = sixPed.items.filter((i) => i.kind === "add");
assert(sixAdds.length <= 8, `do not paint a wall of plus-cards after a full 6th knee (${sixAdds.length})`);
assert(
  sixPed.items.some((i) => i.kind === "person" && i.id === "a32"),
  "oldest 6-knee people stay on the canvas"
);
assert(
  sixPed.items.filter((i) => i.kind === "person").length === 63,
  "all 63 people of a 6-knee tree stay on one sheet"
);
assertNoOverlap(sixPed, "6-knee");

const withSeventh: Snapshot = {
  persons: {
    ...six.persons,
    a64: { id: "a64", name: "NewFather", sex: "M", parents: [], media: [] },
  },
};
withSeventh.persons.a32 = { ...withSeventh.persons.a32, parents: ["a64"] };
const fromSelf = buildPedigree(withSeventh, "a1", PEDIGREE_MAX_GENERATIONS);
assert(
  fromSelf.items.some((i) => i.kind === "person" && i.id === "a1"),
  "self stays on the same canvas"
);
assert(
  fromSelf.items.some((i) => i.kind === "person" && i.id === "a32"),
  "6th knee stays on the same canvas"
);
assert(
  fromSelf.items.some((i) => i.kind === "person" && i.id === "a64"),
  "7th knee is visible from self — no window shift"
);
assertNoOverlap(fromSelf, "7th from self");

function maleLine(knees: number): Snapshot {
  const persons: Record<string, Person> = {};
  for (let i = 1; i <= knees; i += 1) {
    const parent = i < knees ? `m${i + 1}` : null;
    persons[`m${i}`] = {
      id: `m${i}`,
      name: `M${i}`,
      sex: "M",
      parents: parent ? [parent] : [],
      media: [],
    };
  }
  return { persons };
}

const line = maleLine(13);
const linePed = buildPedigree(line, "m1", PEDIGREE_MAX_GENERATIONS);
assert(
  linePed.items.filter((i) => i.kind === "person").length === 13,
  "all 13 male-line knees on one canvas"
);
assert(
  linePed.items.some((i) => i.kind === "person" && i.id === "m13"),
  "13th knee visible from self"
);
assert(linePed.height < 600, `13-knee male line stays compact (${linePed.height}px)`);
assertNoOverlap(linePed, "male line");

console.log("pedigree.selftest: OK", {
  items: ped.items.length,
  edges: ped.edges.length,
  soloH: soloPed.height,
  sixAdds: sixAdds.length,
  sevenFromSelf: fromSelf.items.filter((i) => i.kind === "person").length,
  lineH: linePed.height,
});
