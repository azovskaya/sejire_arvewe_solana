import { useState } from "react";
import type { FormEvent } from "react";
import type { Person } from "../lib/types";
import { useI18n } from "../lib/i18n/I18nProvider";

export type AddPersonPayload = {
  name: string;
  sex: Person["sex"];
  maidenName: string;
  born: string;
  died: string;
  birthPlace: string;
  deathPlace: string;
  burialDate: string;
  burialPlace: string;
  occupation: string;
  notes: string;
};

type Props = {
  title: string;
  defaultSex?: Person["sex"];
  /** When true, ask for sex (e.g. adding yourself). Parents get sex from the role. */
  askSex?: boolean;
  onCancel: () => void;
  onSave: (data: AddPersonPayload) => void;
};

function emptyPayload(sex: Person["sex"]): AddPersonPayload {
  return {
    name: "",
    sex,
    maidenName: "",
    born: "",
    died: "",
    birthPlace: "",
    deathPlace: "",
    burialDate: "",
    burialPlace: "",
    occupation: "",
    notes: "",
  };
}

export function AddPersonModal({
  title,
  defaultSex = "U",
  askSex = false,
  onCancel,
  onSave,
}: Props) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [sex, setSex] = useState<Person["sex"]>(defaultSex);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      ...emptyPayload(askSex ? sex : defaultSex),
      name: trimmed,
      sex: askSex ? sex : defaultSex,
    });
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <form className="modal add-modal add-modal-simple" onSubmit={submit}>
        <h2>{title}</h2>
        <p className="sub">{t.addModal.hint}</p>

        <label>
          {t.addModal.name}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches}
            required
            placeholder={t.addModal.namePh}
          />
        </label>

        {askSex ? (
          <label>
            {t.addModal.sex}
            <select value={sex} onChange={(e) => setSex(e.target.value as Person["sex"])}>
              <option value="U">{t.person.sexUnknown}</option>
              <option value="F">{t.person.sexF}</option>
              <option value="M">{t.person.sexM}</option>
            </select>
          </label>
        ) : null}

        <div className="actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="submit" className="btn">
            {t.add}
          </button>
        </div>
      </form>
    </div>
  );
}
