/**
 * Kinship self-test
 */
import { relationship, relationshipLabel } from "./kinship";
import type { Snapshot } from "./types";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const snapshot: Snapshot = {
  persons: {
    g: { id: "g", name: "Grand", parents: [], media: [] },
    p1: { id: "p1", name: "Parent1", parents: ["g"], media: [] },
    p2: { id: "p2", name: "Parent2", parents: ["g"], media: [] },
    c: { id: "c", name: "Child", parents: ["p1"], media: [] },
  },
};

assert(relationship(snapshot, "p1", "c").code === "parent", "parent code");
assert(relationship(snapshot, "c", "p1").code === "child", "child code");
assert(relationshipLabel(snapshot, "p1", "c").includes("родител") || relationshipLabel(snapshot, "p1", "c").includes("ребён"), "parent/child");
assert(relationshipLabel(snapshot, "p1", "p2").includes("брат"), "siblings");
assert(relationship(snapshot, "p1", "p2").code === "sibling", "sibling code");
console.log("kinship.selftest: OK");
