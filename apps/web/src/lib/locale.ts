import { cookies, headers } from "next/headers";

import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";

function matchAcceptLanguage(header: string | null) {
  if (!header) {
    return null;
  }

  const parts = header.split(",").map((entry) => entry.trim().toLowerCase());

  for (const part of parts) {
    const language = part.split(";")[0]?.split("-")[0];
    if (language && isLocale(language)) {
      return language;
    }
  }

  return null;
}

export async function getRequestLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get("locale")?.value;

  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const headerLocale = matchAcceptLanguage((await headers()).get("accept-language"));

  return headerLocale ?? defaultLocale;
}
