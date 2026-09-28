import { useState } from "react";
import { loadDraftTree } from "../lib/draftStorage";
import { useI18n } from "../lib/i18n/I18nProvider";
import { LanguageSwitch } from "./LanguageSwitch";

type Props = {
  onStartNew: (title: string) => void;
  onContinueDraft: () => void;
  onRestoreSeed: () => void;
  onCashier: () => void;
};

type Step = "brand" | "menu";

/**
 * Step 1: only SEJIRE.
 * Step 2: start choices — same mental model on phone and desktop.
 */
export function Welcome({ onStartNew, onContinueDraft, onRestoreSeed, onCashier }: Props) {
  const [step, setStep] = useState<Step>("brand");
  const hasDraft = Boolean(loadDraftTree());
  const { t } = useI18n();

  function startFresh() {
    if (hasDraft) {
      const ok = window.confirm(t.welcome.replaceDraftConfirm);
      if (!ok) return;
    }
    onStartNew(t.defaultTreeTitle);
  }

  if (step === "brand") {
    return (
      <div className="welcome-screen is-brand">
        <button
          type="button"
          className="welcome-brand"
          onClick={() => setStep("menu")}
          aria-label={t.welcome.openMenu}
        >
          SEJIRE
        </button>
        <LanguageSwitch placement="welcome" />
      </div>
    );
  }

  return (
    <div className="welcome-screen is-menu">
      <div className="welcome-menu">
        <button type="button" className="welcome-menu-brand" onClick={() => setStep("brand")}>
          SEJIRE
        </button>

        <div className="welcome-menu-actions">
          {hasDraft ? (
            <>
              <button type="button" className="btn welcome-menu-btn" onClick={onContinueDraft}>
                {t.welcome.continueDraft}
              </button>
              <button type="button" className="btn ghost welcome-menu-btn" onClick={onRestoreSeed}>
                {t.welcome.restoreSeed}
              </button>
              <button type="button" className="welcome-link-quiet" onClick={startFresh}>
                {t.welcome.newTree}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn welcome-menu-btn" onClick={startFresh}>
                {t.welcome.start}
              </button>
              <button type="button" className="btn ghost welcome-menu-btn" onClick={onRestoreSeed}>
                {t.welcome.restoreSeed}
              </button>
            </>
          )}
        </div>
        <button type="button" className="welcome-link-quiet" onClick={onCashier}>
          {t.welcome.cashier}
        </button>
        <LanguageSwitch placement="welcome" />
      </div>
    </div>
  );
}
