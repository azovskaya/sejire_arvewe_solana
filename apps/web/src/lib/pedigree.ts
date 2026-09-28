import type { Person, Snapshot } from "./types";
import { activePersons } from "./treeEngine";
import { yearFromDate } from "./dates";

export type PedigreeNode = {
  kind: "person";
  id: string;
  person: Person;
  generation: number;
  slot: number; // vertical index within generation
  x: number;
  y: number;
};

export type AddMeSlot = {
  kind: "add";
  key: string;
  childId: string;
  role: "father" | "mother";
  generation: number;
  slot: number;
  x: number;
  y: number;
};

export type PedigreeItem = PedigreeNode | AddMeSlot;

export type PedigreeEdge = {
  fromId: string;
  toKey: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const CARD_W = 208;
const CARD_H = 122;
const GAP_X = 44;
const GAP_Y = 20;

export const PEDIGREE_CARD = { w: CARD_W, h: CARD_H, gapX: GAP_X, gapY: GAP_Y };

/** All ancestor knees from the focus, matching шежіре depth. One canvas, not a sliding 7-gen window. */
export const PEDIGREE_MAX_GENERATIONS = 13;
/** @deprecated use PEDIGREE_MAX_GENERATIONS — kept so older tests/imports keep working */
export const SCREEN_PEDIGREE_GENERATIONS = PEDIGREE_MAX_GENERATIONS;

function yearOf(iso?: string | null) {
  return yearFromDate(iso);
}

export function lifespan(p: Person, labels?: { born: string; died: string }) {
  const born = labels?.born ?? "род.";
  const died = labels?.died ?? "ум.";
  const b = yearOf(p.born);
  const d = yearOf(p.died);
  if (b && d) return `${b}–${d}`;
  if (b) return `${born} ${b}`;
  if (d) return `${died} ${d}`;
  return "";
}

export function birthPlaceLabel(p: Person) {
  return (p.birthPlace || p.place?.label || "").trim();
}

export function cardSubtitle(p: Person) {
  const life = lifespan(p);
  const place = birthPlaceLabel(p);
  if (life && place) return `${life} · ${place}`;
  return life || place || "даты не указаны";
}

export type CardFactLabels = {
  years: string;
  birth: string;
  death: string;
  burial: string;
  job: string;
};

/** Compact lines for pedigree cards — order matters for overflow budget. */
export function cardFactLines(
  p: Person,
  labels: CardFactLabels = { years: "годы", birth: "род.", death: "ум.", burial: "погр.", job: "зан." }
): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [];
  const life = lifespan(p);
  if (life) lines.push({ label: labels.years, value: life });
  const birth = birthPlaceLabel(p);
  if (birth) lines.push({ label: labels.birth, value: birth });
  const death = (p.deathPlace || "").trim();
  if (death) lines.push({ label: labels.death, value: death });
  const burial = (p.burialPlace || "").trim();
  if (burial) lines.push({ label: labels.burial, value: burial });
  const job = (p.occupation || "").trim();
  if (job && lines.length < 4) lines.push({ label: labels.job, value: job });
  return lines.slice(0, 4);
}

/** Guess mother/father among parents by sex (fallback: order). */
export function splitParents(snapshot: Snapshot, personId: string) {
  const person = snapshot.persons[personId];
  if (!person) return { fatherId: null as string | null, motherId: null as string | null };
  const parents = person.parents
    .map((id) => snapshot.persons[id])
    .filter((p): p is Person => Boolean(p) && !p.tombstone);

  let father = parents.find((p) => p.sex === "M") ?? null;
  let mother = parents.find((p) => p.sex === "F") ?? null;
  const rest = parents.filter((p) => p !== father && p !== mother);
  if (!father && rest.length) father = rest.shift()!;
  if (!mother && rest.length) mother = rest.shift()!;
  // if still one parent without sex, treat first as father for layout stability
  if (!father && !mother && parents[0]) father = parents[0];
  if (father && !mother && parents.length > 1) {
    mother = parents.find((p) => p.id !== father!.id) ?? null;
  }
  return { fatherId: father?.id ?? null, motherId: mother?.id ?? null };
}

/**
 * Classic landscape pedigree: focus on the left, ancestors to the right.
 * The whole ancestor line from the focus (up to 13 knees) stays on one canvas.
 * Cards stay full size so names remain readable; pan/zoom to see the rest.
 */
