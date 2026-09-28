import { isQuotaExceeded, setLocalJson } from "./storageQuota";
import { loadDraftTree, saveDraftTree } from "./draftStorage";
import { createTree } from "./treeEngine";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const mem = new Map<string, string>();
let failNext = false;
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => {
    if (failNext) {
      failNext = false;
      const err = new Error("The quota has been exceeded.");
      err.name = "QuotaExceededError";
      (err as Error & { code: number }).code = 22;
      throw err;
    }
    mem.set(k, String(v));
  },
  removeItem: (k) => {
    mem.delete(k);
  },
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size;
  },
} as Storage;

const quota = new Error("quota");
quota.name = "QuotaExceededError";
assert(isQuotaExceeded(quota), "QuotaExceededError");
assert(!isQuotaExceeded(new Error("nope")), "other errors");

assert(setLocalJson("k", { a: 1 }) === true, "small write");
failNext = true;
assert(setLocalJson("k", { huge: true }) === false, "quota → false, no throw");

const tree = createTree("Quota");
assert(saveDraftTree(tree) === true, "draft saved");
assert(loadDraftTree()?.meta.title === "Quota", "draft loaded");
failNext = true;
assert(saveDraftTree(tree) === false, "draft quota");
assert(loadDraftTree()?.meta.title === "Quota", "previous draft kept");

console.log("storageQuota.selftest: OK");
