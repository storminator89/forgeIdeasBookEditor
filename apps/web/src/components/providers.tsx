"use client";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import LocaleProvider from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n";

type ProvidersProps = {
  children: React.ReactNode;
  initialLocale: Locale;
};

export default function Providers({ children, initialLocale }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LocaleProvider initialLocale={initialLocale}>
        {children}
        <Toaster richColors />
      </LocaleProvider>
    </ThemeProvider>
  );
}
