/** Remember the editor so a crash reload reopens the draft, not the welcome brand. */
export const LAST_SCREEN_KEY = "sejire.lastScreen";

export type LastScreen = "welcome" | "work" | "restore";

export function rememberScreen(screen: LastScreen) {
  try {
    sessionStorage.setItem(LAST_SCREEN_KEY, screen);
  } catch {
    /* private mode / SSR */
  }
}

export function readLastScreen(): LastScreen | null {
  try {
    const v = sessionStorage.getItem(LAST_SCREEN_KEY);
    if (v === "work" || v === "welcome" || v === "restore") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function shouldResumeDraft(last: LastScreen | null, hasDraft: boolean): boolean {
  return last === "work" && hasDraft;
}
