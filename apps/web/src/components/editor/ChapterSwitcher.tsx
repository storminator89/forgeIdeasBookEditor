"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ChapterSwitcher({
  chapters,
  currentId,
  onSelect,
  onClose,
}: {
  chapters: { id: string; title: string; orderIndex: number }[];
  currentId: string;
  onSelect: (id: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const filtered = chapters.filter((chapter) =>
    `${chapter.orderIndex + 1} ${chapter.title}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t({ de: "Kapitel wechseln", en: "Switch chapter" })}
          </DialogTitle>
          <DialogDescription>
            {t({
              de: "Änderungen werden vor dem Wechsel gespeichert.",
              en: "Changes are saved before switching.",
            })}
          </DialogDescription>
        </DialogHeader>
        <Input
          aria-label={t({ de: "Kapitel suchen", en: "Search chapters" })}
          placeholder={t({
            de: "Titel oder Kapitelnummer",
            en: "Title or chapter number",
          })}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="max-h-80 overflow-y-auto space-y-1">
          {filtered.map((chapter) => (
            <button
              key={chapter.id}
              disabled={!!pending}
              aria-current={chapter.id === currentId ? "page" : undefined}
              className="w-full text-left rounded-xl p-3 flex items-center gap-3 hover:bg-muted aria-current:bg-muted disabled:opacity-60"
              onClick={async () => {
                if (chapter.id === currentId) {
                  onClose();
                  return;
                }
                setPending(chapter.id);
                if (await onSelect(chapter.id)) onClose();
                setPending(null);
              }}
            >
              <span className="text-xs text-muted-foreground tabular-nums">
                {chapter.orderIndex + 1}
              </span>
              <span className="flex-1 text-sm break-words min-w-0">
                {chapter.title}
              </span>
              {pending === chapter.id ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : chapter.id === currentId ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : null}
            </button>
          ))}
          {!filtered.length && (
            <p className="text-sm text-muted-foreground py-4">
              {t({ de: "Kein passendes Kapitel.", en: "No matching chapter." })}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
