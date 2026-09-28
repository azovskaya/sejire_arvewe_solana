import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyDocumentLocale,
  resolveUiLocale,
  writeStoredLocale,
  type UiLocale,
} from "./locale";
import { uiT, type UiMessages } from "./messages";

type I18nValue = {
  locale: UiLocale;
  setLocale: (next: UiLocale) => void;
  t: UiMessages;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>(() => resolveUiLocale());
  const t = useMemo(() => uiT(locale), [locale]);

  useEffect(() => {
    applyDocumentLocale(locale, { title: t.docTitle, description: t.docDescription });
  }, [locale, t.docTitle, t.docDescription]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale: (next) => {
        setLocaleState(next);
        writeStoredLocale(next);
      },
      t,
    }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
