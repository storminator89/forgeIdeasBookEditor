"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  checkpointChapter,
  readChapterHistory,
  type ChapterDraft,
  type ChapterRevision,
} from "@/lib/chapter-history";
import { getTextStatistics, manuscriptText } from "@/lib/text-statistics";

export default function ChapterHistoryDialog({
  bookId,
  chapterId,
  payload,
  disabled,
  onRestore,
  onClose,
}: {
  bookId: string;
  chapterId: string;
  payload: ChapterDraft;
  disabled: boolean;
  onRestore: (payload: ChapterDraft) => void;
  onClose: () => void;
}) {
  const { t, intlLocale } = useI18n();
  const [revisions, setRevisions] = useState<ChapterRevision[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const selected = revisions.find((revision) => revision.id === selectedId);
  const refresh = () => {
    try {
      setRevisions(readChapterHistory(bookId, chapterId));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };
  useEffect(() => {
    try {
      setRevisions(readChapterHistory(bookId, chapterId));
    } catch {
      setStorageError(true);
    }
  }, [bookId, chapterId]);
  const checkpoint = () => {
    if (!checkpointChapter(bookId, chapterId, payload)) {
      setStorageError(true);
      return;
    }
    refresh();
    toast.success(
      t({ de: "Textstand lokal gesichert.", en: "Snapshot saved locally." }),
    );
  };
  const restore = () => {
    if (!selected || disabled) return;
    // Preserve the current draft before replacing it, including unsaved edits.
    if (!checkpointChapter(bookId, chapterId, payload)) {
      setStorageError(true);
      return;
    }
    onRestore(selected.payload);
    onClose();
    toast.success(
      t({
        de: "Textstand eingesetzt. Wird im Manuskript gespeichert.",
        en: "Snapshot restored. Saving to the manuscript.",
      }),
    );
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t({ de: "Textstände", en: "Snapshots" })}</DialogTitle>
          <DialogDescription>
            {t({
              de: "Bis zu 10 Stände auf diesem Gerät. Automatisch höchstens alle 5 Minuten, oder bewusst per Klick.",
              en: "Up to 10 snapshots on this device. Automatically at most every 5 minutes, or manually.",
            })}
          </DialogDescription>
        </DialogHeader>
        {storageError && (
          <p role="alert" className="text-destructive text-sm">
            {t({
              de: "Lokaler Speicher ist nicht verfügbar oder voll. Der aktuelle Text wurde nicht ersetzt.",
              en: "Local storage is unavailable or full. The current text was not replaced.",
            })}
          </p>
        )}
        <Button variant="outline" onClick={checkpoint} disabled={disabled}>
          {t({ de: "Aktuellen Stand sichern", en: "Save current snapshot" })}
        </Button>
        {!revisions.length && (
          <p className="text-muted-foreground text-sm">
            {t({
              de: "Noch keine Textstände. Beim nächsten Speichern wird der vorherige Text gesichert.",
              en: "No snapshots yet. The previous text will be kept on your next save.",
            })}
          </p>
        )}
        {!!revisions.length && (
          <div className="grid gap-4 sm:grid-cols-[190px_1fr] min-w-0">
            <div
              className="space-y-1 max-h-64 overflow-y-auto"
              role="group"
              aria-label={t({
                de: "Gesicherte Textstände",
                en: "Saved snapshots",
              })}
            >
              {revisions.map((revision) => (
                <button
                  key={revision.id}
                  aria-pressed={selectedId === revision.id}
                  onClick={() => setSelectedId(revision.id)}
                  className="w-full text-left p-3 rounded-xl border border-transparent hover:bg-muted aria-pressed:bg-muted aria-pressed:border-border"
                >
                  <span className="block text-sm font-medium">
                    {new Date(revision.savedAt).toLocaleString(intlLocale, {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {revision.kind === "manual"
                      ? t({ de: "Manuell", en: "Manual" })
                      : t({ de: "Automatisch", en: "Automatic" })}{" "}
                    ·{" "}
                    {getTextStatistics(
                      revision.payload.content,
                    ).wordCount.toLocaleString(intlLocale)}{" "}
                    {t({ de: "Wörter", en: "words" })}
                  </span>
                </button>
              ))}
            </div>
            <div className="min-w-0 space-y-3">
              {selected ? (
                <>
                  <h3 className="font-medium break-words">
                    {selected.payload.title}
                  </h3>
                  <p className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {manuscriptText(selected.payload.content) ||
                      t({ de: "Leeres Kapitel", en: "Empty chapter" })}
                  </p>
                  <Button onClick={restore} disabled={disabled}>
                    {t({
                      de: "Diesen Stand wiederherstellen",
                      en: "Restore this snapshot",
                    })}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t({
                      de: "Dein aktueller Stand wird vorher gesichert. Auch Titel, Notizen und Zusammenfassung werden wiederhergestellt.",
                      en: "Your current draft is saved first. Title, notes and summary are restored too.",
                    })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t({
                    de: "Wähle einen Stand zur Vorschau.",
                    en: "Choose a snapshot to preview.",
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
