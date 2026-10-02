"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordWritingProgress } from "@/lib/writing-progress";

type ChapterDraft = {
  title: string;
  content: string;
  summary: string;
  notes: string;
  status: string;
};
type RecoveryDraft = { payload: ChapterDraft; savedAt: string };
function isDraft(value: unknown): value is RecoveryDraft {
  if (
    !value ||
    typeof value !== "object" ||
    !("payload" in value) ||
    !("savedAt" in value) ||
    typeof value.savedAt !== "string"
  )
    return false;
  const payload = value.payload;
  return (
    !!payload &&
    typeof payload === "object" &&
    ["title", "content", "summary", "notes", "status"].every(
      (key) =>
        key in payload &&
        typeof (payload as Record<string, unknown>)[key] === "string",
    )
  );
}

export function useChapterAutosave({
  bookId,
  chapterId,
  payload,
  initialPayload,
  initialWordCount,
  onRestore,
}: {
  bookId: string;
  chapterId: string;
  payload: ChapterDraft;
  initialPayload: ChapterDraft;
  initialWordCount: number;
  onRestore: (draft: ChapterDraft) => void;
}) {
  const initialSnapshot = useRef(JSON.stringify(initialPayload));
  const [savedSnapshot, setSavedSnapshot] = useState(initialSnapshot.current);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [recovery, setRecovery] = useState<RecoveryDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [localDraftAvailable, setLocalDraftAvailable] = useState(false);
  const snapshot = JSON.stringify(payload);
  const latestSnapshot = useRef(snapshot);
  latestSnapshot.current = snapshot;
  const inFlight = useRef(false);
  const lastWordCount = useRef(initialWordCount);
  const key = `forge-draft:${bookId}:${chapterId}`;
  const isDirty = snapshot !== savedSnapshot;
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) || "null");
      if (
        isDraft(value) &&
        JSON.stringify(value.payload) !== initialSnapshot.current
      )
        setRecovery(value);
      localStorage.setItem(
        `forge-last-chapter:${bookId}`,
        JSON.stringify({ id: chapterId, openedAt: Date.now() }),
      );
    } catch {
      /* The editor remains usable without browser storage. */
    }
    setReady(true);
  }, [bookId, chapterId, key]);
  useEffect(() => {
    if (!ready || recovery) return;
    try {
      if (isDirty) {
        localStorage.setItem(
          key,
          JSON.stringify({
            payload: JSON.parse(snapshot),
            savedAt: new Date().toISOString(),
          }),
        );
        setLocalDraftAvailable(true);
      } else {
        localStorage.removeItem(key);
        setLocalDraftAvailable(false);
      }
    } catch {
      setLocalDraftAvailable(false);
    }
  }, [isDirty, key, snapshot, ready, recovery]);
  const saveChapter = useCallback(async () => {
    if (inFlight.current || recovery) return;
    const submitted = latestSnapshot.current;
    inFlight.current = true;
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/books/${bookId}/chapters/${chapterId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: submitted,
        },
      );
      if (!response.ok) throw new Error("Save failed");
      const saved = await response.json();
      if (Number.isFinite(saved.wordCount)) {
        recordWritingProgress(bookId, saved.wordCount - lastWordCount.current);
        lastWordCount.current = saved.wordCount;
      }
      setSavedSnapshot(submitted);
      setLastSaved(new Date());
      setSaveError(false);
    } catch {
      setSaveError(true);
    } finally {
      inFlight.current = false;
      setIsSaving(false);
    }
  }, [bookId, chapterId, recovery]);
  useEffect(() => {
    if (!ready || recovery || !isDirty) return;
    const timer = window.setTimeout(() => {
      void saveChapter();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [snapshot, isDirty, ready, recovery, saveChapter, savedSnapshot]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty || recovery) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveChapter();
      }
    };
    const online = () => {
      if (isDirty && !recovery) void saveChapter();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("keydown", shortcut);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("keydown", shortcut);
      window.removeEventListener("online", online);
    };
  }, [isDirty, recovery, saveChapter]);
  const restoreDraft = () => {
    if (recovery) {
      onRestore(recovery.payload);
      setRecovery(null);
    }
  };
  const discardDraft = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Storage unavailable. */
    }
    setRecovery(null);
  };
  return {
    saveChapter,
    isSaving,
    isDirty,
    saveError,
    lastSaved,
    localDraftAvailable,
    recovery,
    restoreDraft,
    discardDraft,
  };
}
