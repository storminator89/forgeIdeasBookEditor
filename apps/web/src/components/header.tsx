"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./mode-toggle";
import { Home, Settings, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();

  const links = [
    { to: "/books", label: "Meine Bücher", icon: BookOpen },
    { to: "/settings", label: "Einstellungen", icon: Settings },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="absolute inset-0 bg-white/70 dark:bg-black/60 backdrop-blur-xl border-b border-black/5 dark:border-white/5 shadow-sm" />

      <div className="container relative mx-auto h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <span className="font-serif text-xl font-bold text-primary">B</span>
          </div>
          <span className="font-serif text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-stone-800 to-stone-600 dark:from-stone-100 dark:to-stone-400">
            Bucherstellung
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to || pathname?.startsWith(to + "/");

            return (
              <Link key={to} href={to} className="relative">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative z-10",
                    isActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{label}</span>
                </div>

                {/* Active State Background */}
                {
                  isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 rounded-md bg-primary/10 dark:bg-primary/20"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )
                }
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 pl-4 border-l border-zinc-200 dark:border-zinc-800">
          <ModeToggle />
        </div>
      </div>
    </header >
  );
}
