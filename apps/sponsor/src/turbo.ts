/**
 * Treasury upload: sign an Arweave tx with TURBO_JWK and post it.
 * Tries Turbo HTTP first; falls back to arweave.net if the bundler rejects the tx.
 */
import type { JWKInterface } from "arweave/node/lib/wallet";
import type { EnvelopeLike } from "./envelope";

export function parseTreasuryJwk(raw: string): JWKInterface {
  let jwk: JWKInterface;
  try {
    jwk = JSON.parse(raw) as JWKInterface;
  } catch {
    throw new Error("turbo_jwk_invalid");
  }
  if (typeof jwk.n !== "string" || typeof jwk.d !== "string" || typeof jwk.kty !== "string") {
    throw new Error("turbo_jwk_invalid");
  }
  return jwk;
}

export async function uploadJsonWithTreasury(
  envelope: EnvelopeLike,
  opts: {
    turboJwk: string;
    tags: Array<[string, string]>;
  }
): Promise<{ txId: string; mock: false }> {
  const jwk = parseTreasuryJwk(opts.turboJwk);

  const Arweave = (await import("arweave")).default;
  const client = Arweave.init({ host: "arweave.net", port: 443, protocol: "https" });
  const tx = await client.createTransaction({ data: JSON.stringify(envelope) }, jwk);
  for (const [name, value] of opts.tags) tx.addTag(name, value);
  await client.transactions.sign(tx, jwk);

  try {
    const turboRes = await fetch("https://upload.ardrive.io/v1/tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tx),
    });
    if (turboRes.ok) {
      const body = (await turboRes.json().catch(() => ({}))) as { id?: string };
      return { txId: body.id || tx.id, mock: false };
    }
  } catch {
    /* bundler down — native gateway */
  }

  const posted = await client.transactions.post(tx);
  if (posted.status === 200 || posted.status === 208) {
    return { txId: tx.id, mock: false };
  }
  throw new Error(`turbo_upload_failed:${posted.status}`);
}
