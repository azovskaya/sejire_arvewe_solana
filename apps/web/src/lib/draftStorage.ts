import type { TreeStore } from "./types";
import { coerceTreeStore } from "./treeJson";
import { setLocalJson } from "./storageQuota";

const DRAFT_KEY = "sejire.draft.tree.v1";

/** Persist the editor draft. Returns false when the browser is out of space. */
export function saveDraftTree(store: TreeStore): boolean {
  return setLocalJson(DRAFT_KEY, store);
}

export function loadDraftTree(): TreeStore | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return coerceTreeStore(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearDraftTree() {
  localStorage.removeItem(DRAFT_KEY);
}
