import type { Person, Snapshot } from "./types";
import { activePersons } from "./treeEngine";

/** BFS ancestors of person (including self at distance 0). */
export function ancestorsOf(snapshot: Snapshot, personId: string): Map<string, number> {
  const persons = snapshot.persons;
  const dist = new Map<string, number>();
  const queue: string[] = [personId];
  dist.set(personId, 0);
  while (queue.length) {
    const id = queue.shift()!;
    const p = persons[id];
    if (!p || p.tombstone) continue;
    const d = dist.get(id) ?? 0;
    for (const parentId of p.parents) {
      if (!dist.has(parentId)) {
        dist.set(parentId, d + 1);
        queue.push(parentId);
      }
    }
  }
  return dist;
}

/** Language-neutral kinship codes (normative in sejire/relate/v1). */
export type KinshipCode =
  | "self"
  | "child"
  | "parent"
  | "grandchild"
  | "grandparent"
  | "sibling"
  | "nibling"
  | "pibling"
  | "cousin"
  | "related"
  | "unrelated";

export type KinshipRelation = {
  a: string;
  b: string;
  code: KinshipCode;
  lca?: string;
  da?: number;
  db?: number;
  degree?: number;
};

export function kinshipCodeFromDistances(da: number, db: number): Exclude<KinshipCode, "self" | "unrelated"> {
  if (da === 1 && db === 0) return "child";
  if (da === 0 && db === 1) return "parent";
  if (da === 2 && db === 0) return "grandchild";
  if (da === 0 && db === 2) return "grandparent";
  if (da === 1 && db === 1) return "sibling";
  if (da === 2 && db === 1) return "nibling";
  if (da === 1 && db === 2) return "pibling";
  if (da === 2 && db === 2) return "cousin";
  return "related";
}

/** Structured relation of A relative to B. Mirrors Tree Process Action=Relate. */
export function relationship(snapshot: Snapshot, aId: string, bId: string): KinshipRelation {
  if (aId === bId) {
    return { a: aId, b: bId, code: "self", lca: aId, da: 0, db: 0, degree: 0 };
  }
  const a = ancestorsOf(snapshot, aId);
  const b = ancestorsOf(snapshot, bId);

  let best: { id: string; da: number; db: number } | null = null;
  for (const [id, da] of a) {
    if (!b.has(id)) continue;
    const db = b.get(id)!;
    if (!best || da + db < best.da + best.db) best = { id, da, db };
  }
  if (!best) return { a: aId, b: bId, code: "unrelated" };

  const { id, da, db } = best;
  return {
    a: aId,
    b: bId,
    lca: id,
    da,
    db,
    degree: da + db,
    code: kinshipCodeFromDistances(da, db),
  };
}

const RU_LABEL: Record<KinshipCode, string> = {
  self: "тот же человек",
  child: "ребёнок",
  parent: "родитель",
  grandchild: "внук/внучка",
  grandparent: "дед/бабушка",
  sibling: "брат/сестра (или единокровные)",
  nibling: "племянник/племянница",
  pibling: "дядя/тётя",
  cousin: "двоюродные",
  related: "общие предки",
  unrelated: "нет общей линии в этом снимке",
};

/** Human phrase for a protocol kinship code (sejire/relate/v1). */
export function kinshipCodeLabel(code: string): string {
  return RU_LABEL[code as KinshipCode] ?? code;
}

/** Lowest common ancestor distance heuristic for kinship label. */
export function relationshipLabel(snapshot: Snapshot, aId: string, bId: string): string {
  const rel = relationship(snapshot, aId, bId);
  if (rel.code === "related" && rel.da != null && rel.db != null) {
    return `общие предки (шаги ${rel.da}+${rel.db})`;
  }
  return kinshipCodeLabel(rel.code);
}

export type LayoutNode = {
  id: string;
  person: Person;
  depth: number;
  x: number;
};

/** Simple top-down layout by generation depth from roots. */
export function layoutTree(snapshot: Snapshot): LayoutNode[] {
  const people = activePersons(snapshot);
  if (!people.length) return [];

  const ids = new Set(people.map((p) => p.id));
  const depth = new Map<string, number>();

  const roots = people.filter((p) => p.parents.every((pid) => !ids.has(pid) || snapshot.persons[pid]?.tombstone));
  const start = roots.length ? roots : people;

  const queue = start.map((p) => p.id);
  for (const id of queue) depth.set(id, 0);

  // children index
  const children = new Map<string, string[]>();
  for (const p of people) {
    for (const parentId of p.parents) {
      if (!ids.has(parentId)) continue;
      const list = children.get(parentId) ?? [];
      list.push(p.id);
      children.set(parentId, list);
    }
  }

  while (queue.length) {
    const id = queue.shift()!;
    const d = depth.get(id) ?? 0;
    for (const childId of children.get(id) ?? []) {
      const next = d + 1;
      if (!depth.has(childId) || next > (depth.get(childId) ?? 0)) {
        depth.set(childId, next);
        queue.push(childId);
      }
    }
  }

  for (const p of people) {
    if (!depth.has(p.id)) depth.set(p.id, 0);
  }

  const byDepth = new Map<number, Person[]>();
  for (const p of people) {
    const d = depth.get(p.id) ?? 0;
    const list = byDepth.get(d) ?? [];
    list.push(p);
    byDepth.set(d, list);
  }

  const nodes: LayoutNode[] = [];
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  for (const d of depths) {
    const row = byDepth.get(d) ?? [];
    row.forEach((p, i) => {
      const x = row.length === 1 ? 0.5 : i / (row.length - 1);
      nodes.push({ id: p.id, person: p, depth: d, x });
    });
  }
  return nodes;
}
