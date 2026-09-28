import type { Person, Snapshot } from "../types";
import { splitParents } from "../pedigree";
import { formatPersonDate, yearFromDate } from "../dates";

/** Youngest-first male line: [self, father, grandfather, …]. */
export function maleLineUp(snapshot: Snapshot, startId: string): Person[] {
  const line: Person[] = [];
  const seen = new Set<string>();
  let currentId: string | null = startId;

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const person = snapshot.persons[currentId];
    if (!person || person.tombstone) break;
    line.push(person);
    const { fatherId } = splitParents(snapshot, currentId);
    currentId = fatherId;
  }

  return line;
}

export type AncestorSlot = {
  person: Person;
  /** 0 = focus (youngest / bottom of poster) */
  generation: number;
  /** Pedigree index: father = 2*childSlot, mother = 2*childSlot+1 */
  slot: number;
};

/**
 * Binary pedigree layout: father left / mother right under each child.
 * Connector edges do not cross when X follows slot spans.
 */
export function ancestorSlotLayout(
  snapshot: Snapshot,
  focusId: string,
  maxGenerations = 5
): AncestorSlot[] {
  const focus = snapshot.persons[focusId];
  if (!focus || focus.tombstone) return [];

  const out: AncestorSlot[] = [];
  const placed = new Set<string>();
  type Q = { id: string; generation: number; slot: number };
  const queue: Q[] = [{ id: focusId, generation: 0, slot: 0 }];

  while (queue.length) {
    const cur = queue.shift()!;
    if (placed.has(cur.id) || cur.generation >= maxGenerations) continue;
    const person = snapshot.persons[cur.id];
    if (!person || person.tombstone) continue;
    placed.add(cur.id);
    out.push({ person, generation: cur.generation, slot: cur.slot });

    if (cur.generation + 1 >= maxGenerations) continue;
    const { fatherId, motherId } = splitParents(snapshot, cur.id);
    if (fatherId && !placed.has(fatherId)) {
      queue.push({ id: fatherId, generation: cur.generation + 1, slot: cur.slot * 2 });
    }
    if (motherId && !placed.has(motherId)) {
      queue.push({ id: motherId, generation: cur.generation + 1, slot: cur.slot * 2 + 1 });
    }
  }

  return out;
}

/**
 * Ancestor generations for charts.
 * gens[0] = focus, gens[1] = parents, … ordered by pedigree slot.
 */
export function ancestorGenerations(
  snapshot: Snapshot,
  focusId: string,
  maxGenerations = 5
): Person[][] {
  const slots = ancestorSlotLayout(snapshot, focusId, maxGenerations);
  if (!slots.length) return [];
  const depth = Math.max(...slots.map((s) => s.generation)) + 1;
  const gens: Person[][] = Array.from({ length: depth }, () => []);
  for (let g = 0; g < depth; g += 1) {
    gens[g] = slots
      .filter((s) => s.generation === g)
      .sort((a, b) => a.slot - b.slot)
      .map((s) => s.person);
  }
  return gens;
}

/** Center X of a slot as a fraction of usable width (0..1). */
export function slotCenterFraction(generation: number, slot: number, depth: number): number {
  const leafSlots = 2 ** Math.max(0, depth - 1);
  const leafSpan = 2 ** Math.max(0, depth - 1 - generation);
  const leftLeaf = slot * leafSpan;
  return (leftLeaf + leafSpan / 2) / leafSlots;
}

/** Gens per pedigree page. Overlap of 1 gen chains charts (person is top, then bottom of the next). */
export const PEDIGREE_CHART_WINDOW = 5;

/** Leftover 2–3 gen families — used only to keep small charts clustered, not to paginate. */
export const SHALLOW_CHART_MAX_DEPTH = 3;
export const SHALLOW_CHART_MAX_PEOPLE = 7;

export type PedigreeChartRoot = { id: string; startGeneration: number };

export type PedigreeCardPos = {
  id: string;
  x: number;
  y: number;
  cx: number;
  generation: number;
  slot: number;
};

export type PedigreeLayoutBox = { x: number; y: number; w: number; h: number };

export type PedigreeChartLayout = {
  cardW: number;
  cardH: number;
  rowPitch: number;
  roomy: boolean;
  positions: Map<string, PedigreeCardPos>;
};

/** ISO landscape posters. Wider trees step up instead of splitting into mini-charts. */
export const PEDIGREE_POSTER_SIZES = [
  { id: "a4" as const, w: 297, h: 210 },
  { id: "a3" as const, w: 420, h: 297 },
  { id: "a2" as const, w: 594, h: 420 },
];

