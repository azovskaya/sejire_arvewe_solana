import type { JWKInterface } from "arweave/web/lib/wallet";
import { createArweaveClient, withArweaveHost } from "../arweave/client";
import { getWalletBalanceAr } from "../arweave/publish";
import { looksLikeJwk } from "./store";

export async function generateTreasuryWallet(): Promise<{ jwk: string; address: string }> {
  const client = createArweaveClient();
  const jwk = await client.wallets.generate();
  const address = await client.wallets.jwkToAddress(jwk);
  return { jwk: JSON.stringify(jwk), address };
}

export async function addressFromTreasuryJson(jwkJson: string): Promise<string> {
  if (!looksLikeJwk(jwkJson)) throw new Error("turbo_jwk_invalid");
  const jwk = JSON.parse(jwkJson) as JWKInterface;
  return withArweaveHost((client) => client.wallets.jwkToAddress(jwk));
}

export async function treasuryBalanceAr(jwkJson: string): Promise<string> {
  if (!looksLikeJwk(jwkJson)) throw new Error("turbo_jwk_invalid");
  return getWalletBalanceAr(JSON.parse(jwkJson) as JWKInterface);
}
