"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Settings } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { useI18n } from "@/components/locale-provider";
import LanguageToggle from "@/components/language-toggle";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const pathname = usePathname();
  const { t } = useI18n();

  const links = [
    { to: "/books", label: t({ de: "Meine Bücher", en: "My books" }), icon: BookOpen },
    { to: "/settings", label: t({ de: "Einstellungen", en: "Settings" }), icon: Settings },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 pt-3 pb-1">
      <div className="max-w-6xl mx-auto rounded-2xl border border-border/40 bg-card/75 dark:bg-card/45 backdrop-blur-xl shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/25">
        
        {/* Soft background decor spots for wow effect */}
        <div className="absolute -left-10 -top-10 w-24 h-24 bg-primary/5 dark:bg-primary/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-chart-1/5 dark:bg-chart-1/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative mx-auto h-16 flex items-center justify-between px-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
          >
            <div className="relative flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 group-hover:border-primary/25 transition-all duration-300">
              <span className="font-serif text-xl font-bold text-primary group-hover:scale-105 transition-transform">B</span>
              {/* Inner glowing dot */}
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-chart-1 animate-pulse" />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-stone-800 via-stone-700 to-stone-500 dark:from-stone-100 dark:via-stone-300 dark:to-stone-400">
              Bucherstellung
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 sm:gap-1.5">
            {links.map(({ to, label, icon: Icon }) => {
              const isActive = pathname === to || pathname?.startsWith(to + "/");

              return (
                <Link key={to} href={to} className="relative">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative z-10",
                      isActive
                        ? "text-primary font-bold dark:text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      isActive ? "scale-105" : "group-hover:scale-105"
                    )} />
                    <span className="hidden sm:inline-block">{label}</span>
                  </div>

                  {/* Active State Background with premium spring dynamics */}
                  {
                    isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute inset-0 rounded-xl bg-accent/60 dark:bg-primary border border-primary/5 dark:border-none shadow-sm shadow-primary/5"
                        transition={{ type: "spring", bounce: 0.18, duration: 0.55 }}
                      />
                    )
                  }
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 pl-4 border-l border-border/40">
            <LanguageToggle />
            <div className="h-4 w-px bg-border/40" />
            <ModeToggle />
          </div>
        </div>
      </div>
    </header >
  );
}
