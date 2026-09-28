/**
 * Classic tree PDF and shezhire PDF must start from the same person.
 * Prefer the card you selected; else the canvas focus; else yourself.
 */
export function pickPdfRootId(opts: {
  selectedId: string | null;
  focusId: string | null;
  homeId: string | null;
}): string | null {
  return opts.selectedId ?? opts.focusId ?? opts.homeId;
}
