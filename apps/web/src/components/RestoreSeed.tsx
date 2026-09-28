import { useState } from "react";
import type { FormEvent } from "react";
import { isValidMnemonic, normalizeMnemonic } from "../lib/crypto/bip39";
import { deriveKeysFromMnemonic, fingerprintVaultId } from "../lib/crypto/keys";
import type { EnvelopeV1 } from "../lib/crypto/encrypt";
import { parseSeedBackup } from "../lib/crypto/seedBackup";
import { openEnvelope, openLocalVault, type VaultV1 } from "../lib/crypto/vault";
import {
  fetchVaultEnvelope,
  formatVersionWhen,
  isGatewayUnavailable,
  listVaultVersions,
  type VaultVersionMeta,
} from "../lib/arweave/fetch";
import { saveDraftTree, loadDraftTree } from "../lib/draftStorage";
import { coerceTreeStore } from "../lib/treeJson";
import type { TreeStore } from "../lib/types";
import { defaultGuide, saveGuide } from "../lib/guide";
import { pickHomeFocus } from "../lib/pedigree";
import { activePersons } from "../lib/treeEngine";
import { setVaultSession } from "../lib/vaultSession/session";
import {
  getLocalVaultVersion,
  listLocalVaultVersions,
  type LocalVaultVersion,
} from "../lib/vaultSession/localArchive";

import { useI18n } from "../lib/i18n/I18nProvider";
import { formatUiDateTime } from "../lib/i18n/messages";

type Props = {
  onRestored: (store?: TreeStore) => void;
  onBack: () => void;
};

type PickerItem =
  | { kind: "network"; meta: VaultVersionMeta; index: number }
  | { kind: "archive"; entry: LocalVaultVersion }
  | { kind: "local" };

