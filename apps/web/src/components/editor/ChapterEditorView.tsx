"use client";

import { useState, useCallback, useEffect } from "react";
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
import RichTextEditor, { getTextStatistics } from "@/components/editor/RichTextEditor";
import { useI18n } from "@/components/locale-provider";

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
};

type SimplePlotPoint = {
  id: string;
  title: string;
  type: string;
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
};

type Props = {
  chapter: Chapter;
  allCharacters: SimpleCharacter[];
  allPlotPoints: SimplePlotPoint[];
  allWorldElements: SimpleWorldElement[];
  chapters: SimpleChapter[];
};

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
    setGeneratedText("");

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
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setGeneratedText(
          `${t({ de: "Fehler", en: "Error" })}: ${
            error.error || t({ de: "Generierung fehlgeschlagen", en: "Generation failed" })
          }`,
        );
        return;
      }

      const data = await response.json();
      setGeneratedText(data.text);
    } catch (error) {
      console.error("Error generating text:", error);
      setGeneratedText(t({ de: "Fehler bei der Generierung", en: "Error during generation" }));
    } finally {
      setIsGenerating(false);
    }
  };

  const insertGeneratedText = () => {
    if (generatedText) {
      // Check if content already exists to add a break
      const spacer = content.trim() ? "<p><br></p>" : "";
      setContent(content + spacer + generatedText);
      setGeneratedText("");
      setAiPrompt("");
      setShowAIPanel(false);
    }
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
    <div className={`flex h-full transition-all duration-300 ${isFocusMode ? "bg-background" : ""}`}>
      {/* Main Editor */}
      <div className="flex-1 flex flex-col relative">
        {/* Header - Hidden in Focus Mode */}
        <header
          className={`border-b bg-card px-4 py-3 flex items-center justify-between transition-all duration-300 ${
            isFocusMode ? "opacity-0 h-0 overflow-hidden py-0 border-none" : "opacity-100"
          }`}
        >
          <div className="flex items-center gap-4">
            <Link
              href={`/books/${chapter.bookId}` as Route}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {chapter.book.title}
            </Link>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              {t({ de: "Kapitel", en: "Chapter" })} {chapter.orderIndex + 1}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                {t({ de: "Gespeichert", en: "Saved" })}: {lastSaved.toLocaleTimeString(intlLocale)}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={saveChapter} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">{t({ de: "Speichern", en: "Save" })}</span>
            </Button>
            <Button variant={showAIPanel ? "default" : "outline"} size="sm" onClick={() => setShowAIPanel(!showAIPanel)}>
              <Sparkles className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">{t({ de: "KI", en: "AI" })}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFocusMode(true)}
              title={t({ de: "Fokus-Modus (ESC zum Beenden)", en: "Focus mode (ESC to exit)" })}
            >
              <Maximize2 className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">{t({ de: "Fokus", en: "Focus" })}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t({ de: "Kapitel löschen", en: "Delete chapter" })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Editor Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Title */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t({ de: "Kapitel-Titel", en: "Chapter title" })}
              className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
            />

            {/* Content Editor - TipTap Rich Text */}
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder={t({ de: "Beginne mit dem Schreiben...", en: "Start writing..." })}
            />

            {/* Summary - Hidden in Focus Mode */}
            <div
              className={`space-y-2 pt-4 border-t transition-all duration-300 ${
                isFocusMode ? "opacity-0 h-0 overflow-hidden pt-0 border-none" : "opacity-100"
              }`}
            >
              <label className="text-sm font-medium text-muted-foreground">
                {t({ de: "Zusammenfassung (für KI-Kontext)", en: "Summary (for AI context)" })}
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={t({ de: "Kurze Zusammenfassung dieses Kapitels...", en: "Short summary of this chapter..." })}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Notes - Hidden in Focus Mode */}
            <div className={`space-y-2 transition-all duration-300 ${isFocusMode ? "opacity-0 h-0 overflow-hidden" : "opacity-100"}`}>
              <label className="text-sm font-medium text-muted-foreground">
                {t({ de: "Notizen", en: "Notes" })}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t({ de: "Private Notizen zu diesem Kapitel...", en: "Private notes for this chapter..." })}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Footer - Hidden in Focus Mode */}
        <footer
          className={`border-t bg-card px-4 py-3 flex items-center justify-between transition-all duration-300 ${
            isFocusMode ? "opacity-0 h-0 overflow-hidden py-0 border-none" : "opacity-100"
          }`}
        >
          <div className="flex items-center gap-6 text-sm text-muted-foreground overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2" title={t({ de: "Wörter", en: "Words" })}>
              <span className="font-medium text-foreground">{stats.wordCount.toLocaleString(intlLocale)}</span>{" "}
              {t({ de: "Wörter", en: "Words" })}
            </div>
            <div className="flex items-center gap-2" title={t({ de: "Zeichen (inkl. Leerzeichen)", en: "Characters (including spaces)" })}>
              <span className="font-medium text-foreground">{stats.characterCount.toLocaleString(intlLocale)}</span>{" "}
              {t({ de: "Zeichen", en: "Characters" })}
            </div>
            <div className="flex items-center gap-2" title={t({ de: "Geschätzte Lesezeit", en: "Estimated reading time" })}>
              <span className="font-medium text-foreground">~{stats.readingTime}</span> {t({ de: "Min.", en: "min" })}
            </div>
            <div className="hidden md:flex items-center gap-2" title={t({ de: "Absätze", en: "Paragraphs" })}>
              <span className="font-medium text-foreground">{stats.paragraphCount}</span> {t({ de: "Absätze", en: "Paragraphs" })}
            </div>
            <div className="hidden lg:flex items-center gap-2" title={t({ de: "Durchschnittliche Satzlänge", en: "Average sentence length" })}>
              <span className="font-medium text-foreground">Ø {stats.averageSentenceLength}</span>{" "}
              {t({ de: "Wörter/Satz", en: "Words/sentence" })}
            </div>

            <div className="h-4 w-px bg-border mx-2" />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
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
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t({ de: "Vorheriges", en: "Previous" })}
                </Button>
              </Link>
            )}
            {nextChapter && (
              <Link href={`/books/${chapter.bookId}/chapter/${nextChapter.id}` as Route}>
                <Button variant="ghost" size="sm">
                  {t({ de: "Nächstes", en: "Next" })}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </footer>

        {/* Focus Mode Floating Controls */}
        {isFocusMode && (
          <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Stats badge */}
            <div className="bg-card/90 backdrop-blur-sm border rounded-xl p-4 shadow-lg text-sm text-muted-foreground flex flex-col gap-2 min-w-[180px]">
              <div className="flex justify-between items-center">
                <span>{t({ de: "Wörter", en: "Words" })}</span>
                <span className="font-bold text-foreground">{stats.wordCount.toLocaleString(intlLocale)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t({ de: "Zeichen", en: "Characters" })}</span>
                <span className="font-bold text-foreground">{stats.characterCount.toLocaleString(intlLocale)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t({ de: "Lesezeit", en: "Reading time" })}</span>
                <span className="font-bold text-foreground">
                  ~{stats.readingTime} {t({ de: "Min.", en: "min" })}
                </span>
              </div>
            </div>
            {/* Exit focus mode button */}
            <Button
              onClick={() => setIsFocusMode(false)}
              className="rounded-full shadow-lg h-12 w-12 p-0"
              title={t({ de: "Fokus-Modus beenden (ESC)", en: "Exit focus mode (ESC)" })}
            >
              <Minimize2 className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* AI Panel - Hidden in Focus Mode */}
      {showAIPanel && !isFocusMode && (
        <aside className="w-96 border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-chart-3" />
              {t({ de: "KI-Assistent", en: "AI assistant" })}
            </h2>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Summary as Context Option */}
            {summary && (
              <Card className="border-chart-3/30">
                <CardContent className="pt-3 pb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSummaryAsPrompt}
                      onChange={(e) => setUseSummaryAsPrompt(e.target.checked)}
                      className="rounded border-input"
                    />
                    <span>{t({ de: "Kapitelzusammenfassung als Kontext nutzen", en: "Use chapter summary as context" })}</span>
                  </label>
                  {useSummaryAsPrompt && (
                    <p className="text-xs text-muted-foreground mt-2 pl-5">
                      {summary.length > 100 ? summary.substring(0, 100) + "..." : summary}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Character Selection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t({ de: "Charaktere für KI-Kontext", en: "Characters for AI context" })}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {selectedCharacterIds.length}/{allCharacters.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs max-h-32 overflow-auto">
                {allCharacters.length === 0 ? (
                  <span className="text-muted-foreground">{t({ de: "Keine Charaktere vorhanden", en: "No characters available" })}</span>
                ) : (
                  <div className="space-y-1">
                    {allCharacters.map((char) => (
                      <label key={char.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1 rounded">
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
                          className="rounded border-input"
                        />
                        <span>{char.name}</span>
                        <span className="text-muted-foreground ml-auto text-[10px]">{char.role}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plot Point Selection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  {t({ de: "Handlungspunkte für KI-Kontext", en: "Plot points for AI context" })}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {selectedPlotPointIds.length}/{allPlotPoints.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs max-h-32 overflow-auto">
                {allPlotPoints.length === 0 ? (
                  <span className="text-muted-foreground">{t({ de: "Keine Handlungspunkte vorhanden", en: "No plot points available" })}</span>
                ) : (
                  <div className="space-y-1">
                    {allPlotPoints.map((pp) => (
                      <label key={pp.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1 rounded">
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
                          className="rounded border-input"
                        />
                        <span>{pp.title}</span>
                        <span className="text-muted-foreground ml-auto text-[10px]">{pp.type}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* World Element Selection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {t({ de: "Weltelemente für KI-Kontext", en: "World elements for AI context" })}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {selectedWorldElementIds.length}/{allWorldElements.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs max-h-32 overflow-auto">
                {allWorldElements.length === 0 ? (
                  <span className="text-muted-foreground">{t({ de: "Keine Weltelemente vorhanden", en: "No world elements available" })}</span>
                ) : (
                  <div className="space-y-1">
                    {allWorldElements.map((we) => (
                      <label key={we.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1 rounded">
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
                          className="rounded border-input"
                        />
                        <span>{we.name}</span>
                        <span className="text-muted-foreground ml-auto text-[10px]">{we.type}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Length Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <AlignJustify className="h-4 w-4" />
                {t({ de: "Ziel-Länge", en: "Target length" })}
              </label>
              <select
                value={targetLength}
                onChange={(e) => setTargetLength(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="short">{t({ de: "Kurz (ca. 400-600 Wörter)", en: "Short (about 400-600 words)" })}</option>
                <option value="medium">{t({ de: "Mittel (ca. 800-1200 Wörter)", en: "Medium (about 800-1200 words)" })}</option>
                <option value="long">{t({ de: "Lang (Sehr ausführlich, 1500+)", en: "Long (very detailed, 1500+)" })}</option>
              </select>
            </div>

            {/* AI Prompt */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
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
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                onClick={handleGenerateText}
                disabled={isGenerating || (!aiPrompt.trim() && !(useSummaryAsPrompt && summary)) || !chapter.book.aiSettings?.apiKey}
                className="w-full"
              >
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {t({ de: "Text generieren", en: "Generate text" })}
              </Button>
              {!chapter.book.aiSettings?.apiKey && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  {t({ de: "Bitte konfiguriere zuerst die KI-Einstellungen im Buch.", en: "Please configure the AI settings for this book first." })}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t({
                  de: "ℹ️ Die KI nutzt automatisch alle vorherigen Kapitelzusammenfassungen als Kontext.",
                  en: "ℹ️ The AI automatically uses all previous chapter summaries as context.",
                })}
              </p>
            </div>

            {/* Generated Text */}
            {generatedText && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t({ de: "Generierter Text", en: "Generated text" })}</label>
                <div className="p-3 rounded-md bg-secondary text-sm max-h-64 overflow-auto whitespace-pre-wrap">{generatedText}</div>
                <Button onClick={insertGeneratedText} variant="outline" className="w-full">
                  {t({ de: "In Kapitel einfügen", en: "Insert into chapter" })}
                </Button>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
