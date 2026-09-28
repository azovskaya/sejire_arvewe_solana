/**
 * GitHub Pages is a test mirror. Canon is sejire.ar.io (still the old pack).
 * Never show this warning on ar.io / permaweb.
 */
export function isPagesTestMirrorHost(hostname: string, qaTools: boolean): boolean {
  const h = hostname.toLowerCase();
  if (h === "sejire.ar.io" || h.endsWith(".ar.io")) return false;
  if (h.endsWith(".arweave.net") || h.endsWith(".arweave.dev")) return false;
  if (qaTools) return true;
  if (h.endsWith("github.io")) return true;
  if (h === "localhost" || h === "127.0.0.1") return true;
  return false;
}

export function isPagesTestMirror(): boolean {
  if (typeof location === "undefined") return false;
  return isPagesTestMirrorHost(location.hostname, import.meta.env.VITE_QA_TOOLS === "1");
}
