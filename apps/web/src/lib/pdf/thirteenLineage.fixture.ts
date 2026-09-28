import type { Person, Snapshot, TreeMeta } from "../types";
import { SHEZHIRE_MAX_GENERATIONS } from "../i18n/pdf";

/**
 * Complete ancestry fixture: every person has father + mother through 13 knees.
 * Ahnentafel ids: a1 = self, a2 = father, a3 = mother, a4 = father's father, …
 * 2^13 − 1 = 8191 people. Oldest knee has no parents.
 */
export const QA_13_GENERATIONS = SHEZHIRE_MAX_GENERATIONS;
export const QA_13_FOCUS_ID = "a1";
export const QA_13_PERSON_COUNT = 2 ** QA_13_GENERATIONS - 1;

const MEN = [
  "Абай",
  "Алтай",
  "Алтынбек",
  "Асан",
  "Баймурат",
  "Бек",
  "Бекжан",
  "Болат",
  "Ерден",
  "Ерлан",
  "Касым",
  "Кожакул",
  "Мухтар",
  "Нурлан",
  "Сарыбай",
  "Серик",
  "Смагул",
  "Темир",
  "Толеген",
  "Есенкул",
] as const;

const WOMEN = [
  "Айгуль",
  "Айжан",
  "Баян",
  "Гульнара",
  "Динара",
  "Жанар",
  "Зейнеп",
  "Камшат",
  "Ляззат",
  "Майра",
  "Назерке",
  "Сауле",
  "Алия",
  "Ботагоз",
  "Карлыгаш",
  "Меруерт",
  "Роза",
  "Салтанат",
  "Фарида",
  "Шолпан",
] as const;

/** Close family keeps stable display names for screenshots / PDF page 1. */
const NAMED_GIVEN: Record<number, string> = {
  1: "Ерлан",
  2: "Бекжан",
  3: "Айгуль",
  4: "Ерлан",
  5: "Гульнара",
  6: "Серик",
  7: "Сауле",
};

function ahnentafelSex(n: number): "M" | "F" {
  if (n === 1) return "M";
  return n % 2 === 0 ? "M" : "F";
}

function generationOf(n: number): number {
  return Math.floor(Math.log2(n));
}

function givenName(n: number, sex: "M" | "F"): string {
  const named = NAMED_GIVEN[n];
  if (named) return named;
  const pool = sex === "M" ? MEN : WOMEN;
  return pool[(n * 17) % pool.length];
}

function personOf(
  n: number,
  given: string,
  fatherGiven: string | null,
  sex: "M" | "F",
  count: number
): Person {
  const gen = generationOf(n);
  const bornYear = 1998 - gen * 27 + (sex === "F" ? 2 : 0);
  const living = gen <= 1;
  const diedYear = living ? null : bornYear + 68;
  const patronymic = fatherGiven
    ? sex === "M"
      ? `${fatherGiven}улы`
      : `${fatherGiven}кызы`
    : "";
  const surname = sex === "F" ? "Бекова" : "Беков";
  const name = [given, patronymic, gen <= 4 ? surname : ""]
    .filter(Boolean)
    .join(" ");
  const fatherId = 2 * n <= count ? `a${2 * n}` : null;
  const motherId = 2 * n + 1 <= count ? `a${2 * n + 1}` : null;
  return {
    id: `a${n}`,
    name,
    sex,
    born: String(bornYear),
    died: diedYear ? String(diedYear) : null,
    birthPlace: gen <= 2 ? "Астана" : "Сарыарқа",
    parents: [fatherId, motherId].filter((id): id is string => Boolean(id)),
    media: [],
    notes: "",
    tombstone: false,
  };
}

/** Complete binary ancestry: every person has father + mother through `generations` knees. */
export function qaCompleteAncestrySnapshot(generations: number): Snapshot {
  const count = 2 ** generations - 1;
  const givens: string[] = new Array(count + 1);
  const sexes: Array<"M" | "F"> = new Array(count + 1);
  for (let n = 1; n <= count; n += 1) {
    sexes[n] = ahnentafelSex(n);
    givens[n] = givenName(n, sexes[n]);
  }
  const persons: Record<string, Person> = {};
  for (let n = 1; n <= count; n += 1) {
    const fatherN = 2 * n;
    const fatherGiven = fatherN <= count ? givens[fatherN] : null;
    const p = personOf(n, givens[n], fatherGiven, sexes[n], count);
    persons[p.id] = p;
  }
  return { persons };
}

export function qaCompleteAncestryMeta(generations: number): TreeMeta {
  const full = generations >= 13;
  return {
    id: `tree_qa_${generations}_full`,
    title: full ? "Беков — 13 колен, полное древо" : `Беков — ${generations} колен`,
    head: null,
    next_version: 1,
    created_at: "2026-08-21T00:00:00.000Z",
    author: "local:qa",
    zhuz: "orta",
    clanName: "Арғын · Беков",
    tamgaUrl: null,
  };
}

export function qaThirteenGenerationSnapshot(): Snapshot {
  return qaCompleteAncestrySnapshot(QA_13_GENERATIONS);
}

export function qaThirteenGenerationMeta(): TreeMeta {
  return qaCompleteAncestryMeta(QA_13_GENERATIONS);
}

/**
 * Paternal line + wives only (25 people at 13 knees). Safe for the on-screen
 * canvas — the full 8191-person binary tree must never be mounted in the DOM.
 */
export function qaPaternalLineSnapshot(generations: number): Snapshot {
  const full = qaCompleteAncestrySnapshot(generations);
  const keep = new Set<string>(["a1"]);
  for (let k = 1; k < generations; k += 1) {
    keep.add(`a${2 ** k}`);
    keep.add(`a${2 ** k + 1}`);
  }
  const persons: Record<string, Person> = {};
  for (const id of keep) {
    const src = full.persons[id];
    if (!src) continue;
    persons[id] = {
      ...src,
      parents: src.parents.filter((pid) => keep.has(pid)),
    };
  }
  return { persons };
}

export function qaPaternalLineMeta(generations: number): TreeMeta {
  return {
    id: `tree_qa_${generations}_ata`,
    title: `Беков — ${generations} колен, линия ата`,
    head: null,
    next_version: 1,
    created_at: "2026-08-21T00:00:00.000Z",
    author: "local:qa",
    zhuz: "orta",
    clanName: "Арғын · Беков",
    tamgaUrl: null,
  };
}

export function qaPaternalLinePersonCount(generations: number): number {
  return 2 * generations - 1;
}
