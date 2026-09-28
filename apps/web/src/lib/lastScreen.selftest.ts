import { shouldResumeDraft } from "./lastScreen";
import { pickPdfRootId } from "./pdfRoot";
import { clampPedigreeScale, fitPedigreeView, PEDIGREE_SCALE_MIN } from "./pedigreeFit";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(shouldResumeDraft("work", true), "resume work with draft");
assert(!shouldResumeDraft("work", false), "no draft → welcome");
assert(!shouldResumeDraft("welcome", true), "explicit home stays welcome");
assert(!shouldResumeDraft(null, true), "fresh tab stays welcome");

assert(
  pickPdfRootId({ selectedId: "s", focusId: "f", homeId: "h" }) === "s",
  "selected wins"
);
assert(
  pickPdfRootId({ selectedId: null, focusId: "f", homeId: "h" }) === "f",
  "focus if nothing selected"
);
assert(
  pickPdfRootId({ selectedId: null, focusId: null, homeId: "h" }) === "h",
  "home fallback"
);
assert(
  pickPdfRootId({ selectedId: "s", focusId: "f", homeId: "h" }) ===
    pickPdfRootId({ selectedId: "s", focusId: "other", homeId: "h" }),
  "classic and shezhire share selected"
);

const tiny = fitPedigreeView(200, 200, 800, 600);
assert(tiny.scale === 1, `tiny tree does not zoom in, got ${tiny.scale}`);

const huge = fitPedigreeView(4000, 3000, 400, 300);
assert(huge.scale === PEDIGREE_SCALE_MIN, `huge tree clamps to min, got ${huge.scale}`);

const mid = fitPedigreeView(600, 400, 500, 400);
assert(mid.scale < 1 && mid.scale > PEDIGREE_SCALE_MIN, `mid tree shrinks, got ${mid.scale}`);

assert(clampPedigreeScale(0.1) === PEDIGREE_SCALE_MIN, "clamp lo");
assert(clampPedigreeScale(9) === 1.45, "clamp hi");

console.log("lastScreen/pdfRoot/pedigreeFit.selftest: OK");