export type PedigreePosterFormat = (typeof PEDIGREE_POSTER_SIZES)[number]["id"];

export type PedigreePosterPlan = {
  format: PedigreePosterFormat;
  orientation: "landscape" | "portrait";
  pageW: number;
  pageH: number;
  /** Generations painted from the focus (may be < depth if even A2 is too narrow). */
  generations: number;
  truncated: boolean;
  depth: number;
};

const POSTER_MARGIN_X = 24;
/** Smallest card that still matches the readable A4 5-knee overview. A2 may go slightly under. */
const MIN_READABLE_CARD_W = 8;

/**
 * Roots for chained 5-generation pedigree pages covering `maxGenerations`.
 * Complete 13-knee binary tree → 1 + 16 + 256 = 273 charts.
 * Kept as a helper; the classic PDF is one poster, not this booklet.
 */
export function pedigreeChartRoots(
  snapshot: Snapshot,
  focusId: string,
  maxGenerations = 13,
  window = PEDIGREE_CHART_WINDOW
): PedigreeChartRoot[] {
  const slots = ancestorSlotLayout(snapshot, focusId, maxGenerations);
  if (!slots.length) return [];
  const depth = Math.max(...slots.map((s) => s.generation)) + 1;
  const step = Math.max(1, window - 1);
  const out: PedigreeChartRoot[] = [];
  const lastStart = Math.max(0, depth - 2);
  for (let g = 0; g <= lastStart; g += step) {
    const row = slots.filter((s) => s.generation === g).sort((a, b) => a.slot - b.slot);
    for (const s of row) out.push({ id: s.person.id, startGeneration: g });
  }
  return out;
}

export function isShallowPedigreeChart(slots: AncestorSlot[]): boolean {
  if (!slots.length) return true;
  const depth = Math.max(...slots.map((s) => s.generation)) + 1;
  return depth <= SHALLOW_CHART_MAX_DEPTH && slots.length <= SHALLOW_CHART_MAX_PEOPLE;
}

function rowWidthMm(pageW: number, leaves: number): number {
  return (pageW - POSTER_MARGIN_X) / Math.max(leaves, 1) - 0.7;
}

function oldestRowCount(slots: AncestorSlot[], gens: number): number {
  const g = Math.max(0, gens - 1);
  return Math.max(1, slots.filter((s) => s.generation === g).length);
}

function posterFits(pageW: number, slots: AncestorSlot[], gens: number): boolean {
  return rowWidthMm(pageW, oldestRowCount(slots, gens)) >= MIN_READABLE_CARD_W;
}

/**
 * One wall poster. Paper grows A4 → A3 → A2 with the widest ancestor row.
 * Does not emit leftover 2-person family sheets — those were unreadable as a tree.
 */
export function choosePedigreePoster(
  snapshot: Snapshot,
  focusId: string,
  maxGenerations = 13
): PedigreePosterPlan {
  const allSlots = ancestorSlotLayout(snapshot, focusId, maxGenerations);
  if (!allSlots.length) {
    return {
      format: "a4",
      orientation: "landscape",
      pageW: 297,
      pageH: 210,
      generations: 0,
      truncated: false,
      depth: 0,
    };
  }
  const depth = Math.max(...allSlots.map((s) => s.generation)) + 1;
  const maxInRow = Math.max(
    1,
    ...Array.from({ length: depth }, (_, g) => allSlots.filter((s) => s.generation === g).length)
  );

  if (maxInRow <= 8 && depth > 8) {
    return {
      format: "a4",
      orientation: "portrait",
      pageW: 210,
      pageH: 297,
      generations: depth,
      truncated: false,
      depth,
    };
  }

  for (const fmt of PEDIGREE_POSTER_SIZES) {
    if (posterFits(fmt.w, allSlots, depth)) {
      return {
        format: fmt.id,
        orientation: "landscape",
        pageW: fmt.w,
        pageH: fmt.h,
        generations: depth,
        truncated: false,
        depth,
      };
    }
  }

  const a2 = PEDIGREE_POSTER_SIZES[PEDIGREE_POSTER_SIZES.length - 1];
  let gens = depth;
  while (gens > 2 && !posterFits(a2.w, allSlots, gens)) gens -= 1;

  for (const fmt of PEDIGREE_POSTER_SIZES) {
    if (posterFits(fmt.w, allSlots, gens)) {
      return {
        format: fmt.id,
        orientation: "landscape",
        pageW: fmt.w,
        pageH: fmt.h,
        generations: gens,
        truncated: gens < depth,
        depth,
      };
    }
  }

  return {
    format: "a2",
    orientation: "landscape",
    pageW: a2.w,
    pageH: a2.h,
    generations: gens,
    truncated: gens < depth,
    depth,
  };
}

