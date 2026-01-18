export const supportedLocales = ["de", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "de";

export const localeLabels: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
};

export const intlLocales: Record<Locale, string> = {
  de: "de-DE",
  en: "en-US",
};

export type TranslatedText = {
  de: string;
  en: string;
};

export function isLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function translate(locale: Locale, text: TranslatedText, vars?: Record<string, string | number>) {
  const template = text[locale] ?? text[defaultLocale] ?? "";

  if (!vars) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}
