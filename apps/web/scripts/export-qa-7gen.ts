/**
 * Export the same classic-tree PDF the app downloads for a complete 7-knee scheme.
 * Run: cd apps/web && npx vite-node scripts/export-qa-7gen.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTreeExport } from "../src/lib/treeJson";
import { defaultGuide } from "../src/lib/guide";
import { createTree } from "../src/lib/treeEngine";
import { primePdfFonts } from "../src/lib/pdf/font";
import { renderClassicTreePdf } from "../src/lib/pdf/classicTreePdf";
import { ancestorSlotLayout, choosePedigreePoster } from "../src/lib/pdf/lineage";
import { safeFilename } from "../src/lib/pdf/filename";
import {
  QA_13_FOCUS_ID,
  qaCompleteAncestryMeta,
  qaCompleteAncestrySnapshot,
} from "../src/lib/pdf/thirteenLineage.fixture";

const GENS = 7;
const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../src/assets/fonts");
primePdfFonts(
  readFileSync(resolve(fontDir, "NotoSans-Regular.ttf")).toString("base64"),
  readFileSync(resolve(fontDir, "NotoSans-Bold.ttf")).toString("base64")
);

const outDir = resolve(here, "../../../artifacts/qa-7gen");
mkdirSync(outDir, { recursive: true });

const snapshot = qaCompleteAncestrySnapshot(GENS);
const meta = qaCompleteAncestryMeta(GENS);
const count = Object.keys(snapshot.persons).length;
const expected = 2 ** GENS - 1;
if (count !== expected) throw new Error(`expected ${expected} people, got ${count}`);

const plan = choosePedigreePoster(snapshot, QA_13_FOCUS_ID, 13);
const slots = ancestorSlotLayout(snapshot, QA_13_FOCUS_ID, plan.generations);
if (slots.length !== expected) throw new Error(`layout ${slots.length}`);
if (plan.format !== "a2" || plan.truncated) {
  throw new Error(`expected one A2 sheet of 7 knees, got ${JSON.stringify(plan)}`);
}

const store = {
  ...createTree(meta.title),
  meta,
  draft: snapshot,
  dirty: true,
};
const guide = { ...defaultGuide(), step: "done" as const, selfId: QA_13_FOCUS_ID };
writeFileSync(resolve(outDir, "bek-full-7.json"), JSON.stringify(buildTreeExport(store, guide), null, 2));

const treeDoc = await renderClassicTreePdf({ snapshot, focusId: QA_13_FOCUS_ID, meta, locale: "ru" });
const paper = "A2";
const filename = `sejire-tree-${safeFilename(meta.title, "tree")}-${paper}.pdf`;
const pdfPath = resolve(outDir, filename);
writeFileSync(pdfPath, Buffer.from(treeDoc.output("arraybuffer")));

console.log(
  JSON.stringify(
    {
      outDir,
      people: count,
      pages: treeDoc.getNumberOfPages(),
      paper,
      generations: plan.generations,
      truncated: plan.truncated,
      pdf: pdfPath,
      bytes: Buffer.from(treeDoc.output("arraybuffer")).length,
    },
    null,
    2
  )
);
