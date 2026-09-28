import type { SolanaWalletAdapter, TurboUploadDataItemResponse } from "@ardrive/turbo-sdk/web";
import type { EnvelopeV1 } from "../crypto/encrypt";
import { assertQuote, envelopeDigest, envelopeTags, networkConfig, quoteCap, serializeEnvelope, solToLamports, type SolanaNetwork, type UploadQuote } from "./policy";

type Provider = SolanaWalletAdapter & { connect(): Promise<unknown>; isPhantom?: boolean };
type WalletWindow = Window & { phantom?: { solana?: Provider }; solflare?: Provider };
export type WalletName = "Phantom" | "Solflare";
export type PreservationReceipt = {
  schema: "sejire/preservation-receipt/v1";
  network: SolanaNetwork;
  status: "accepted-by-turbo";
  wallet: string;
  envelopeSha256: string;
  acceptedAt: string;
  receipt: TurboUploadDataItemResponse;
};

export function configuredNetwork(): SolanaNetwork {
  const value = import.meta.env.VITE_SOLANA_NETWORK;
  if (value === "mainnet-beta") return value;
  if (value && value !== "devnet") throw new Error("invalid_network");
  return "devnet";
}

export async function connectWallet(name: WalletName): Promise<SolanaWalletAdapter> {
  const w = window as WalletWindow;
  const provider = name === "Phantom" ? w.phantom?.solana : w.solflare;
  if (!provider) throw new Error("wallet_not_found");
  await provider.connect();
  const address = provider.publicKey?.toString();
  if (!address || !provider.signMessage || !provider.signTransaction) throw new Error("unsupported_wallet");
  function checkAccount() {
    if (provider!.publicKey?.toString() !== address) throw new Error("wallet_changed");
  }
  // Clone the adapter: the SDK wraps signMessage; never mutate the wallet extension object.
  return {
    publicKey: { toString: () => { checkAccount(); return address; } },
    signMessage: async (message) => { checkAccount(); return provider.signMessage(message); },
    signTransaction: async (tx) => { checkAccount(); return provider.signTransaction(tx); },
  };
}

export async function prepareQuote(envelope: EnvelopeV1, network: SolanaNetwork, address: string): Promise<UploadQuote> {
  const data = serializeEnvelope(envelope);
  const { TurboFactory } = await import("@ardrive/turbo-sdk/web");
  const client = TurboFactory.unauthenticated(networkConfig(network));
  // Include bounded ANS-104 signature/tag overhead; the actual charge can be smaller or free.
  const result = await client.getTokenPriceForBytes({ byteCount: new TextEncoder().encode(data).length + 4096 });
  if (result.token !== "solana") throw new Error("invalid_quote");
  return { network, address, digest: await envelopeDigest(data), maxLamports: quoteCap(solToLamports(result.tokenPrice)), expiresAt: Date.now() + 120_000 };
}

export async function uploadWithSolana(input: {
  envelope: EnvelopeV1; parentTxId?: string | null; wallet: SolanaWalletAdapter;
  quote: UploadQuote; network: SolanaNetwork; signal: AbortSignal;
}): Promise<PreservationReceipt> {
  const data = serializeEnvelope(input.envelope);
  const digest = await envelopeDigest(data);
  const address = input.wallet.publicKey.toString();
  assertQuote(input.quote, { network: input.network, address, digest });
  const { TurboFactory, OnDemandFunding } = await import("@ardrive/turbo-sdk/web");
  const client = TurboFactory.authenticated({ ...networkConfig(input.network), walletAdapter: input.wallet });
  const blob = new Blob([data], { type: "application/json" });
  const receipt = await client.uploadFile({
    fileStreamFactory: () => blob.stream(), fileSizeFactory: () => blob.size,
    dataItemOpts: { tags: envelopeTags(input.envelope, input.parentTxId) },
    fundingMode: new OnDemandFunding({ maxTokenAmount: input.quote.maxLamports, topUpBufferMultiplier: 1 }),
    signal: input.signal,
  });
  if (!/^[A-Za-z0-9_-]{43}$/.test(receipt.id)) throw new Error("invalid_receipt");
  return { schema: "sejire/preservation-receipt/v1", network: input.network,
    status: "accepted-by-turbo", wallet: address, envelopeSha256: digest,
    acceptedAt: new Date().toISOString(), receipt };
}

export function downloadReceipt(receipt: PreservationReceipt) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = `sejire-receipt-${receipt.receipt.id.slice(0, 8)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
