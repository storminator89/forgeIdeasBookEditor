"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Feather,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const isEditor = /^\/books\/(?!new(?:\/|$))[^/]+/.test(pathname);
  return (
    <div
      className={cn("workspace-frame", isEditor && "workspace-frame-editor")}
    >
      {!isEditor && (
        <aside
          className="studio-sidebar"
          aria-label={t({ de: "Arbeitsbereich", en: "Workspace" })}
        >
          <div className="sidebar-workspace">
            <span className="workspace-avatar">
              <Feather size={18} />
            </span>
            <div>
              <strong>
                {t({ de: "Mein Schreibstudio", en: "My writing studio" })}
              </strong>
              <span>
                {t({ de: "Platz für große Ideen", en: "Room for big ideas" })}
              </span>
            </div>
          </div>
          <span className="sidebar-eyebrow">WORKSPACE</span>
          <nav className="sidebar-nav">
            <Link
              href="/books"
              aria-current={pathname === "/books" ? "page" : undefined}
              className={cn("sidebar-link", pathname === "/books" && "active")}
            >
              <BookOpen size={18} />
              {t({ de: "Bibliothek", en: "Library" })}
            </Link>
            <Link
              href="/books/new"
              aria-current={pathname === "/books/new" ? "page" : undefined}
              className={cn(
                "sidebar-link",
                pathname === "/books/new" && "active",
              )}
            >
              <Plus size={18} />
              {t({ de: "Neues Projekt", en: "New project" })}
            </Link>
            <Link
              href="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={cn(
                "sidebar-link",
                pathname === "/settings" && "active",
              )}
            >
              <Settings size={18} />
              {t({ de: "Einstellungen", en: "Settings" })}
            </Link>
          </nav>
          <div className="sidebar-note">
            <Sparkles size={22} />
            <h3>
              {t({
                de: "Deine Idee. Dein nächstes Buch.",
                en: "Your idea. Your next book.",
              })}
            </h3>
            <p>
              {t({
                de: "Entwickle Figuren, erschaffe Welten und finde deinen Schreibflow.",
                en: "Develop characters, build worlds and find your writing flow.",
              })}
            </p>
            <Link href="/books/new">
              {t({
                de: "Idee zum Leben erwecken",
                en: "Bring an idea to life",
              })}
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="sidebar-footer">
            <span className="status-dot" />
            {t({ de: "Dein kreativer Freiraum", en: "Your creative space" })}
            <span>FORGE / 01</span>
          </div>
        </aside>
      )}
      <div id="main-content" className="workspace-content" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
