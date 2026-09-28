import { useEffect, useRef, useState } from "react";
import type { SolanaWalletAdapter } from "@ardrive/turbo-sdk/web";
import type { EnvelopeV1 } from "../lib/crypto/encrypt";
import { downloadEnvelope } from "../lib/crypto/vault";
import { useI18n } from "../lib/i18n/I18nProvider";
import { configuredNetwork, connectWallet, downloadReceipt, prepareQuote, uploadWithSolana, type PreservationReceipt, type WalletName } from "../lib/solana/client";
import { formatSol, type UploadQuote } from "../lib/solana/policy";
import { solanaMessages } from "../lib/solana/messages";
import { setLocalJson } from "../lib/storageQuota";

export function SolanaPublishPanel({ envelope, parentTxId, onBack, onDone, onBusy, onAccepted }: {
  envelope: EnvelopeV1; parentTxId: string | null;
  onBack: () => void; onDone: (receipt: PreservationReceipt) => void; onBusy: (busy: boolean) => void;
  onAccepted: (receipt: PreservationReceipt) => void;
}) {
  const { locale } = useI18n();
  const t = solanaMessages[locale];
  const network = configuredNetwork();
  const [wallet, setWallet] = useState<SolanaWalletAdapter | null>(null);
  const [quote, setQuote] = useState<UploadQuote | null>(null);
  const [receipt, setReceipt] = useState<PreservationReceipt | null>(null);
  const [receiptStorageFailed, setReceiptStorageFailed] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);
  useEffect(() => {
    if (!busy) return;
    const prevent = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [busy]);

  function working(value: boolean) { lock.current = value; setBusy(value); onBusy(value); }
  async function connect(name?: WalletName) {
    if (lock.current) return;
    working(true); setError(""); setQuote(null); setConsent(false);
    try {
      const next = name ? await connectWallet(name) : wallet;
      if (!next) return;
      setWallet(next);
      setQuote(await prepareQuote(envelope, network, next.publicKey.toString()));
    } catch (e) {
      setError(e instanceof Error && e.message === "wallet_not_found" ? t.wallet : t.unavailable);
    } finally { working(false); }
  }

  async function publish() {
    if (lock.current || !wallet || !quote || !consent) return;
    if (Date.now() >= quote.expiresAt) { setQuote(null); setConsent(false); setError(t.expired); return; }
    working(true); setError(""); ctrl.current = new AbortController();
    try {
      const result = await uploadWithSolana({ envelope, parentTxId, wallet, quote, network, signal: ctrl.current.signal });
      setReceipt(result);
      try {
        setReceiptStorageFailed(!setLocalJson(`sejire.solana.receipt.${result.network}.${result.receipt.id}`, result));
      } catch {
        // A browser-storage failure must never turn a completed upload into a
        // payment failure or invite the user to pay again.
        setReceiptStorageFailed(true);
      }
      try { onAccepted(result); } catch { setReceiptStorageFailed(true); }
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(code === "quote_expired" ? t.expired : /changed/.test(code) ? t.changed : t.failed);
      setQuote(null); setConsent(false);
    } finally { working(false); }
  }

  return <section className="solana-panel" aria-label={t.title}>
    <p className={`network-note ${network === "devnet" ? "is-test" : ""}`}>{network === "devnet" ? t.test : t.live}</p>
    {!receipt && <>
      <p className="sub">{t.privacy}</p>
      <div className="actions">
        <button type="button" className="btn" disabled={busy} onClick={() => void connect("Phantom")}>{t.connect} Phantom</button>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => void connect("Solflare")}>{t.connect} Solflare</button>
      </div>
      {quote && <div className="solana-quote">
        <p className="mono publish-meta">{quote.address}</p>
        <p>{t.limit}: <strong>{formatSol(quote.maxLamports)} SOL</strong></p>
        <p className="sub">{t.fees}</p>
        <label className="consent-line"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />{t.consent}</label>
        <button type="button" className="btn" disabled={busy || !consent} onClick={() => void publish()}>{t.publish}</button>
      </div>}
      {wallet && !quote && !busy && <button type="button" className="btn ghost" onClick={() => void connect()}>{t.quote}</button>}
    </>}
    {busy && <p className="sub" role="status">{t.working}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {receipt && <div role="status">
      <h3>{t.accepted}</h3><p className="sub">{t.pending}</p>
      {receiptStorageFailed && <p role="alert">{t.localReceipt}</p>}
      <p className="mono publish-meta">{receipt.receipt.id}</p>
      <button type="button" className="btn" onClick={() => downloadReceipt(receipt)}>{t.receipt}</button>
    </div>}
    <div className="actions">
      <button type="button" className="btn ghost" disabled={busy} onClick={() => downloadEnvelope(envelope)}>{t.backup}</button>
      <button type="button" className="btn ghost" disabled={busy} onClick={() => receipt ? onDone(receipt) : onBack()}>{receipt ? t.done : t.back}</button>
    </div>
  </section>;
}