/**
 * Card geometry for one pedigree chart inside `box`.
 * Shallow families stay clustered with a capped row pitch so names are not 8pt in a corner of A4.
 */
export function computePedigreeLayout(
  slots: AncestorSlot[],
  box: PedigreeLayoutBox
): PedigreeChartLayout {
  const byGen = new Map<number, AncestorSlot[]>();
  for (const s of slots) {
    const row = byGen.get(s.generation) ?? [];
    row.push(s);
    byGen.set(s.generation, row);
  }
  for (const row of byGen.values()) row.sort((a, b) => a.slot - b.slot);

  const depth = Math.max(1, ...slots.map((s) => s.generation + 1));
  const maxInRow = Math.max(1, ...[...byGen.values()].map((row) => row.length));
  const roomy = isShallowPedigreeChart(slots);
  const useBinarySlots = !roomy && maxInRow >= 4;

  let gap = 0;
  let cardW: number;
  if (roomy) {
    gap = Math.min(16, Math.max(6, box.w * 0.05));
    cardW = (box.w - (maxInRow - 1) * gap) / maxInRow;
    if (cardW > 52) cardW = 52;
    else if (cardW < 24 && maxInRow > 1) {
      gap = 4;
      cardW = (box.w - (maxInRow - 1) * gap) / maxInRow;
    }
    cardW = Math.max(18, Math.min(52, cardW));
  } else if (useBinarySlots) {
    const leafSlots = 2 ** Math.max(0, depth - 1);
    cardW = Math.min(40, Math.max(6, box.w / leafSlots - 0.7));
  } else {
    cardW = Math.min(46, Math.max(16, box.w / maxInRow - 2.4));
  }

  let cardH: number;
  if (roomy) {
    cardH = Math.min(22, Math.max(16, Math.min(cardW * 0.48, box.h / depth - 8)));
  } else {
    cardH = Math.min(cardW * 0.62, box.h / depth - 1.0);
    const minH = depth > 8 ? 11.8 : 12;
    const maxH = depth > 8 ? 17.2 : 22;
    cardH = Math.max(minH, Math.min(maxH, cardH));
  }

  const maxPitch = roomy ? 36 : 48;
  const minPitch = cardH + (roomy ? 10 : 4);
  const rowPitch =
    depth > 1 ? Math.max(minPitch, Math.min(maxPitch, (box.h - cardH) / (depth - 1))) : 0;
  const totalH = (depth - 1) * rowPitch + cardH;
  const originY = box.y + Math.max(0, (box.h - totalH) / 2);

  const positions = new Map<string, PedigreeCardPos>();
  for (const [g, row] of byGen) {
    const visualRow = depth - 1 - g;
    const y = originY + visualRow * rowPitch;
    const n = row.length;
    const rowW = roomy ? n * cardW + (n - 1) * gap : box.w;
    const rowLeft = roomy ? box.x + (box.w - rowW) / 2 : box.x;
    row.forEach((s, i) => {
      let x: number;
      if (roomy) {
        x = rowLeft + i * (cardW + gap);
      } else {
        const frac = useBinarySlots
          ? slotCenterFraction(s.generation, s.slot, depth)
          : (i + 0.5) / n;
        const cx = box.x + frac * box.w;
        x = Math.min(box.x + box.w - cardW, Math.max(box.x, cx - cardW / 2));
      }
      positions.set(s.person.id, {
        id: s.person.id,
        x,
        y,
        cx: x + cardW / 2,
        generation: s.generation,
        slot: s.slot,
      });
    });
  }

  return { cardW, cardH, rowPitch, roomy, positions };
}

export function yearSpan(p: Person): string {
  const by = yearFromDate(p.born) ?? "";
  const dy = yearFromDate(p.died) ?? "";
  if (by && dy) return `${by}–${dy}`;
  if (by) return `род. ${by}`;
  if (dy) return `ум. ${dy}`;
  return "";
}

/** Birth/death line for PDF — full dates when known, years otherwise. */
export function lifeDatesLine(p: Person, compact = false): string {
  if (compact) return yearSpan(p);
  const b = formatPersonDate(p.born);
  const d = formatPersonDate(p.died);
  if (b && d) return `${b} — ${d}`;
  if (b) return `род. ${b}`;
  if (d) return `ум. ${d}`;
  return "";
}
