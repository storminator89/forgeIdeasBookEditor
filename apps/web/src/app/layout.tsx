import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import WorkspaceShell from "@/components/workspace-shell";
import Providers from "@/components/providers";
import { getRequestLocale } from "@/lib/locale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { Crimson_Pro } from "next/font/google";

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Forge Studio · Dein Schreibstudio",
    template: "%s · Forge Studio",
  },
  description:
    "Von der ersten Idee zum fertigen Manuskript. Dein kreatives Schreibstudio für Bücher, Charaktere und Welten – mit KI an deiner Seite.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${crimsonPro.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers initialLocale={locale}>
          <div className="studio-app">
            <Header />
            <WorkspaceShell>{children}</WorkspaceShell>
          </div>
        </Providers>
      </body>
    </html>
  );
}
