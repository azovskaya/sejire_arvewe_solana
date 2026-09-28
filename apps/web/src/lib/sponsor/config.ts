/**
 * Client config for fiat-sponsored / demo publish.
 *
 * VITE_PUBLISH_MODE:
 *   - self     — user funds derived AR address (default / fallback)
 *   - sponsor  — cashier Worker (Kaspi later; mock now)
 *   - demo     — browser-only “eternal” save for Pages QA (no Worker, no AR)
 *
 * VITE_SPONSOR_URL — Worker origin, e.g. http://127.0.0.1:8787
 */

export type PublishMode = "self" | "sponsor" | "demo";

export function getPublishMode(): PublishMode {
  const raw = (import.meta.env.VITE_PUBLISH_MODE as string | undefined)?.toLowerCase();
  if (raw === "sponsor") return "sponsor";
  if (raw === "demo") return "demo";
  return "self";
}

export function getSponsorUrl(): string | null {
  const url = (import.meta.env.VITE_SPONSOR_URL as string | undefined)?.trim();
  if (!url) return null;
  return url.replace(/\/$/, "");
}

export function isSponsorPublishEnabled(): boolean {
  return getPublishMode() === "sponsor" && Boolean(getSponsorUrl());
}

/** Pages / QA: save versions in this browser without cashier or AR. */
export function isDemoPublishEnabled(): boolean {
  return getPublishMode() === "demo";
}
