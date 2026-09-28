import { useEffect, useRef, type KeyboardEvent } from "react";
import { UI_LOCALES, type UiLocale } from "../lib/i18n/locale";
import { useI18n } from "../lib/i18n/I18nProvider";

type Props = {
  /** Quiet dock under the wordmark, or compact chrome in the top bar. */
  placement?: "welcome" | "chrome";
};

export function LanguageSwitch({ placement = "welcome" }: Props) {
  const { locale, setLocale, t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !root.contains(document.activeElement)) return;
    root.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [locale]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = UI_LOCALES.indexOf(locale);
    if (i < 0) return;
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (i + 1) % UI_LOCALES.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (i - 1 + UI_LOCALES.length) % UI_LOCALES.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = UI_LOCALES.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    setLocale(UI_LOCALES[next]);
  }

  return (
    <div
      ref={rootRef}
      className={`lang-switch lang-switch-${placement}`}
      role="radiogroup"
      aria-label={t.language}
      onKeyDown={onKeyDown}
    >
      {UI_LOCALES.map((id: UiLocale) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={locale === id}
          tabIndex={locale === id ? 0 : -1}
          className={locale === id ? "is-active" : undefined}
          title={t.localeName[id]}
          onClick={() => setLocale(id)}
        >
          {t.localeShort[id]}
        </button>
      ))}
    </div>
  );
}
