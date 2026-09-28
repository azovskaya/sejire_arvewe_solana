/** Canvas zoom range — never auto-shrink cards; «Вместить» is an explicit action. */
export const PEDIGREE_SCALE_MIN = 0.55;
export const PEDIGREE_SCALE_MAX = 1.45;

/**
 * Fit the pedigree world into the viewport.
 * Never zooms in past 1 — only shrinks a large tree so it can be seen at once.
 */
export function fitPedigreeView(
  worldW: number,
  worldH: number,
  viewW: number,
  viewH: number,
  pad = 28
): { scale: number; x: number; y: number } {
  const innerW = Math.max(1, viewW - pad * 2);
  const innerH = Math.max(1, viewH - pad * 2);
  const raw = Math.min(innerW / Math.max(1, worldW), innerH / Math.max(1, worldH));
  const scale = Math.min(1, Math.max(PEDIGREE_SCALE_MIN, raw));
  return {
    scale,
    x: (viewW - worldW * scale) / 2,
    y: (viewH - worldH * scale) / 2,
  };
}

export function clampPedigreeScale(scale: number): number {
  return Math.min(PEDIGREE_SCALE_MAX, Math.max(PEDIGREE_SCALE_MIN, scale));
}
