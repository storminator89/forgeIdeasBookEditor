"use client";

import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localeLabels, supportedLocales } from "@/lib/i18n";
import { useI18n } from "@/components/locale-provider";

export default function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-2 rounded-full px-2">
            <Globe className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">{locale}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-36">
        {supportedLocales.map((option) => (
          <DropdownMenuItem key={option} onClick={() => setLocale(option)}>
            {localeLabels[option]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
