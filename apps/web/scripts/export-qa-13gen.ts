/**
 * Export QA PDFs for a 13-generation male line.
 * Run: cd apps/web && npx vite-node scripts/export-qa-13gen.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTreeExport } from "../src/lib/treeJson";
import { defaultGuide } from "../src/lib/guide";
import { createTree } from "../src/lib/treeEngine";
import { primePdfFonts } from "../src/lib/pdf/font";
import { renderClassicTreePdf } from "../src/lib/pdf/classicTreePdf";
import { renderShezhirePdf } from "../src/lib/pdf/shezhirePdf";
import { maleLineUp, ancestorSlotLayout } from "../src/lib/pdf/lineage";
import {
  QA_13_FOCUS_ID,
  QA_13_PERSON_COUNT,
  qaThirteenGenerationMeta,
  qaThirteenGenerationSnapshot,
} from "../src/lib/pdf/thirteenLineage.fixture";

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../src/assets/fonts");
primePdfFonts(
  readFileSync(resolve(fontDir, "NotoSans-Regular.ttf")).toString("base64"),
  readFileSync(resolve(fontDir, "NotoSans-Bold.ttf")).toString("base64")
);

const outDir = resolve(here, "../../../artifacts/qa-13gen");

function writePdf(name: string, doc: { output: (t: "arraybuffer") => ArrayBuffer }) {
  const buf = Buffer.from(doc.output("arraybuffer"));
  writeFileSync(resolve(outDir, name), buf);
  return buf.length;
}

const snapshot = qaThirteenGenerationSnapshot();
const meta = qaThirteenGenerationMeta();
const male = maleLineUp(snapshot, QA_13_FOCUS_ID);
const slots13 = ancestorSlotLayout(snapshot, QA_13_FOCUS_ID, 13);
const slots5 = ancestorSlotLayout(snapshot, QA_13_FOCUS_ID, 5);

if (male.length !== 13) throw new Error(`expected 13 male-line people, got ${male.length}`);
if (Object.keys(snapshot.persons).length !== QA_13_PERSON_COUNT) {
  throw new Error(`expected ${QA_13_PERSON_COUNT} people`);
}
if (slots13.length !== QA_13_PERSON_COUNT) throw new Error(`layout missing people: ${slots13.length}`);

mkdirSync(outDir, { recursive: true });

const store = {
  ...createTree(meta.title),
  meta,
  draft: snapshot,
  dirty: true,
};
const guide = { ...defaultGuide(), step: "done" as const, selfId: QA_13_FOCUS_ID };
writeFileSync(resolve(outDir, "bek-full-13.json"), JSON.stringify(buildTreeExport(store, guide), null, 2));

const treeDoc = await renderClassicTreePdf({ snapshot, focusId: QA_13_FOCUS_ID, meta, locale: "ru" });
const shezhireMs = await renderShezhirePdf({
  snapshot,
  startId: QA_13_FOCUS_ID,
  meta,
  locale: "ru",
  template: "manuscript",
});
const shezhireReg = await renderShezhirePdf({
  snapshot,
  startId: QA_13_FOCUS_ID,
  meta,
  locale: "ru",
  template: "registry",
});

const treeBytes = writePdf("sejire-tree-bek-13-full.pdf", treeDoc);
const msBytes = writePdf("sejire-shezhire-manuscript-bek-13.pdf", shezhireMs);
const regBytes = writePdf("sejire-shezhire-registry-bek-13.pdf", shezhireReg);

console.log(
  JSON.stringify(
    {
      outDir,
      people: Object.keys(snapshot.persons).length,
      maleLine: male.length,
      slotsIfClassicCappedAt5: slots5.length,
      slotsAt13: slots13.length,
      treePages: treeDoc.getNumberOfPages(),
      files: {
        tree: treeBytes,
        manuscript: msBytes,
        registry: regBytes,
      },
    },
    null,
    2
  )
);
