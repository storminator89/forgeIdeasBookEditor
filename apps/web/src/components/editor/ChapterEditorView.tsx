"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Users,
  Map,
  Globe,
  MoreHorizontal,
  Trash2,
  Check,
  AlignJustify,
  Maximize2,
  Minimize2,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RichTextEditor, { getTextStatistics, type RichTextEditorRef } from "@/components/editor/RichTextEditor";
import AdvancedAIPanel from "@/components/editor/AdvancedAIPanel";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type AISettings = {
  id: string;
  apiEndpoint: string;
  apiKey: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string | null;
} | null;

type Book = {
  id: string;
  title: string;
  genre: string | null;
  writingStyle: string | null;
  targetAudience: string | null;
  language: string;
  aiSettings: AISettings;
};

type ChapterCharacter = {
  character: {
    id: string;
    name: string;
    role: string;
    description: string | null;
    personality: string | null;
  };
};

type ChapterPlotPoint = {
  plotPoint: {
    id: string;
    title: string;
    type: string;
  };
};

type Chapter = {
  id: string;
  bookId: string;
  orderIndex: number;
  title: string;
  content: string;
  summary: string | null;
  notes: string | null;
  wordCount: number;
  status: string;
  book: Book;
  chapterCharacters: ChapterCharacter[];
  chapterPlotPoints: ChapterPlotPoint[];
};

type SimpleCharacter = {
  id: string;
  name: string;
  role: string;
  description: string | null;
  personality: string | null;
  backstory: string | null;
  appearance: string | null;
  motivation: string | null;
  imageUrl: string | null;
};

type SimplePlotPoint = {
  id: string;
  title: string;
  type: string;
  description: string | null;
};

type SimpleChapter = {
  id: string;
  title: string;
  orderIndex: number;
};

type SimpleWorldElement = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  imageUrl: string | null;
};

type Props = {
  chapter: Chapter;
  allCharacters: SimpleCharacter[];
  allPlotPoints: SimplePlotPoint[];
  allWorldElements: SimpleWorldElement[];
  chapters: SimpleChapter[];
};

function htmlToPlainText(html: string): string {
  let text = html;
  
  // Replace block closing tags and line breaks with newlines
  text = text.replace(/<\/p>/g, "\n");
  text = text.replace(/<br\s*\/?>/g, "\n");
  text = text.replace(/<\/h[1-6]>/g, "\n");
  text = text.replace(/<\/blockquote>/g, "\n");
  text = text.replace(/<\/li>/g, "\n");
  
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]*>/g, "");
  
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
    
  return text;
}

