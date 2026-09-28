import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { TreeMeta } from "../lib/types";
import {
  ZHUZ_OPTIONS,
  isZhuzId,
  ruSuggestions,
  type ZhuzId,
} from "../lib/zhuzRu";
import { useI18n } from "../lib/i18n/I18nProvider";

type Props = {
  meta: TreeMeta;
  onSave: (patch: { zhuz: ZhuzId | null; clanName: string | null }) => void;
  onClose: () => void;
};

export function ShezhireMetaModal({ meta, onSave, onClose }: Props) {
  const { t } = useI18n();
  const [zhuz, setZhuz] = useState<ZhuzId | "">(() => meta.zhuz ?? "");
  const [clanName, setClanName] = useState(() => meta.clanName ?? "");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const suggestions = useMemo(
    () => ruSuggestions(zhuz === "" ? null : zhuz),
    [zhuz]
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    const ru = clanName.trim();
    onSave({
      zhuz: zhuz === "" ? null : zhuz,
      clanName: ru || null,
    });
  }

  function clearAll() {
    setZhuz("");
    setClanName("");
    onSave({ zhuz: null, clanName: null });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form
        className="modal panel shezhire-meta-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2>{t.zhuz.title}</h2>
        <p className="sub">{t.zhuz.hint}</p>

        <label>
          {t.zhuz.zhuz}
          <select
            value={zhuz}
            onChange={(e) => {
              const v = e.target.value;
              setZhuz(v === "" || isZhuzId(v) ? v : "");
            }}
          >
            <option value="">{t.zhuz.unspecified}</option>
            {ZHUZ_OPTIONS.map((z) => (
              <option key={z.id} value={z.id}>
                {z.fullLabel}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t.zhuz.ru}
          <input
            list="sejire-ru-suggestions"
            value={clanName}
            onChange={(e) => setClanName(e.target.value)}
            placeholder={t.zhuz.ruPh}
            autoComplete="off"
          />
          <datalist id="sejire-ru-suggestions">
            {suggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>

        <div className="actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <button className="btn" type="submit">
            {t.done}
          </button>
          <button className="btn ghost" type="button" onClick={onClose}>
            {t.cancel}
          </button>
          {(zhuz || clanName.trim()) && (
            <button className="welcome-link-quiet" type="button" onClick={clearAll}>
              {t.zhuz.clear}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
