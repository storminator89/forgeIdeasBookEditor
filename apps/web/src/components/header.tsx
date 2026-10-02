"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Feather, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/locale-provider";
import LanguageToggle from "@/components/language-toggle";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <>
      <a href="#main-content" className="skip-link">
        {t({ de: "Zum Inhalt", en: "Skip to content" })}
      </a>
      <header className="studio-header">
        <Link href="/books" className="studio-brand" aria-label="Forge Studio">
          <span className="brand-mark">
            <Feather size={21} />
          </span>
          <span>
            forge<span className="brand-studio">studio</span>
            <span className="brand-beta">BETA</span>
          </span>
        </Link>
        <div className="header-context">
          <span className="status-dot" />
          {t({
            de: "Ein guter Tag für eine neue Geschichte.",
            en: "A good day for a new story.",
          })}
        </div>
        <nav
          className="header-mobile-nav"
          aria-label={t({ de: "Hauptnavigation", en: "Main navigation" })}
        >
          <Link
            href="/books"
            aria-label={t({ de: "Bibliothek", en: "Library" })}
            aria-current={pathname === "/books" ? "page" : undefined}
            className={cn(pathname === "/books" && "active")}
          >
            <BookOpen size={19} />
          </Link>
          <Link
            href="/books/new"
            aria-label={t({ de: "Neues Projekt", en: "New project" })}
            aria-current={pathname === "/books/new" ? "page" : undefined}
          >
            <Plus size={19} />
          </Link>
          <Link
            href="/settings"
            aria-label={t({ de: "Einstellungen", en: "Settings" })}
            aria-current={pathname === "/settings" ? "page" : undefined}
            className={cn(pathname === "/settings" && "active")}
          >
            <Settings size={19} />
          </Link>
        </nav>
        <div className="header-actions">
          <LanguageToggle />
          <ModeToggle />
        </div>
      </header>
    </>
  );
}
