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
import RichTextEditor, { getWordCount } from "@/components/editor/RichTextEditor";

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
        chapter.chapterCharacters.map(cc => cc.character.id)
    );
    const [selectedPlotPointIds, setSelectedPlotPointIds] = useState<string[]>(
        chapter.chapterPlotPoints.map(cp => cp.plotPoint.id)
    );
    const [selectedWorldElementIds, setSelectedWorldElementIds] = useState<string[]>([]);
    const [useSummaryAsPrompt, setUseSummaryAsPrompt] = useState(true);
    const [targetLength, setTargetLength] = useState("medium");

    // Calculate word count using getWordCount utility
    const wordCount = getWordCount(content);

    // Find prev/next chapters
    const currentIndex = chapters.findIndex((c) => c.id === chapter.id);
    const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
    const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

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
            if (content !== chapter.content || title !== chapter.title || summary !== (chapter.summary || "") || notes !== (chapter.notes || "")) {
                saveChapter();
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [content, title, summary, notes, chapter, saveChapter]);

    const handleGenerateText = async () => {
        // Allow generation without prompt if summary exists and useSummaryAsPrompt is true
        if (!aiPrompt.trim() && !(useSummaryAsPrompt && summary.trim())) {
            setGeneratedText("Bitte gib einen Prompt ein oder aktiviere 'Zusammenfassung nutzen'.");
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
                setGeneratedText(`Fehler: ${error.error || "Generierung fehlgeschlagen"}`);
                return;
            }

            const data = await response.json();
            setGeneratedText(data.text);
        } catch (error) {
            console.error("Error generating text:", error);
            setGeneratedText("Fehler bei der Generierung");
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
        if (!confirm("Möchtest du dieses Kapitel wirklich löschen?")) return;

        try {
            await fetch(`/api/books/${chapter.bookId}/chapters/${chapter.id}`, {
                method: "DELETE",
            });
            router.push(`/books/${chapter.bookId}` as Route);
        } catch (error) {
            console.error("Error deleting chapter:", error);
        }
    };

    return (
        <div className="flex h-full">
            {/* Main Editor */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
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
                            Kapitel {chapter.orderIndex + 1}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {lastSaved && (
                            <span className="text-xs text-muted-foreground">
                                Gespeichert: {lastSaved.toLocaleTimeString("de-DE")}
                            </span>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={saveChapter}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            <span className="ml-2 hidden sm:inline">Speichern</span>
                        </Button>
                        <Button
                            variant={showAIPanel ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowAIPanel(!showAIPanel)}
                        >
                            <Sparkles className="h-4 w-4" />
                            <span className="ml-2 hidden sm:inline">KI</span>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3">
                                <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={handleDelete}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Kapitel löschen
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
                            placeholder="Kapitel-Titel"
                            className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
                        />

                        {/* Content Editor - TipTap Rich Text */}
                        <RichTextEditor
                            content={content}
                            onChange={setContent}
                            placeholder="Beginne mit dem Schreiben..."
                        />

                        {/* Summary */}
                        <div className="space-y-2 pt-4 border-t">
                            <label className="text-sm font-medium text-muted-foreground">
                                Zusammenfassung (für KI-Kontext)
                            </label>
                            <textarea
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                placeholder="Kurze Zusammenfassung dieses Kapitels..."
                                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">
                                Notizen
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Private Notizen zu diesem Kapitel..."
                                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="border-t bg-card px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{wordCount.toLocaleString("de-DE")} Wörter</span>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="bg-transparent border rounded px-2 py-1 text-xs"
                        >
                            <option value="draft">Entwurf</option>
                            <option value="in_progress">In Arbeit</option>
                            <option value="review">Review</option>
                            <option value="completed">Fertig</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        {prevChapter && (
                            <Link href={`/books/${chapter.bookId}/chapter/${prevChapter.id}` as Route}>
                                <Button variant="ghost" size="sm">
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Vorheriges
                                </Button>
                            </Link>
                        )}
                        {nextChapter && (
                            <Link href={`/books/${chapter.bookId}/chapter/${nextChapter.id}` as Route}>
                                <Button variant="ghost" size="sm">
                                    Nächstes
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </footer>
            </div>

            {/* AI Panel */}
            {showAIPanel && (
                <aside className="w-96 border-l bg-card flex flex-col">
                    <div className="p-4 border-b">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-chart-3" />
                            KI-Assistent
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
                                        <span>Kapitelzusammenfassung als Kontext nutzen</span>
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
                                    Charaktere für KI-Kontext
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {selectedCharacterIds.length}/{allCharacters.length}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs max-h-32 overflow-auto">
                                {allCharacters.length === 0 ? (
                                    <span className="text-muted-foreground">Keine Charaktere vorhanden</span>
                                ) : (
                                    <div className="space-y-1">
                                        {allCharacters.map((char) => (
                                            <label
                                                key={char.id}
                                                className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1 rounded"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCharacterIds.includes(char.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedCharacterIds([...selectedCharacterIds, char.id]);
                                                        } else {
                                                            setSelectedCharacterIds(selectedCharacterIds.filter(id => id !== char.id));
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
                                    Handlungspunkte für KI-Kontext
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {selectedPlotPointIds.length}/{allPlotPoints.length}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs max-h-32 overflow-auto">
                                {allPlotPoints.length === 0 ? (
                                    <span className="text-muted-foreground">Keine Handlungspunkte vorhanden</span>
                                ) : (
                                    <div className="space-y-1">
                                        {allPlotPoints.map((pp) => (
                                            <label
                                                key={pp.id}
                                                className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1 rounded"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPlotPointIds.includes(pp.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedPlotPointIds([...selectedPlotPointIds, pp.id]);
                                                        } else {
                                                            setSelectedPlotPointIds(selectedPlotPointIds.filter(id => id !== pp.id));
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
                                    Weltelemente für KI-Kontext
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {selectedWorldElementIds.length}/{allWorldElements.length}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs max-h-32 overflow-auto">
                                {allWorldElements.length === 0 ? (
                                    <span className="text-muted-foreground">Keine Weltelemente vorhanden</span>
                                ) : (
                                    <div className="space-y-1">
                                        {allWorldElements.map((we) => (
                                            <label
                                                key={we.id}
                                                className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1 rounded"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedWorldElementIds.includes(we.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedWorldElementIds([...selectedWorldElementIds, we.id]);
                                                        } else {
                                                            setSelectedWorldElementIds(selectedWorldElementIds.filter(id => id !== we.id));
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
                                Ziel-Länge
                            </label>
                            <select
                                value={targetLength}
                                onChange={(e) => setTargetLength(e.target.value)}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="short">Kurz (ca. 400-600 Wörter)</option>
                                <option value="medium">Mittel (ca. 800-1200 Wörter)</option>
                                <option value="long">Lang (Sehr ausführlich, 1500+)</option>
                            </select>
                        </div>

                        {/* AI Prompt */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Prompt {useSummaryAsPrompt && summary ? "(optional, ergänzt Zusammenfassung)" : ""}
                            </label>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder={useSummaryAsPrompt && summary
                                    ? "Optional: Zusätzliche Anweisungen..."
                                    : "z.B. 'Schreibe eine Szene, in der der Protagonist auf den Antagonist trifft...'"}
                                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <Button
                                onClick={handleGenerateText}
                                disabled={isGenerating || (!aiPrompt.trim() && !(useSummaryAsPrompt && summary)) || !chapter.book.aiSettings?.apiKey}
                                className="w-full"
                            >
                                {isGenerating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                Text generieren
                            </Button>
                            {!chapter.book.aiSettings?.apiKey && (
                                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                    Bitte konfiguriere zuerst die KI-Einstellungen im Buch.
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                ℹ️ Die KI nutzt automatisch alle vorherigen Kapitelzusammenfassungen als Kontext.
                            </p>
                        </div>

                        {/* Generated Text */}
                        {generatedText && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Generierter Text</label>
                                <div className="p-3 rounded-md bg-secondary text-sm max-h-64 overflow-auto whitespace-pre-wrap">
                                    {generatedText}
                                </div>
                                <Button onClick={insertGeneratedText} variant="outline" className="w-full">
                                    In Kapitel einfügen
                                </Button>
                            </div>
                        )}
                    </div>
                </aside>
            )}
        </div>
    );
}