export default function ChapterEditorView({
  chapter,
  allCharacters,
  allPlotPoints,
  allWorldElements,
  chapters,
}: Props) {
  const { t, intlLocale } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState(chapter.title);
  const [content, setContent] = useState(chapter.content);
  const [summary, setSummary] = useState(chapter.summary || "");
  const [notes, setNotes] = useState(chapter.notes || "");
  const [status, setStatus] = useState(chapter.status);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const editorRef = useRef<RichTextEditorRef>(null);
  const streamStartPos = useRef<number | null>(null);
  const lastInsertedLengthRef = useRef<number>(0);
  const accumulatedTextRef = useRef<string>("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedText, setGeneratedText] = useState("");

  // AI context selection states
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(
    chapter.chapterCharacters.map((cc) => cc.character.id),
  );
  const [selectedPlotPointIds, setSelectedPlotPointIds] = useState<string[]>(
    chapter.chapterPlotPoints.map((cp) => cp.plotPoint.id),
  );
  const [selectedWorldElementIds, setSelectedWorldElementIds] = useState<string[]>([]);
  const [useSummaryAsPrompt, setUseSummaryAsPrompt] = useState(true);
  const [targetLength, setTargetLength] = useState("medium");

  // Advanced AI panel state
  const [showAdvancedAI, setShowAdvancedAI] = useState(false);

  // Dynamic sliding reference drawers state
  const [activeDrawer, setActiveDrawer] = useState<"characters" | "plot" | "world" | null>(null);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState("");

  // Reset drawer search when switching drawers
  useEffect(() => {
    setDrawerSearchQuery("");
  }, [activeDrawer]);

  // Focus mode state
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Calculate text statistics
  const stats = getTextStatistics(content);

  // Find prev/next chapters
  const currentIndex = chapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  // ESC key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode]);

  // Auto-save
  const saveChapter = useCallback(async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/books/${chapter.bookId}/chapters/${chapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, summary, notes, status }),
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving chapter:", error);
    } finally {
      setIsSaving(false);
    }
  }, [chapter.bookId, chapter.id, title, content, summary, notes, status]);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        content !== chapter.content ||
        title !== chapter.title ||
        summary !== (chapter.summary || "") ||
        notes !== (chapter.notes || "")
      ) {
        saveChapter();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, title, summary, notes, chapter, saveChapter]);

  const handleGenerateText = async () => {
    // Allow generation without prompt if summary exists and useSummaryAsPrompt is true
    if (!aiPrompt.trim() && !(useSummaryAsPrompt && summary.trim())) {
      setGeneratedText(
        t({
          de: "Bitte gib einen Prompt ein oder aktiviere 'Zusammenfassung nutzen'.",
          en: "Please enter a prompt or enable 'Use summary'.",
        }),
      );
      return;
    }
    setIsGenerating(true);
    setIsStreaming(true);
    setGeneratedText("");
    setStreamedText("");

    // Focus and prepare the editor
    if (editorRef.current) {
      if (!editorRef.current.isFocused()) {
        editorRef.current.focus();
      }

      const selection = editorRef.current.getSelection();
      // Simple text-only length check
      const textLength = content.replace(/<[^>]*>/g, "").length;
      
      // If the editor has text and the cursor is near the end, insert a spacer first
      if (content.trim() && selection.from >= textLength) {
        editorRef.current.insertContent("<p><br></p>");
      }

      const updatedSelection = editorRef.current.getSelection();
      streamStartPos.current = updatedSelection.from;
    }

    lastInsertedLengthRef.current = 0;
    accumulatedTextRef.current = "";

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`/api/books/${chapter.bookId}/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          chapterId: chapter.id,
          characterIds: selectedCharacterIds.length > 0 ? selectedCharacterIds : undefined,
          plotPointIds: selectedPlotPointIds.length > 0 ? selectedPlotPointIds : undefined,
          worldElementIds: selectedWorldElementIds.length > 0 ? selectedWorldElementIds : undefined,
          useSummaryAsPrompt: useSummaryAsPrompt && !aiPrompt.trim(),
          targetLength,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        setGeneratedText(
          `${t({ de: "Fehler", en: "Error" })}: ${
            error.error || t({ de: "Generierung fehlgeschlagen", en: "Generation failed" })
          }`,
        );
        setIsStreaming(false);
        return;
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        setGeneratedText(t({ de: "Stream nicht verfügbar", en: "Stream not available" }));
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith("event: done")) {
              // Next line contains the final data
              continue;
            }

            if (trimmedLine.startsWith("event: error")) {
              continue;
            }

            if (trimmedLine.startsWith("data: ")) {
              const dataStr = trimmedLine.slice(6);
              try {
                const data = JSON.parse(dataStr);

                // Check if this is a done event (final HTML text)
                if (data.text !== undefined) {
                  // Replace streamed plain text range with finalized, polished rich HTML
                  if (editorRef.current && streamStartPos.current !== null) {
                    const endPos = editorRef.current.getSelection().to;
                    editorRef.current.deleteRange({ from: streamStartPos.current, to: endPos });
                    editorRef.current.insertContent(data.text);
                  }

                  setGeneratedText(data.text);
                  setStreamedText("");
                  setIsStreaming(false);
                  continue;
                }

                // Check if this is an error event
                if (data.error) {
                  setGeneratedText(`${t({ de: "Fehler", en: "Error" })}: ${data.error}`);
                  setIsStreaming(false);
                  continue;
                }

                // Token event - Stream plain text to the editor dynamically
                if (data.token) {
                  accumulatedTextRef.current += data.token;
                  setStreamedText(accumulatedTextRef.current);

                  const plainAccumulated = htmlToPlainText(accumulatedTextRef.current);
                  const newText = plainAccumulated.slice(lastInsertedLengthRef.current);

                  if (newText && editorRef.current) {
                    editorRef.current.insertContent(newText);
                    lastInsertedLengthRef.current = plainAccumulated.length;
                  }
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (streamError) {
        console.error("Stream reading error:", streamError);
        if (accumulatedTextRef.current) {
          setGeneratedText(accumulatedTextRef.current);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        // User aborted - keeping whatever is already streamed
        if (accumulatedTextRef.current) {
          if (editorRef.current && streamStartPos.current !== null) {
            const endPos = editorRef.current.getSelection().to;
            editorRef.current.deleteRange({ from: streamStartPos.current, to: endPos });
            
            let cleanText = accumulatedTextRef.current;
            cleanText = cleanText.replace(/<[^>]*$/, ""); // remove trailing open tag
            if (!/<\/?[a-z][\s\S]*>/i.test(cleanText)) {
              cleanText = cleanText
                .split(/\n\n+/)
                .map((para: string) => `<p>${para.trim().replace(/\n/g, "<br>")}</p>`)
                .join("");
            }
            editorRef.current.insertContent(cleanText);
          }
          setGeneratedText(t({ de: "Generierung abgebrochen. Text wurde beibehalten.", en: "Generation stopped. Text was kept." }));
        } else {
          setGeneratedText(t({ de: "Generierung abgebrochen", en: "Generation aborted" }));
        }
      } else {
        console.error("Error generating text:", error);
        setGeneratedText(t({ de: "Fehler bei der Generierung", en: "Error during generation" }));
      }
    } finally {
      setIsGenerating(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleAbortGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const handleAdvancedAIInsert = (text: string) => {
    const spacer = content.trim() ? "<p><br></p>" : "";
    setContent(content + spacer + text);
    setShowAdvancedAI(false);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        t({ de: "Möchtest du dieses Kapitel wirklich löschen?", en: "Do you really want to delete this chapter?" }),
      )
    ) {
      return;
    }

    try {
      await fetch(`/api/books/${chapter.bookId}/chapters/${chapter.id}`, {
        method: "DELETE",
      });
      router.push(`/books/${chapter.bookId}` as Route);
    } catch (error) {
      console.error("Error deleting chapter:", error);
    }
  };

  const promptSuffix =
    useSummaryAsPrompt && summary
      ? t({ de: "(optional, ergänzt Zusammenfassung)", en: "(optional, adds summary)" })
      : "";

  return (
    <div className={`flex h-full transition-all duration-500 relative ${isFocusMode ? "bg-background paper-texture" : "bg-background/10"}`}>
      
      {/* Background ambient decor spot */}
      {!isFocusMode && (
        <div className="absolute top-[10%] left-[20%] ambient-glow-amber opacity-10 pointer-events-none" />
      )}

      {/* Main Editor */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* Header - Hidden in Focus Mode */}
        <header
          className={`border-b border-border/40 bg-card/65 dark:bg-card/45 backdrop-blur-md px-6 py-4 flex items-center justify-between transition-all duration-500 ${
            isFocusMode ? "opacity-0 h-0 overflow-hidden py-0 border-none pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex items-center gap-4">
            <Link
              href={`/books/${chapter.bookId}` as Route}
              className="flex items-center gap-2.5 text-xs font-serif font-bold text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              {chapter.book.title}
            </Link>
            <div className="h-4 w-px bg-border/40" />
            <span className="text-xs font-serif font-semibold text-muted-foreground">
              {t({ de: "Kapitel", en: "Chapter" })} {chapter.orderIndex + 1}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mr-3">
                {t({ de: "Gespeichert", en: "Saved" })}: {lastSaved.toLocaleTimeString(intlLocale)}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={saveChapter} disabled={isSaving} className="rounded-xl h-9.5 text-xs font-semibold px-4 border-border/40 hover:bg-secondary/45">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-primary" />}
              <span className="ml-2 hidden sm:inline">{t({ de: "Speichern", en: "Save" })}</span>
            </Button>
            <Button variant={showAIPanel ? "default" : "outline"} size="sm" onClick={() => { setShowAIPanel(!showAIPanel); setShowAdvancedAI(false); }} className="rounded-xl h-9.5 text-xs font-semibold px-4 border-border/40">
              <Sparkles className="h-4 w-4 text-chart-1 animate-pulse" />
              <span className="ml-2 hidden sm:inline">{t({ de: "KI-Assistent", en: "AI Assistant" })}</span>
            </Button>
            <Button variant={showAdvancedAI ? "default" : "outline"} size="sm" onClick={() => { setShowAdvancedAI(!showAdvancedAI); setShowAIPanel(false); }} className="rounded-xl h-9.5 text-xs font-semibold px-4 border-border/40">
              <Wand2 className="h-4 w-4 text-primary" />
              <span className="ml-2 hidden sm:inline">{t({ de: "KI-Tools", en: "AI Tools" })}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFocusMode(true)}
              title={t({ de: "Fokus-Modus (ESC zum Beenden)", en: "Focus mode (ESC to exit)" })}
              className="rounded-xl h-9.5 text-xs font-semibold px-4 border-border/40 hover:bg-secondary/45"
            >
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
              <span className="ml-2 hidden sm:inline">{t({ de: "Fokus", en: "Focus" })}</span>
            </Button>
            <div className="h-4 w-px bg-border/40 mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all hover:bg-secondary/45 h-9.5 w-9.5 border border-border/40">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-border/40 shadow-xl">
                <DropdownMenuItem className="text-destructive focus:text-destructive rounded-lg text-xs" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t({ de: "Kapitel löschen", en: "Delete chapter" })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Editor Content - Typewriter Sheet */}
        <div className="flex-1 overflow-auto p-6 md:p-10">
          <div className={`max-w-3xl mx-auto space-y-8 p-8 md:p-12 rounded-3xl transition-all duration-500 ${
            isFocusMode 
              ? "bg-card/90 dark:bg-card/75 shadow-2xl border border-border/30 max-w-2xl mt-4" 
              : "bg-card border border-border/30 shadow-md"
          } paper-texture relative`}>
            
            {/* Binder line indicator on typewriter page */}
            <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-gradient-to-r from-black/[0.04] to-transparent border-r border-black/[0.02]" />

            {/* Title */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t({ de: "Kapitel-Titel", en: "Chapter title" })}
              className="text-3xl sm:text-4xl font-serif font-black tracking-tight border-none shadow-none focus-visible:ring-0 px-0 h-auto text-foreground pb-2 border-b border-border/20 pl-4"
            />

            {/* Content Editor - TipTap Rich Text */}
            <div className="pl-4">
              <RichTextEditor
                ref={editorRef}
                content={content}
                onChange={setContent}
                placeholder={t({ de: "Beginne mit dem Schreiben...", en: "Start writing..." })}
                bookId={chapter.bookId}
              />
            </div>

            {/* Summary - Hidden in Focus Mode */}
            <div
              className={`space-y-3 pt-6 border-t border-border/30 pl-4 transition-all duration-500 ${
                isFocusMode ? "opacity-0 h-0 overflow-hidden pt-0 border-none pointer-events-none" : "opacity-100"
              }`}
            >
              <label className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground font-sans">
                {t({ de: "Zusammenfassung (für KI-Kontext)", en: "Summary (for AI context)" })}
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={t({ de: "Kurze Zusammenfassung dieses Kapitels...", en: "Short summary of this chapter..." })}
                className="w-full min-h-[90px] px-4 py-3 rounded-xl border border-border/45 bg-background/55 text-sm font-serif leading-relaxed resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all shadow-inner"
              />
            </div>

            {/* Notes - Hidden in Focus Mode */}
            <div className={`space-y-3 pl-4 transition-all duration-500 ${isFocusMode ? "opacity-0 h-0 overflow-hidden pointer-events-none" : "opacity-100"}`}>
              <label className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground font-sans">
                {t({ de: "Notizen", en: "Notes" })}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t({ de: "Private Notizen zu diesem Kapitel...", en: "Private notes for this chapter..." })}
                className="w-full min-h-[90px] px-4 py-3 rounded-xl border border-border/45 bg-background/55 text-sm font-serif leading-relaxed resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Footer - Hidden in Focus Mode */}
        <footer
          className={`border-t border-border/40 bg-card/65 dark:bg-card/45 backdrop-blur-md px-6 py-4 flex items-center justify-between transition-all duration-500 ${
            isFocusMode ? "opacity-0 h-0 overflow-hidden py-0 border-none pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex items-center gap-5 text-[11px] text-muted-foreground overflow-x-auto hide-scrollbar font-serif">
            <div className="flex items-center gap-1.5" title={t({ de: "Wörter", en: "Words" })}>
              <span className="font-bold text-foreground">{stats.wordCount.toLocaleString(intlLocale)}</span>{" "}
              {t({ de: "Wörter", en: "Words" })}
            </div>
            <div className="h-3 w-px bg-border/40" />
            <div className="flex items-center gap-1.5" title={t({ de: "Zeichen (inkl. Leerzeichen)", en: "Characters (including spaces)" })}>
              <span className="font-bold text-foreground">{stats.characterCount.toLocaleString(intlLocale)}</span>{" "}
              {t({ de: "Zeichen", en: "Characters" })}
            </div>
            <div className="h-3 w-px bg-border/40" />
            <div className="flex items-center gap-1.5" title={t({ de: "Geschätzte Lesezeit", en: "Estimated reading time" })}>
              <span className="font-bold text-foreground">~{stats.readingTime}</span> {t({ de: "Min.", en: "min" })}
            </div>
            <div className="hidden sm:block h-3 w-px bg-border/40" />
            <div className="hidden sm:flex items-center gap-1.5" title={t({ de: "Absätze", en: "Paragraphs" })}>
              <span className="font-bold text-foreground">{stats.paragraphCount}</span> {t({ de: "Absätze", en: "Paragraphs" })}
            </div>

            <div className="h-3.5 w-px bg-border/40 mx-2" />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-background border border-border/45 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:border-primary/50 shadow-sm"
            >
              <option value="draft">{t({ de: "Entwurf", en: "Draft" })}</option>
              <option value="in_progress">{t({ de: "In Arbeit", en: "In progress" })}</option>
              <option value="review">{t({ de: "Review", en: "Review" })}</option>
              <option value="completed">{t({ de: "Fertig", en: "Completed" })}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {prevChapter && (
              <Link href={`/books/${chapter.bookId}/chapter/${prevChapter.id}` as Route}>
                <Button variant="ghost" size="sm" className="rounded-xl border border-border/30 text-xs hover:bg-secondary/45">
                  <ChevronLeft className="h-4 w-4 mr-1 text-muted-foreground" />
                  {t({ de: "Vorheriges", en: "Previous" })}
                </Button>
              </Link>
            )}
            {nextChapter && (
              <Link href={`/books/${chapter.bookId}/chapter/${nextChapter.id}` as Route}>
                <Button variant="ghost" size="sm" className="rounded-xl border border-border/30 text-xs hover:bg-secondary/45">
                  {t({ de: "Nächstes", en: "Next" })}
                  <ChevronRight className="h-4 w-4 ml-1 text-muted-foreground" />
                </Button>
              </Link>
            )}
          </div>
        </footer>

        {/* Focus Mode Floating Controls */}
        {isFocusMode && (
          <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats badge */}
            <div className="bg-card/90 dark:bg-card/75 backdrop-blur-sm border rounded-xl p-4.5 shadow-2xl text-xs text-muted-foreground flex flex-col gap-2.5 min-w-[200px] paper-texture">
              <div className="flex justify-between items-center font-serif">
                <span>{t({ de: "Wörter", en: "Words" })}</span>
                <span className="font-bold text-foreground font-mono">{stats.wordCount.toLocaleString(intlLocale)}</span>
              </div>
              <div className="flex justify-between items-center font-serif">
                <span>{t({ de: "Zeichen", en: "Characters" })}</span>
                <span className="font-bold text-foreground font-mono">{stats.characterCount.toLocaleString(intlLocale)}</span>
              </div>
              <div className="flex justify-between items-center font-serif">
                <span>{t({ de: "Lesezeit", en: "Reading time" })}</span>
                <span className="font-bold text-foreground font-mono">
                  ~{stats.readingTime} {t({ de: "Min.", en: "min" })}
                </span>
              </div>
            </div>
            {/* Exit focus mode button */}
            <Button
              onClick={() => setIsFocusMode(false)}
              className="rounded-full shadow-xl h-12 w-12 p-0 bg-primary text-primary-foreground hover:scale-105 transition-all"
              title={t({ de: "Fokus-Modus beenden (ESC)", en: "Exit focus mode (ESC)" })}
            >
              <Minimize2 className="h-5 w-5 animate-pulse" />
            </Button>
          </div>
        )}
      </div>

      {/* Advanced AI Panel - Hidden in Focus Mode */}
      {showAdvancedAI && !isFocusMode && (
        <aside className="w-96 border-l border-border/40 bg-card/75 dark:bg-card/45 backdrop-blur-xl flex flex-col z-20 shadow-2xl relative overflow-hidden transition-all duration-300">
          <div className="absolute -right-16 -top-16 w-32 h-32 bg-primary/10 rounded-full blur-xl pointer-events-none" />
          <div className="p-4 border-b border-border/40 bg-secondary/10 flex items-center gap-2">
            <Wand2 className="h-4.5 w-4.5 text-primary animate-pulse" />
            <h2 className="font-serif font-bold text-sm text-foreground">
              {t({ de: "KI-Werkzeuge", en: "AI Tools" })}
            </h2>
          </div>
          <AdvancedAIPanel
            bookId={chapter.bookId}
            chapterId={chapter.id}
            chapterTitle={title}
            chapterSummary={summary}
            currentContent={content}
            onInsertText={handleAdvancedAIInsert}
          />
        </aside>
      )}

      {/* AI Panel - Hidden in Focus Mode */}
      {showAIPanel && !isFocusMode && (
        <aside className="w-96 border-l border-border/40 bg-card/75 dark:bg-card/45 backdrop-blur-xl flex flex-col z-20 shadow-2xl relative overflow-hidden transition-all duration-300">
          <div className="absolute -right-16 -top-16 w-32 h-32 bg-chart-1/10 rounded-full blur-xl pointer-events-none" />
          <div className="p-4 border-b border-border/40 bg-secondary/10 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-chart-1 animate-pulse" />
            <h2 className="font-serif font-bold text-sm text-foreground">
              {t({ de: "KI-Assistent", en: "AI assistant" })}
            </h2>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-5">
            {/* Summary as Context Option */}
            {summary && (
              <Card className="border border-border/40 bg-background/35 rounded-xl overflow-hidden shadow-inner">
                <CardContent className="p-4">
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSummaryAsPrompt}
                      onChange={(e) => setUseSummaryAsPrompt(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                    <span>{t({ de: "Kapitelzusammenfassung als Kontext nutzen", en: "Use chapter summary as context" })}</span>
                  </label>
                  {useSummaryAsPrompt && (
                    <p className="text-[11px] font-serif text-muted-foreground mt-2 pl-6.5 leading-relaxed bg-secondary/20 p-2 rounded-lg">
                      {summary.length > 100 ? summary.substring(0, 100) + "..." : summary}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Character Selection */}
            <Card className="border border-border/40 rounded-xl overflow-hidden bg-background/25">
              <CardHeader className="pb-2 pt-3 px-4 bg-secondary/10 border-b border-border/20">
                <CardTitle className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t({ de: "Charaktere für KI-Kontext", en: "Characters for AI context" })}
                  <span className="text-[10px] font-mono font-bold bg-primary/5 text-primary border px-1.5 py-0.5 rounded-md ml-auto">
                    {selectedCharacterIds.length}/{allCharacters.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs p-3.5 max-h-36 overflow-auto">
                {allCharacters.length === 0 ? (
                  <span className="text-muted-foreground font-serif block text-center py-2">{t({ de: "Keine Charaktere vorhanden", en: "No characters available" })}</span>
                ) : (
                  <div className="space-y-1.5">
                    {allCharacters.map((char) => (
                      <label key={char.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-secondary/45 p-1.5 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedCharacterIds.includes(char.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCharacterIds([...selectedCharacterIds, char.id]);
                            } else {
                              setSelectedCharacterIds(selectedCharacterIds.filter((id) => id !== char.id));
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <span className="font-semibold text-foreground">{char.name}</span>
                        <span className="text-muted-foreground ml-auto text-[9px] uppercase tracking-wide font-medium">{char.role}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plot Point Selection */}
            <Card className="border border-border/40 rounded-xl overflow-hidden bg-background/25">
              <CardHeader className="pb-2 pt-3 px-4 bg-secondary/10 border-b border-border/20">
                <CardTitle className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  {t({ de: "Handlungspunkte für KI-Kontext", en: "Plot points for AI context" })}
                  <span className="text-[10px] font-mono font-bold bg-primary/5 text-primary border px-1.5 py-0.5 rounded-md ml-auto">
                    {selectedPlotPointIds.length}/{allPlotPoints.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs p-3.5 max-h-36 overflow-auto">
                {allPlotPoints.length === 0 ? (
                  <span className="text-muted-foreground font-serif block text-center py-2">{t({ de: "Keine Handlungspunkte vorhanden", en: "No plot points available" })}</span>
                ) : (
                  <div className="space-y-1.5">
                    {allPlotPoints.map((pp) => (
                      <label key={pp.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-secondary/45 p-1.5 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedPlotPointIds.includes(pp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlotPointIds([...selectedPlotPointIds, pp.id]);
                            } else {
                              setSelectedPlotPointIds(selectedPlotPointIds.filter((id) => id !== pp.id));
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <span className="font-semibold text-foreground line-clamp-1">{pp.title}</span>
                        <span className="text-muted-foreground ml-auto text-[9px] uppercase tracking-wide font-medium">{pp.type}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* World Element Selection */}
            <Card className="border border-border/40 rounded-xl overflow-hidden bg-background/25">
              <CardHeader className="pb-2 pt-3 px-4 bg-secondary/10 border-b border-border/20">
                <CardTitle className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {t({ de: "Weltelemente für KI-Kontext", en: "World elements for AI context" })}
                  <span className="text-[10px] font-mono font-bold bg-primary/5 text-primary border px-1.5 py-0.5 rounded-md ml-auto">
                    {selectedWorldElementIds.length}/{allWorldElements.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs p-3.5 max-h-36 overflow-auto">
                {allWorldElements.length === 0 ? (
                  <span className="text-muted-foreground font-serif block text-center py-2">{t({ de: "Keine Weltelemente vorhanden", en: "No world elements available" })}</span>
                ) : (
                  <div className="space-y-1.5">
                    {allWorldElements.map((we) => (
                      <label key={we.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-secondary/45 p-1.5 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedWorldElementIds.includes(we.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedWorldElementIds([...selectedWorldElementIds, we.id]);
                            } else {
                              setSelectedWorldElementIds(selectedWorldElementIds.filter((id) => id !== we.id));
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <span className="font-semibold text-foreground">{we.name}</span>
                        <span className="text-muted-foreground ml-auto text-[9px] uppercase tracking-wide font-medium">{we.type}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Length Selection */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                <AlignJustify className="h-4 w-4" />
                {t({ de: "Ziel-Länge", en: "Target length" })}
              </label>
              <select
                value={targetLength}
                onChange={(e) => setTargetLength(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-border/45 bg-background/55 text-xs font-serif shadow-inner focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              >
                <option value="short">{t({ de: "Kurz (ca. 400-600 Wörter)", en: "Short (about 400-600 words)" })}</option>
                <option value="medium">{t({ de: "Mittel (ca. 800-1200 Wörter)", en: "Medium (about 800-1200 words)" })}</option>
                <option value="long">{t({ de: "Lang (Sehr ausführlich, 1500+)", en: "Long (very detailed, 1500+)" })}</option>
              </select>
            </div>

            {/* AI Prompt */}
            <div className="space-y-2.5 pt-4 border-t border-border/30">
              <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                {t({ de: "Prompt", en: "Prompt" })} {promptSuffix ? ` ${promptSuffix}` : ""}
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={
                  useSummaryAsPrompt && summary
                    ? t({ de: "Optional: Zusätzliche Anweisungen...", en: "Optional: additional instructions..." })
                    : t({ de: "z.B. 'Schreibe eine Szene, in der der Protagonist auf den Antagonist trifft...'", en: "e.g. 'Write a scene where the protagonist meets the antagonist...'" })
                }
                className="w-full min-h-[90px] px-3.5 py-3 rounded-xl border border-border/45 bg-background/55 text-xs font-serif leading-relaxed resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all shadow-inner"
              />
              {isStreaming ? (
                <Button
                  onClick={handleAbortGeneration}
                  variant="destructive"
                  className="w-full rounded-xl h-10.5 font-semibold text-xs shadow-md"
                >
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  {t({ de: "Generierung stoppen", en: "Stop generation" })}
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateText}
                  disabled={isGenerating || (!aiPrompt.trim() && !(useSummaryAsPrompt && summary)) || !chapter.book.aiSettings?.apiKey}
                  className="w-full rounded-xl h-10.5 font-semibold text-xs bg-primary text-primary-foreground shadow-md"
                >
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-chart-1 animate-pulse" />}
                  {t({ de: "Text generieren", en: "Generate text" })}
                </Button>
              )}
              {!chapter.book.aiSettings?.apiKey && (
                <p className="text-[10px] text-yellow-600 dark:text-yellow-500 font-serif leading-relaxed text-center bg-yellow-500/5 p-2.5 rounded-lg border border-yellow-500/25 mt-2">
                  ⚠️ {t({ de: "Bitte konfiguriere zuerst die KI-Einstellungen im Buch.", en: "Please configure the AI settings for this book first." })}
                </p>
              )}
              <p className="text-[10px] font-serif text-muted-foreground leading-relaxed italic text-center mt-2.5">
                {t({
                  de: "ℹ️ Die KI nutzt automatisch alle vorherigen Kapitelzusammenfassungen als Kontext.",
                  en: "ℹ️ The AI automatically uses all previous chapter summaries as context.",
                })}
              </p>
            </div>

            {/* Generated Text or Streaming Preview */}
            {isStreaming && streamedText && (
              <div className="space-y-2.5 pt-4 border-t border-border/30">
                <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground animate-pulse">
                  {t({ de: "KI schreibt in Editor...", en: "AI is writing to editor..." })}
                </label>
                <div className="p-4 rounded-xl border border-border/40 bg-secondary/25 text-xs font-serif leading-relaxed max-h-40 overflow-auto whitespace-pre-wrap shadow-inner text-muted-foreground">
                  {streamedText}
                  <span className="inline-block w-2.5 h-4 ml-0.5 bg-primary animate-pulse" />
                </div>
              </div>
            )}

            {!isStreaming && generatedText && (
              <div className="space-y-2.5 pt-4 border-t border-border/30 text-center p-4 bg-green-500/5 border border-green-500/25 rounded-xl animate-in fade-in duration-300">
                <div className="mx-auto h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                  {t({ de: "Text erfolgreich in den Editor geschrieben!", en: "Text successfully written to the editor!" })}
                </p>
                <Button
                  onClick={() => {
                    setGeneratedText("");
                    setAiPrompt("");
                  }}
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-[10px] h-7 font-semibold"
                >
                  {t({ de: "Bereit für neuen Prompt", en: "Ready for new prompt" })}
                </Button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Radical Slide-Out Parchment Dossier Sheet Panel */}
      <AnimatePresence>
        {activeDrawer && !isFocusMode && (
          <motion.aside
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 16 }}
            className="w-96 border-l border-border/40 bg-card/80 dark:bg-card/50 backdrop-blur-2xl flex flex-col z-20 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -left-16 -top-16 w-32 h-32 bg-primary/5 rounded-full blur-xl pointer-events-none" />
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-border/40 bg-secondary/15 flex items-center justify-between">
              <h2 className="font-serif font-black text-sm text-foreground flex items-center gap-2">
                {activeDrawer === "characters" && (
                  <>
                    <Users className="h-4.5 w-4.5 text-primary" />
                    {t({ de: "Charakter-Dossiers", en: "Character Dossiers" })}
                  </>
                )}
                {activeDrawer === "plot" && (
                  <>
                    <Map className="h-4.5 w-4.5 text-primary" />
                    {t({ de: "Handlungspunkte", en: "Plot Points" })}
                  </>
                )}
                {activeDrawer === "world" && (
                  <>
                    <Globe className="h-4.5 w-4.5 text-primary" />
                    {t({ de: "Welt-Referenzen", en: "World References" })}
                  </>
                )}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveDrawer(null)}
                className="h-7 px-2 text-xs hover:bg-secondary/40 font-semibold rounded-lg"
              >
                {t({ de: "Schließen", en: "Close" })}
              </Button>
            </div>

            {/* Drawer Search */}
            <div className="p-4.5 border-b border-border/30 bg-secondary/5">
              <Input
                placeholder={t({ de: "Suchen...", en: "Search..." })}
                value={drawerSearchQuery}
                onChange={(e) => setDrawerSearchQuery(e.target.value)}
                className="rounded-xl bg-background/55 text-xs h-9 border-border/40 shadow-inner"
              />
            </div>

            {/* Drawer Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Characters Dossier rendering */}
              {activeDrawer === "characters" && (
                <>
                  {allCharacters
                    .filter(c => 
                      c.name.toLowerCase().includes(drawerSearchQuery.toLowerCase()) ||
                      c.role.toLowerCase().includes(drawerSearchQuery.toLowerCase()) ||
                      c.description?.toLowerCase().includes(drawerSearchQuery.toLowerCase())
                    )
                    .map((char) => (
                      <div key={char.id} className="p-4 rounded-xl border border-border/40 bg-background/45 shadow-sm space-y-3 relative overflow-hidden paper-texture">
                        <div className="book-binding-line" />
                        <div className="flex items-start gap-3 pl-3">
                          {char.imageUrl ? (
                            <img src={char.imageUrl} alt={char.name} className="h-10 w-10 rounded-lg object-cover border border-border/30 flex-shrink-0" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-secondary/40 border border-border/30 flex items-center justify-center flex-shrink-0">
                              <Users className="h-4.5 w-4.5 text-muted-foreground/30" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-sm text-foreground">{char.name}</h3>
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-primary">{char.role}</span>
                          </div>
                        </div>
                        
                        {char.description && (
                          <p className="text-xs font-serif text-muted-foreground leading-relaxed pl-3 border-t border-border/20 pt-2">
                            <span className="font-sans font-bold text-[10px] text-foreground block mb-0.5 uppercase tracking-wide">{t({ de: "Beschreibung", en: "Description" })}</span>
                            {char.description}
                          </p>
                        )}
                        {char.personality && (
                          <p className="text-xs font-serif text-muted-foreground leading-relaxed pl-3">
                            <span className="font-sans font-bold text-[10px] text-foreground block mb-0.5 uppercase tracking-wide">{t({ de: "Persönlichkeit", en: "Personality" })}</span>
                            {char.personality}
                          </p>
                        )}
                        {char.motivation && (
                          <p className="text-xs font-serif text-muted-foreground leading-relaxed pl-3">
                            <span className="font-sans font-bold text-[10px] text-foreground block mb-0.5 uppercase tracking-wide">{t({ de: "Motivation", en: "Motivation" })}</span>
                            {char.motivation}
                          </p>
                        )}
                        {char.backstory && (
                          <p className="text-xs font-serif text-muted-foreground leading-relaxed pl-3">
                            <span className="font-sans font-bold text-[10px] text-foreground block mb-0.5 uppercase tracking-wide">{t({ de: "Hintergrund", en: "Backstory" })}</span>
                            {char.backstory}
                          </p>
                        )}
                        {char.appearance && (
                          <p className="text-xs font-serif text-muted-foreground leading-relaxed pl-3">
                            <span className="font-sans font-bold text-[10px] text-foreground block mb-0.5 uppercase tracking-wide">{t({ de: "Aussehen", en: "Appearance" })}</span>
                            {char.appearance}
                          </p>
                        )}
                      </div>
                    ))}
                  {allCharacters.filter(c => c.name.toLowerCase().includes(drawerSearchQuery.toLowerCase())).length === 0 && (
                    <span className="text-xs text-muted-foreground text-center block py-8 font-serif">{t({ de: "Keine Dossiers gefunden", en: "No dossiers found" })}</span>
                  )}
                </>
              )}

              {/* Plot Dossier rendering */}
              {activeDrawer === "plot" && (
                <div className="space-y-4">
                  {allPlotPoints
                    .filter(p => 
                      p.title.toLowerCase().includes(drawerSearchQuery.toLowerCase()) ||
                      p.type.toLowerCase().includes(drawerSearchQuery.toLowerCase()) ||
                      p.description?.toLowerCase().includes(drawerSearchQuery.toLowerCase())
                    )
                    .map((plot) => (
                      <div key={plot.id} className="p-4 rounded-xl border border-border/40 bg-background/45 shadow-sm space-y-2 relative overflow-hidden paper-texture">
                        <div className="book-binding-line" />
                        <div className="pl-3">
                          <h3 className="font-bold text-sm text-foreground">{plot.title}</h3>
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-primary">{plot.type}</span>
                          {plot.description && (
                            <p className="text-xs font-serif text-muted-foreground leading-relaxed mt-2 pt-2 border-t border-border/20">
                              {plot.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  {allPlotPoints.filter(p => p.title.toLowerCase().includes(drawerSearchQuery.toLowerCase())).length === 0 && (
                    <span className="text-xs text-muted-foreground text-center block py-8 font-serif">{t({ de: "Keine Handlungspunkte gefunden", en: "No plot points found" })}</span>
                  )}
                </div>
              )}

              {/* World Dossier rendering */}
              {activeDrawer === "world" && (
                <div className="space-y-4">
                  {allWorldElements
                    .filter(w => 
                      w.name.toLowerCase().includes(drawerSearchQuery.toLowerCase()) ||
                      w.type.toLowerCase().includes(drawerSearchQuery.toLowerCase()) ||
                      w.description?.toLowerCase().includes(drawerSearchQuery.toLowerCase())
                    )
                    .map((elem) => (
                      <div key={elem.id} className="p-4 rounded-xl border border-border/40 bg-background/45 shadow-sm space-y-3 relative overflow-hidden paper-texture">
                        <div className="book-binding-line" />
                        <div className="flex items-start gap-3 pl-3">
                          {elem.imageUrl ? (
                            <img src={elem.imageUrl} alt={elem.name} className="h-10 w-10 rounded-lg object-cover border border-border/30 flex-shrink-0" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-secondary/40 border border-border/30 flex items-center justify-center flex-shrink-0">
                              <Globe className="h-4.5 w-4.5 text-muted-foreground/30" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-sm text-foreground">{elem.name}</h3>
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-primary">{elem.type}</span>
                          </div>
                        </div>
                        {elem.description && (
                          <p className="text-xs font-serif text-muted-foreground leading-relaxed pl-3 border-t border-border/20 pt-2">
                            {elem.description}
                          </p>
                        )}
                      </div>
                    ))}
                  {allWorldElements.filter(w => w.name.toLowerCase().includes(drawerSearchQuery.toLowerCase())).length === 0 && (
                    <span className="text-xs text-muted-foreground text-center block py-8 font-serif">{t({ de: "Keine Weltelemente gefunden", en: "No world elements found" })}</span>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Radical Floating Margin reference triggers - Hidden in Focus Mode */}
      {!isFocusMode && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4.5 z-40">
          <button
            onClick={() => setActiveDrawer(activeDrawer === "characters" ? null : "characters")}
            className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center border shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 cursor-pointer group relative",
              activeDrawer === "characters"
                ? "bg-primary border-primary text-primary-foreground shadow-primary/10"
                : "bg-card/85 dark:bg-card/65 border-border/45 text-muted-foreground hover:text-foreground hover:border-primary/30"
            )}
            title={t({ de: "Charakter-Referenz", en: "Character reference" })}
          >
            <Users className="h-4.5 w-4.5" />
            <span className="absolute right-13 bg-primary text-primary-foreground border border-primary/10 text-[9px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {t({ de: "Charaktere", en: "Characters" })}
            </span>
          </button>
          
          <button
            onClick={() => setActiveDrawer(activeDrawer === "plot" ? null : "plot")}
            className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center border shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 cursor-pointer group relative",
              activeDrawer === "plot"
                ? "bg-primary border-primary text-primary-foreground shadow-primary/10"
                : "bg-card/85 dark:bg-card/65 border-border/45 text-muted-foreground hover:text-foreground hover:border-primary/30"
            )}
            title={t({ de: "Handlungs-Referenz", en: "Plot reference" })}
          >
            <Map className="h-4.5 w-4.5" />
            <span className="absolute right-13 bg-primary text-primary-foreground border border-primary/10 text-[9px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {t({ de: "Handlung", en: "Plot" })}
            </span>
          </button>

          <button
            onClick={() => setActiveDrawer(activeDrawer === "world" ? null : "world")}
            className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center border shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 cursor-pointer group relative",
              activeDrawer === "world"
                ? "bg-primary border-primary text-primary-foreground shadow-primary/10"
                : "bg-card/85 dark:bg-card/65 border-border/45 text-muted-foreground hover:text-foreground hover:border-primary/30"
            )}
            title={t({ de: "Weltelement-Referenz", en: "World element reference" })}
          >
            <Globe className="h-4.5 w-4.5" />
            <span className="absolute right-13 bg-primary text-primary-foreground border border-primary/10 text-[9px] uppercase font-serif font-black tracking-wider px-2 py-0.5 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {t({ de: "Welt", en: "World" })}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