export function RestoreSeed({ onRestored, onBack }: Props) {
  const { locale, t } = useI18n();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [showFile, setShowFile] = useState(false);
  const [phrase, setPhrase] = useState<string | null>(null);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerItem[] | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function finishWithVault(
    vault: VaultV1,
    opts: { vaultId: string; headTxId: string | null; mnemonic: string; source: "network" | "local" | "file" }
  ) {
    const treeId = vault.active_tree_id;
    const store = coerceTreeStore(treeId ? vault.trees[treeId] : Object.values(vault.trees)[0]);
    if (!store) throw new Error(t.restore.noTrees);
    const existing = loadDraftTree();
    if (existing && activePersons(existing.draft).length > 0) {
      const ok = window.confirm(t.restore.replaceDraft);
      if (!ok) return;
    }
    const selfId = pickHomeFocus(store.draft, null);
    saveDraftTree(store);
    saveGuide({ ...defaultGuide(), step: "done", selfId });
    setVaultSession(
      { vaultId: opts.vaultId, headTxId: opts.headTxId, source: opts.source },
      opts.mnemonic
    );
    onRestored(store);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeMnemonic(input);
    if (!isValidMnemonic(normalized)) {
      setError(t.restore.needWords);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const keys = deriveKeysFromMnemonic(normalized);
      setPhrase(normalized);
      setVaultId(keys.vaultId);
      setStatus(t.restore.looking(fingerprintVaultId(keys.vaultId)));

      let versions: VaultVersionMeta[] = [];
      let networkError: string | null = null;
      try {
        versions = await listVaultVersions(keys.vaultId);
      } catch (e) {
        networkError = isGatewayUnavailable(e)
          ? e instanceof Error
            ? e.message
            : t.restore.arweaveDown
          : t.restore.arweaveFail;
      }
      const archive = listLocalVaultVersions(keys.vaultId);
      const networkIds = new Set(versions.map((v) => v.txId));
      const archiveOnly = archive.filter((a) => !networkIds.has(a.id));
      const local = await openLocalVault(keys);
      const items: PickerItem[] = [
        ...versions.map((meta, index) => ({ kind: "network" as const, meta, index })),
        ...archiveOnly.map((entry) => ({ kind: "archive" as const, entry })),
        ...(local ? [{ kind: "local" as const }] : []),
      ];

      if (items.length === 0) {
        throw new Error(
          networkError
            ? `${networkError} ${t.restore.noneLocal}`
            : t.restore.noneAnywhere
        );
      }

      if (networkError) {
        setError(`${networkError} ${t.restore.shownLocal}`);
      }

      if (items.length === 1 && !networkError) {
        await openPickerItem(items[0], normalized, keys.vaultId);
        return;
      }

      setPicker(items);
      setStatus("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        /mismatch|decrypt|JSON/i.test(msg)
          ? t.restore.decryptFail
          : msg
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function openPickerItem(
    item: PickerItem,
    phraseOverride?: string,
    vaultOverride?: string
  ) {
    const usePhrase = phraseOverride ?? phrase;
    const useVaultId = vaultOverride ?? vaultId;
    if (!usePhrase || !useVaultId) return;
    const id =
      item.kind === "local" ? "local" : item.kind === "network" ? item.meta.txId : item.entry.id;
    setOpeningId(id);
    setError(null);
    try {
      const keys = deriveKeysFromMnemonic(usePhrase);
      if (item.kind === "local") {
        const local = await openLocalVault(keys);
        if (!local) throw new Error(t.restore.noLocal);
        await finishWithVault(local, {
          vaultId: useVaultId,
          headTxId: null,
          mnemonic: usePhrase,
          source: "local",
        });
        return;
      }
      if (item.kind === "archive") {
        const vault = await openEnvelope(keys, item.entry.envelope);
        await finishWithVault(vault, {
          vaultId: useVaultId,
          headTxId: item.entry.id,
          mnemonic: usePhrase,
          source: "local",
        });
        return;
      }
      let vault: VaultV1 | null = null;
      const remote = await fetchVaultEnvelope(useVaultId, item.meta.txId);
      if (remote) vault = await openEnvelope(keys, remote.envelope);
      if (!vault) {
        const archived = getLocalVaultVersion(useVaultId, item.meta.txId);
        if (!archived) throw new Error(t.restore.decryptFail);
        vault = await openEnvelope(keys, archived.envelope);
      }
      await finishWithVault(vault, {
        vaultId: useVaultId,
        headTxId: item.meta.txId,
        mnemonic: usePhrase,
        source: "network",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        /mismatch|decrypt|JSON/i.test(msg)
          ? t.restore.decryptFail
          : msg
      );
    } finally {
      setOpeningId(null);
    }
  }

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const raw = JSON.parse(await file.text()) as Record<string, unknown>;
      const fromSeed = parseSeedBackup(raw);
      if (fromSeed) {
        setInput(fromSeed);
        setStatus(t.restore.fileReady);
        return;
      }
      if (raw.schema !== "sejire/envelope/v1") {
        setError(t.restore.badFile);
        return;
      }
      const normalized = normalizeMnemonic(input);
      if (!isValidMnemonic(normalized)) {
        setError(t.restore.needWords);
        return;
      }
      const keys = deriveKeysFromMnemonic(normalized);
      const vault = await openEnvelope(keys, raw as EnvelopeV1);
      await finishWithVault(vault, {
        vaultId: keys.vaultId,
        headTxId: null,
        mnemonic: normalized,
        source: "file",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        /mismatch|decrypt|JSON/i.test(msg)
          ? t.restore.decryptFail
          : msg
      );
    } finally {
      setBusy(false);
    }
  }

  if (picker && phrase && vaultId) {
    const networkCount = picker.filter((p) => p.kind === "network").length;
    return (
      <section className="hero-create" style={{ maxWidth: 480, margin: "0 auto" }}>
        <button type="button" className="welcome-menu-brand" onClick={onBack}>
          SEJIRE
        </button>
        <div className="panel" style={{ textAlign: "left", width: "100%" }}>
          <h2>{t.restore.pickTitle}</h2>
          <p className="sub">{t.restore.pickHint(fingerprintVaultId(vaultId))}</p>
          <ul className="vault-version-list">
            {picker.map((item) => {
              if (item.kind === "local") {
                return (
                  <li key="local">
                    <button
                      type="button"
                      className="vault-version-item"
                      disabled={openingId !== null}
                      onClick={() => void openPickerItem(item)}
                    >
                      <span className="vault-version-title">
                        {t.restore.localCopy}
                        {openingId === "local" ? "…" : ""}
                      </span>
                      <span className="vault-version-meta">{t.restore.inBrowser}</span>
                    </button>
                  </li>
                );
              }
              if (item.kind === "archive") {
                return (
                  <li key={item.entry.id}>
                    <button
                      type="button"
                      className="vault-version-item"
                      disabled={openingId !== null}
                      onClick={() => void openPickerItem(item)}
                    >
                      <span className="vault-version-title">
                        {item.entry.source === "demo" ? t.restore.demoVersion : t.restore.browserVersion}
                        {openingId === item.entry.id ? "…" : ""}
                      </span>
                      <span className="vault-version-meta">
                        {formatUiDateTime(item.entry.savedAt, locale, t.restore.unknownTime)} ·{" "}
                        {item.entry.id.slice(0, 10)}…
                      </span>
                    </button>
                  </li>
                );
              }
              const n = networkCount - item.index;
              return (
                <li key={item.meta.txId}>
                  <button
                    type="button"
                    className="vault-version-item"
                    disabled={openingId !== null}
                    onClick={() => void openPickerItem(item)}
                  >
                    <span className="vault-version-title">
                      {item.index === 0 ? t.restore.latestNetwork : t.restore.networkVersion(n)}
                      {openingId === item.meta.txId ? "…" : ""}
                    </span>
                    <span className="vault-version-meta">
                      {formatVersionWhen(item.meta)} · {item.meta.txId.slice(0, 10)}…
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setPicker(null);
                setPhrase(null);
                setVaultId(null);
              }}
            >
              {t.back}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="hero-create" style={{ maxWidth: 480, margin: "0 auto" }}>
      <button type="button" className="welcome-menu-brand" onClick={onBack}>
        SEJIRE
      </button>
      <form className="panel" style={{ textAlign: "left", width: "100%" }} onSubmit={(e) => void onSubmit(e)}>
        <h2>{t.restore.title}</h2>
        <p className="sub">{t.restore.hint}</p>
        <textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="word1 word2 … word12"
          required
        />
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onBack}>
            {t.back}
          </button>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? status || t.restore.searching : t.restore.open}
          </button>
        </div>
        <button
          type="button"
          className="welcome-link-quiet"
          style={{ marginTop: "0.85rem" }}
          onClick={() => setShowFile((v) => !v)}
        >
          {showFile ? t.restore.hideFile : t.restore.openFile}
        </button>
        {showFile ? (
          <label className="full" style={{ marginTop: "0.55rem" }}>
            {t.restore.fileLabel}
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </label>
        ) : null}
        {status && !busy && <p className="sub">{status}</p>}
        {error && <p className="form-error">{error}</p>}
      </form>
    </section>
  );
}
