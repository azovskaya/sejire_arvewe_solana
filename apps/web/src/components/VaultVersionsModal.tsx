import { useEffect, useState } from "react";
import {
  fetchVaultEnvelope,
  formatVersionWhen,
  isGatewayUnavailable,
  listVaultVersions,
  type VaultVersionMeta,
} from "../lib/arweave/fetch";
import { deriveKeysFromMnemonic, fingerprintVaultId } from "../lib/crypto/keys";
import { openEnvelope, openLocalVault, type VaultV1 } from "../lib/crypto/vault";
import { isValidMnemonic, normalizeMnemonic } from "../lib/crypto/bip39";
import {
  getSessionMnemonic,
  getVaultSession,
  setVaultSession,
} from "../lib/vaultSession/session";
import {
  getLocalVaultVersion,
  listLocalVaultVersions,
  type LocalVaultVersion,
} from "../lib/vaultSession/localArchive";
import { activePersons } from "../lib/treeEngine";
import { useI18n } from "../lib/i18n/I18nProvider";
import { formatUiDateTime } from "../lib/i18n/messages";

type Props = {
  onClose: () => void;
  onOpenVersion: (vault: VaultV1) => void;
};

type ListedVersion =
  | { kind: "network"; meta: VaultVersionMeta }
  | { kind: "archive"; entry: LocalVaultVersion };

function mergeVersionLists(
  network: VaultVersionMeta[],
  archive: LocalVaultVersion[]
): ListedVersion[] {
  const seen = new Set<string>();
  const out: ListedVersion[] = [];
  for (const meta of network) {
    seen.add(meta.txId);
    out.push({ kind: "network", meta });
  }
  for (const entry of archive) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push({ kind: "archive", entry });
  }
  return out;
}

export function VaultVersionsModal({ onClose, onOpenVersion }: Props) {
  const { locale, t } = useI18n();
  const session = getVaultSession();
  const [versions, setVersions] = useState<ListedVersion[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [phrase, setPhrase] = useState(getSessionMnemonic() ?? "");
  const [needPhrase, setNeedPhrase] = useState(!getSessionMnemonic());
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!session?.vaultId) {
      setBusy(false);
      setError(t.versions.needOpen);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setStatus(t.publish.vaultFp(fingerprintVaultId(session.vaultId)));
        let network: VaultVersionMeta[] = [];
        let networkError: string | null = null;
        try {
          network = await listVaultVersions(session.vaultId);
        } catch (e) {
          network = [];
          networkError = isGatewayUnavailable(e)
            ? e instanceof Error
              ? e.message
              : t.restore.arweaveDown
            : t.restore.arweaveFail;
        }
        const archive = listLocalVaultVersions(session.vaultId);
        const merged = mergeVersionLists(network, archive);
        if (!cancelled) {
          setVersions(merged);
          if (merged.length === 0) {
            setError(
              networkError
                ? `${networkError} ${t.versions.noneLocalToo}`
                : t.versions.none
            );
          } else if (networkError) {
            setError(`${networkError} ${t.restore.shownLocal}`);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) {
          setBusy(false);
          setStatus("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.vaultId]);

  async function openListed(item: ListedVersion) {
    if (!session?.vaultId) return;
    const raw = normalizeMnemonic(phrase);
    if (!isValidMnemonic(raw)) {
      setNeedPhrase(true);
      setError(t.restore.needWords);
      return;
    }
    const id = item.kind === "network" ? item.meta.txId : item.entry.id;
    setOpeningId(id);
    setError(null);
    try {
      const keys = deriveKeysFromMnemonic(raw);
      if (keys.vaultId !== session.vaultId) {
        throw new Error(t.versions.wrongVault);
      }
      let vault: VaultV1 | null = null;
      if (item.kind === "network") {
        const remote = await fetchVaultEnvelope(session.vaultId, id);
        if (remote) vault = await openEnvelope(keys, remote.envelope);
      }
      if (!vault) {
        const archived =
          item.kind === "archive"
            ? item.entry
            : getLocalVaultVersion(session.vaultId, id);
        if (!archived) throw new Error(t.restore.decryptFail);
        vault = await openEnvelope(keys, archived.envelope);
      }
      setVaultSession({ vaultId: keys.vaultId, headTxId: id, source: "network" }, raw);
      onOpenVersion(vault);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /mismatch|decrypt|JSON/i.test(msg)
          ? t.versions.decryptFail
          : msg
      );
    } finally {
      setOpeningId(null);
    }
  }

  async function openLocal() {
    const raw = normalizeMnemonic(phrase);
    if (!isValidMnemonic(raw)) {
      setNeedPhrase(true);
      setError(t.versions.needWords);
      return;
    }
    setOpeningId("local");
    setError(null);
    try {
      const keys = deriveKeysFromMnemonic(raw);
      const vault = await openLocalVault(keys);
      if (!vault) throw new Error(t.versions.noLocal);
      setVaultSession(
        { vaultId: keys.vaultId, headTxId: session?.headTxId ?? null, source: "local" },
        raw
      );
      onOpenVersion(vault);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal panel">
        <h2>{t.versions.title}</h2>
        <p className="sub">{t.versions.hint}</p>
        {session?.vaultId && (
          <p className="sub mono publish-meta">
            {t.versions.vault(fingerprintVaultId(session.vaultId))}
            {session.headTxId ? t.versions.opened(session.headTxId.slice(0, 8)) : ""}
          </p>
        )}

        {(needPhrase || !getSessionMnemonic()) && (
          <label className="full">
            {t.versions.words}
            <textarea
              rows={2}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="word1 word2 … word12"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
        )}

        {busy && <p className="sub">{status || t.versions.searching}</p>}

        {!busy && versions.length > 0 && (
          <ul className="vault-version-list">
            {versions.map((item, i) => {
              const id = item.kind === "network" ? item.meta.txId : item.entry.id;
              const isHead = session?.headTxId === id || (i === 0 && !session?.headTxId);
              const when =
                item.kind === "network"
                  ? formatVersionWhen(item.meta)
                  : formatUiDateTime(item.entry.savedAt, locale, t.restore.unknownTime);
              const where =
                item.kind === "network"
                  ? t.versions.whereArweave
                  : item.entry.source === "demo"
                    ? t.versions.whereDemo
                    : item.entry.source === "sponsor"
                      ? t.versions.whereSponsor
                      : t.versions.whereBrowser;
              return (
                <li key={`${item.kind}-${id}`}>
                  <button
                    type="button"
                    className="vault-version-item"
                    disabled={openingId !== null}
                    onClick={() => void openListed(item)}
                  >
                    <span className="vault-version-title">
                      {i === 0 ? t.versions.latest : t.versions.versionN(versions.length - i)}
                      {isHead ? t.versions.now : ""}
                      {openingId === id ? "…" : ""}
                    </span>
                    <span className="vault-version-meta">
                      {when} · {where} · {id.slice(0, 10)}…
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!busy && (
          <div className="actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <button
              type="button"
              className="btn ghost"
              disabled={openingId !== null}
              onClick={() => void openLocal()}
            >
              {t.versions.localCopy}
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>
              {t.close}
            </button>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}
      </div>
    </div>
  );
}

/** Count people for display after decrypt — used by RestoreSeed picker. */
export function vaultPersonCount(vault: VaultV1): number {
  const treeId = vault.active_tree_id;
  const store = treeId ? vault.trees[treeId] : Object.values(vault.trees)[0];
  if (!store) return 0;
  return activePersons(store.draft).length;
}