export function buildPedigree(
  snapshot: Snapshot,
  focusId: string | null,
  maxGenerations = PEDIGREE_MAX_GENERATIONS
): {
  items: PedigreeItem[];
  edges: PedigreeEdge[];
  width: number;
  height: number;
  focusId: string | null;
} {
  const people = activePersons(snapshot);
  if (!people.length || !focusId || !snapshot.persons[focusId] || snapshot.persons[focusId].tombstone) {
    return { items: [], edges: [], width: 800, height: 480, focusId: null };
  }

  type Cell = {
    personId: string | null;
    add?: "father" | "mother";
    childId?: string;
    slot: number;
  };
  const gens: Cell[][] = [];
  const placed = new Set<string>();
  gens[0] = [{ personId: focusId, slot: 0 }];
  placed.add(focusId);

  for (let g = 0; g < maxGenerations - 1; g += 1) {
    const next: Cell[] = [];
    for (const cell of gens[g]) {
      if (!cell.personId) continue;
      const { fatherId, motherId } = splitParents(snapshot, cell.personId);
      if (fatherId && snapshot.persons[fatherId] && !snapshot.persons[fatherId].tombstone && !placed.has(fatherId)) {
        placed.add(fatherId);
        next.push({ personId: fatherId, slot: cell.slot * 2 });
      } else if (!fatherId || !snapshot.persons[fatherId] || snapshot.persons[fatherId].tombstone) {
        next.push({ personId: null, add: "father", childId: cell.personId, slot: cell.slot * 2 });
      }
      if (motherId && snapshot.persons[motherId] && !snapshot.persons[motherId].tombstone && !placed.has(motherId)) {
        placed.add(motherId);
        next.push({ personId: motherId, slot: cell.slot * 2 + 1 });
      } else if (!motherId || !snapshot.persons[motherId] || snapshot.persons[motherId].tombstone) {
        next.push({ personId: null, add: "mother", childId: cell.personId, slot: cell.slot * 2 + 1 });
      }
    }
    if (!next.length) break;
    const hasPeople = next.some((c) => c.personId);
    const addCount = next.filter((c) => c.add).length;
    // Do not paint a wall of "+" cards (32 people × 2). Missing parents stay on the profile.
    if (!hasPeople && addCount > 8) break;
    gens[g + 1] = hasPeople && addCount > 8 ? next.filter((c) => c.personId) : next;
    if (!hasPeople) break;
  }

  const card = PEDIGREE_CARD;
  const maxRows = Math.max(1, ...gens.map((col) => col.length));
  const contentH = Math.max(maxRows, 2) * (card.h + card.gapY);
  const colX = (g: number) => 40 + g * (card.w + card.gapX);

  const yFor = (g: number, index: number) => {
    const rows = gens[g].length;
    const block = contentH / rows;
    return 40 + index * block + (block - card.h) / 2;
  };

  const items: PedigreeItem[] = [];
  gens.forEach((cells, g) => {
    cells.forEach((cell, index) => {
      const x = colX(g);
      const y = yFor(g, index);
      if (cell.personId) {
        const person = snapshot.persons[cell.personId];
        if (!person || person.tombstone) return;
        items.push({
          kind: "person",
          id: person.id,
          person,
          generation: g,
          slot: cell.slot,
          x,
          y,
        });
      } else if (cell.add && cell.childId) {
        items.push({
          kind: "add",
          key: `${cell.childId}:${cell.add}`,
          childId: cell.childId,
          role: cell.add,
          generation: g,
          slot: cell.slot,
          x,
          y,
        });
      }
    });
  });

  const byKey = new Map<string, { x: number; y: number }>();
  for (const it of items) {
    if (it.kind === "person") byKey.set(it.id, { x: it.x + card.w, y: it.y + card.h / 2 });
    else byKey.set(it.key, { x: it.x, y: it.y + card.h / 2 });
  }

  const edges: PedigreeEdge[] = [];
  for (const it of items) {
    if (it.kind !== "person" || it.generation === 0) continue;
    const prev = gens[it.generation - 1];
    const childCell = prev.find((c) => c.slot === Math.floor(it.slot / 2) && c.personId);
    if (!childCell?.personId) continue;
    const childPos = byKey.get(childCell.personId);
    if (!childPos) continue;
    edges.push({
      fromId: childCell.personId,
      toKey: it.id,
      x1: childPos.x,
      y1: childPos.y,
      x2: it.x,
      y2: it.y + card.h / 2,
    });
  }
  for (const it of items) {
    if (it.kind !== "add") continue;
    const childPos = byKey.get(it.childId);
    if (!childPos) continue;
    edges.push({
      fromId: it.childId,
      toKey: it.key,
      x1: childPos.x,
      y1: childPos.y,
      x2: it.x,
      y2: it.y + card.h / 2,
    });
  }

  const width = colX(gens.length - 1) + card.w + 80;
  const height = contentH + 80;
  return { items, edges, width, height, focusId };
}

export function pickDefaultFocus(snapshot: Snapshot, preferredId?: string | null) {
  if (preferredId && snapshot.persons[preferredId] && !snapshot.persons[preferredId].tombstone) {
    return preferredId;
  }
  const people = activePersons(snapshot);
  if (!people.length) return null;
  // Youngest generation: people who are not parents of anyone else in the tree
  const youngest = people.filter((p) => !people.some((c) => c.parents.includes(p.id)));
  if (youngest.length) return youngest[0].id;
  const withParents = people.find((p) =>
    p.parents.some((id) => snapshot.persons[id] && !snapshot.persons[id].tombstone)
  );
  return withParents?.id ?? people[0].id;
}

/** Distance from the pedigree focus to an ancestor (0 = focus). Null if not on that ancestor path. */
export function generationFromFocus(
  snapshot: Snapshot,
  focusId: string | null,
  personId: string,
  maxGenerations = 13
): number | null {
  if (!focusId || !snapshot.persons[personId] || snapshot.persons[personId].tombstone) return null;
  if (focusId === personId) return 0;
  const seen = new Set<string>();
  let frontier = [focusId];
  for (let gen = 0; gen < maxGenerations; gen += 1) {
    if (frontier.includes(personId)) return gen;
    const next: string[] = [];
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      const { fatherId, motherId } = splitParents(snapshot, id);
      if (fatherId) next.push(fatherId);
      if (motherId) next.push(motherId);
    }
    if (!next.length) break;
    frontier = next;
  }
  return null;
}

/** Prefer guided "self", else youngest person in the graph. */
export function pickHomeFocus(snapshot: Snapshot, selfId?: string | null) {
  if (selfId && snapshot.persons[selfId] && !snapshot.persons[selfId].tombstone) {
    return selfId;
  }
  return pickDefaultFocus(snapshot, null);
}
