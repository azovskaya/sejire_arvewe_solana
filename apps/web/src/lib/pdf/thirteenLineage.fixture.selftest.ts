import { splitParents } from "../pedigree";
import { ancestorSlotLayout, choosePedigreePoster, maleLineUp, pedigreeChartRoots } from "./lineage";
import {
  QA_13_FOCUS_ID,
  QA_13_GENERATIONS,
  QA_13_PERSON_COUNT,
  qaCompleteAncestrySnapshot,
  qaPaternalLinePersonCount,
  qaPaternalLineSnapshot,
  qaThirteenGenerationSnapshot,
} from "./thirteenLineage.fixture";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const snapshot = qaThirteenGenerationSnapshot();
const ids = Object.keys(snapshot.persons);
assert(ids.length === QA_13_PERSON_COUNT, `count ${ids.length} != ${QA_13_PERSON_COUNT}`);

const self = snapshot.persons[QA_13_FOCUS_ID];
assert(self?.name.includes("Ерлан"), "self name");
const { fatherId, motherId } = splitParents(snapshot, QA_13_FOCUS_ID);
assert(fatherId === "a2" && motherId === "a3", "self parents");
assert(snapshot.persons.a2.sex === "M" && snapshot.persons.a3.sex === "F", "parent sexes");

let missingPair = 0;
for (const id of ids) {
  const { fatherId: f, motherId: m } = splitParents(snapshot, id);
  const n = Number(id.slice(1));
  const gen = Math.floor(Math.log2(n));
  if (gen < QA_13_GENERATIONS - 1 && (!f || !m)) missingPair += 1;
}
assert(missingPair === 0, `every non-root has father and mother (${missingPair} missing)`);

const oldest = ids.filter((id) => {
  const n = Number(id.slice(1));
  return Math.floor(Math.log2(n)) === QA_13_GENERATIONS - 1;
});
assert(oldest.length === 2 ** (QA_13_GENERATIONS - 1), "oldest knee size");
for (const id of oldest) {
  const { fatherId: f, motherId: m } = splitParents(snapshot, id);
  assert(!f && !m, `${id} should be a root`);
}

const male = maleLineUp(snapshot, QA_13_FOCUS_ID);
assert(male.length === QA_13_GENERATIONS, `male line ${male.length}`);
assert(male.every((p) => p.sex === "M"), "male line sexes");

const slots = ancestorSlotLayout(snapshot, QA_13_FOCUS_ID, QA_13_GENERATIONS);
assert(slots.length === QA_13_PERSON_COUNT, `layout ${slots.length}`);

const charts = pedigreeChartRoots(snapshot, QA_13_FOCUS_ID, QA_13_GENERATIONS, 5);
assert(charts.length === 1 + 16 + 256, `chart roots ${charts.length}`);
const poster = choosePedigreePoster(snapshot, QA_13_FOCUS_ID, QA_13_GENERATIONS);
assert(poster.format === "a2", `13-knee full tree uses A2, got ${poster.format}`);
assert(poster.truncated, "13-knee full binary cannot fit 4096 leaves; poster shows nearest gens");
assert(poster.generations >= 6 && poster.generations <= 7, `readable gens on A2, got ${poster.generations}`);

const seven = qaCompleteAncestrySnapshot(7);
assert(Object.keys(seven.persons).length === 127, "7-knee complete tree is 127 people");
const sevenPoster = choosePedigreePoster(seven, QA_13_FOCUS_ID, 13);
assert(sevenPoster.format === "a2", `7-knee poster is A2, got ${sevenPoster.format}`);
assert(sevenPoster.generations === 7 && !sevenPoster.truncated, "7-knee fits on one A2 sheet");

const ata = qaPaternalLineSnapshot(13);
assert(Object.keys(ata.persons).length === qaPaternalLinePersonCount(13), "13-knee ata line is 25 people");
assert(Object.keys(ata.persons).length < 40, "ata line must stay tiny enough for the screen");
assert(ata.persons.a1 && ata.persons.a2 && ata.persons.a4096, "ata line keeps self, father, oldest");
assert(!ata.persons.a6, "mother's father is not on the paternal-line canvas");
const ataSlots = ancestorSlotLayout(ata, QA_13_FOCUS_ID, 13);
assert(ataSlots.length === Object.keys(ata.persons).length, "ata layout paints only kept people");

console.log("thirteenLineage.fixture.selftest: OK", {
  people: ids.length,
  maleLine: male.length,
  charts: charts.length,
  poster: `${poster.format.toUpperCase()} ${poster.generations} gens`,
});
