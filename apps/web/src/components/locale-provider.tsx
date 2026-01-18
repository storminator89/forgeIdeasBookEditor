"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { defaultLocale, intlLocales, isLocale, translate, type Locale, type TranslatedText } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (text: TranslatedText, vars?: Record<string, string | number>) => string;
  intlLocale: string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const LOCALE_COOKIE = "locale";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type LocaleProviderProps = {
  initialLocale?: Locale;
  children: React.ReactNode;
};

function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

export default function LocaleProvider({ initialLocale = defaultLocale, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    if (!isLocale(nextLocale)) {
      return;
    }

    setLocaleState(nextLocale);
    setLocaleCookie(nextLocale);
  }, []);

  const t = useCallback(
    (text: TranslatedText, vars?: Record<string, string | number>) => translate(locale, text, vars),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      intlLocale: intlLocales[locale],
    }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return context;
}
