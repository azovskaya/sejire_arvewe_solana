import { SHEZHIRE_TEMPLATES, type ShezhireTemplateId } from "../lib/pdf/shezhireTemplates";
import { useI18n } from "../lib/i18n/I18nProvider";

type Props = {
  onPick: (template: ShezhireTemplateId) => void;
  onClose: () => void;
};

export function ShezhireTemplateModal({ onPick, onClose }: Props) {
  const { t } = useI18n();
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="modal panel shezhire-template-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{t.shezhirePick.title}</h2>
        <p className="sub">{t.shezhirePick.hint}</p>
        <div className="shezhire-template-list">
          {SHEZHIRE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="shezhire-template-option"
              onClick={() => onPick(tpl.id)}
            >
              <span className="shezhire-template-head">
                <strong>{tpl.title}</strong>
                <em>
                  {tpl.id === "cascade" ? t.shezhirePick.formatA4l : t.shezhirePick.formatA4p}
                </em>
              </span>
              <span>{t.shezhirePick.blurb[tpl.id]}</span>
            </button>
          ))}
        </div>
        <button className="btn ghost" type="button" onClick={onClose} style={{ width: "100%" }}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
