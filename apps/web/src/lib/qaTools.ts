/**
 * Extra editor tools for the GitHub Pages mirror (13-knee demo, etc.).
 * Unset on ArNS / permaweb so the eternal bundle stays a product, not a lab.
 */
export const QA_TOOLS_ENABLED = import.meta.env.VITE_QA_TOOLS === "1";

export function isQaToolsEnabled(): boolean {
  return QA_TOOLS_ENABLED;
}
