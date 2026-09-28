export type PaymentProviderSetting = "mock" | "kaspi";

export type OpsSecrets = {
  turboJwk?: string;
  siteJwk?: string;
  kaspiMerchantToken?: string;
};

export type OpsSettings = {
  paymentProvider: PaymentProviderSetting;
  publishPriceMinor: string;
  publishCurrency: string;
  kaspiTradePointId: string;
  kaspiApiBase: string;
};

export type OpsMovement = {
  at: number;
  kind: "paid" | "saved";
  amountMinor: number;
  currency: string;
  provider: string;
  /** Truncated TX id — never a vault id or seed. */
  txFp?: string;
  /** Truncated vault fingerprint — never the full id. */
  vaultFp?: string;
};

export type HotTreasury = {
  jwk: string;
  address: string;
};

export type RedactedOpsKeys = {
  treasuryConfigured: boolean;
  treasuryAddress: string | null;
  treasuryBalanceAr: string | null;
  siteKeyConfigured: boolean;
  kaspiTokenConfigured: boolean;
  kaspiTradePointId: string;
  kaspiApiBase: string;
  paymentProvider: PaymentProviderSetting;
  publishPriceMinor: string;
  publishCurrency: string;
  passwordConfigured: boolean;
  hotTreasury: boolean;
};

export type NetworkSave = {
  txId: string;
  at: string;
  vaultFp: string;
  owner: string | null;
};

export type OpsOverview = {
  trees: number;
  saves: number;
  paidCount: number;
  paidMinor: number;
  currency: string;
  created: { at: string }[];
  payments: {
    at: string;
    amountMinor: number;
    currency: string;
    provider: string;
    status: "paid" | "saved";
  }[];
  network: NetworkSave[];
  treasuryReady: boolean;
  treasuryAddress: string | null;
  kaspiReady: boolean;
  provider: PaymentProviderSetting;
};
