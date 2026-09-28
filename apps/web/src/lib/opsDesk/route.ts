/** Cashier lives on the same Pages/ArNS pack: `#/admin`. */

export function isOpsHash(hash: string): boolean {
  const path = hash.replace(/^#/, "").replace(/^\/+/, "").split("?")[0];
  return path === "admin" || path.startsWith("admin/");
}

export function opsHash(): string {
  return "#/admin";
}

export function openOpsHash(): void {
  if (typeof location === "undefined") return;
  if (!isOpsHash(location.hash)) location.hash = opsHash();
}

export function closeOpsHash(): void {
  if (typeof location === "undefined") return;
  if (isOpsHash(location.hash)) {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
}
