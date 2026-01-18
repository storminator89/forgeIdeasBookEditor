"use client";

import { useState, useRef } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
    Pencil,
    Check,
    X,
    Loader2,
    Plus,
    FileText,
    Users,
    Map,
    Sparkles,
    Upload,
    Trash2
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import ConsistencyCheckPanel from "@/components/editor/ConsistencyCheckPanel";

// Re-using types for now (should be in a shared types file ideally)
type Chapter = {
    id: string;
    title: string;
    orderIndex: number;
    status: string;
    wordCount: number;
};

type AISettings = {
    id: string;
    bookId: string;
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
    author: string | null;
    description: string | null;
    genre: string | null;
    targetAudience: string | null;
    writingStyle: string | null;
    language: string;
    coverUrl: string | null;
    hideCoverText: boolean;
    chapters: Chapter[];
    characters: any[];
    plotPoints: any[];
    worldElements: any[];
    aiSettings: AISettings;

};

interface OverviewTabProps {
    book: Book;
    setBook: React.Dispatch<React.SetStateAction<Book>>;
    setActiveTab: (tab: any) => void;
    handleCreateChapter: () => void;
    isCreatingChapter: boolean;
}

export default function OverviewTab({
    book,
    setBook,
    setActiveTab,
    handleCreateChapter,
    isCreatingChapter
}: OverviewTabProps) {
    const router = useRouter();
    const [isEditingBook, setIsEditingBook] = useState(false);
    const [editTitle, setEditTitle] = useState(book.title);
    const [editAuthor, setEditAuthor] = useState(book.author || "");
    const [editDescription, setEditDescription] = useState(book.description || "");
    const [isSavingBook, setIsSavingBook] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationTotal, setGenerationTotal] = useState(0);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const totalWords = book.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

    const handleSaveBookDetails = async () => {
        setIsSavingBook(true);
        try {
            const response = await fetch(`/api/books/${book.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: editTitle,
                    author: editAuthor || null,
                    description: editDescription || null,
                }),
            });
            if (response.ok) {
                setBook(prev => ({
                    ...prev,
                    title: editTitle,
                    author: editAuthor || null,
                    description: editDescription || null,
                }));
                setIsEditingBook(false);
            }
        } catch (error) {
            console.error("Error saving book details:", error);
        } finally {
            setIsSavingBook(false);
        }
    };

    const handleCancelEditBook = () => {
        setEditTitle(book.title);
        setEditAuthor(book.author || "");
        setEditDescription(book.description || "");
        setIsEditingBook(false);
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingCover(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const uploadResponse = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) throw new Error("Upload fehlgeschlagen");

            const { url } = await uploadResponse.json();

            // Update book with new cover
            const updateResponse = await fetch(`/api/books/${book.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coverUrl: url }),
            });

            if (updateResponse.ok) {
                setBook(prev => ({ ...prev, coverUrl: url }));
            }
        } catch (error) {
            console.error("Error uploading cover:", error);
        } finally {
            setIsUploadingCover(false);
            if (coverInputRef.current) coverInputRef.current.value = "";
        }
    };

    const handleRemoveCover = async () => {
        try {
            const response = await fetch(`/api/books/${book.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coverUrl: null }),
            });
            if (response.ok) {
                setBook(prev => ({ ...prev, coverUrl: null }));
            }
        } catch (error) {
            console.error("Error removing cover:", error);
        }
    };

    // Generate all chapters that don't have content
    const handleGenerateAllChapters = async () => {
        if (!book.aiSettings?.apiKey) {
            alert("Bitte konfiguriere zuerst die KI-Einstellungen.");
            setActiveTab("settings");
            return;
        }

        // Find chapters without content (wordCount === 0)
        const emptyChapters = book.chapters
            .filter(ch => ch.wordCount === 0)
            .sort((a, b) => a.orderIndex - b.orderIndex);

        if (emptyChapters.length === 0) {
            alert("Alle Kapitel haben bereits Inhalt.");
            return;
        }

        setIsGeneratingAll(true);
        setGenerationProgress(0);
        setGenerationTotal(emptyChapters.length);

        try {
            for (let i = 0; i < emptyChapters.length; i++) {
                const chapter = emptyChapters[i];
                setGenerationProgress(i + 1);

                // Generate content for this chapter
                const generateResponse = await fetch(`/api/books/${book.id}/ai/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chapterId: chapter.id,
                        useSummaryAsPrompt: true,
                        targetLength: "long",
                    }),
                });

                if (!generateResponse.ok) {
                    console.error(`Failed to generate chapter ${chapter.orderIndex + 1}`);
                    continue;
                }

                const data = await generateResponse.json();
                const content = data.text; // API returns 'text', not 'content'

                // Skip if no content was generated
                if (!content) {
                    console.error(`No content generated for chapter ${chapter.orderIndex + 1}`);
                    continue;
                }

                // Save the generated content
                await fetch(`/api/books/${book.id}/chapters/${chapter.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content }),
                });

                // Update local state with new word count
                const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
                setBook(prev => ({
                    ...prev,
                    chapters: prev.chapters.map(ch =>
                        ch.id === chapter.id
                            ? { ...ch, wordCount, status: "in_progress" }
                            : ch
                    )
                }));
            }

            alert(`${emptyChapters.length} Kapitel erfolgreich generiert!`);
        } catch (error) {
            console.error("Error generating chapters:", error);
            alert("Fehler bei der Generierung. Bitte versuche es erneut.");
        } finally {
            setIsGeneratingAll(false);
            setGenerationProgress(0);
            setGenerationTotal(0);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Hero Section */}
            <div className="relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-gradient-to-br from-primary via-transparent to-chart-3" />

                <div className="relative p-6 md:p-8 flex flex-col md:flex-row gap-8">
                    {/* Cover Preview (Interactive) */}
                    <div className="flex-shrink-0 group relative w-32 md:w-40 aspect-[2/3] bg-muted rounded-lg shadow-md overflow-hidden border">
                        {book.coverUrl ? (
                            <img
                                src={book.coverUrl}
                                alt="Buchcover"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                                <div className="text-3xl text-amber-400/60 mb-2">❦</div>
                            </div>
                        )}

                        {/* Hover Overlay for Upload */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleCoverUpload}
                                className="hidden"
                                id="cover-upload-hero"
                            />
                            <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs"
                                onClick={() => coverInputRef.current?.click()}
                                disabled={isUploadingCover}
                            >
                                {isUploadingCover ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                                Cover
                            </Button>
                            {book.coverUrl && (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 text-xs"
                                    onClick={handleRemoveCover}
                                >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Löschen
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Meta Data */}
                    <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                                {isEditingBook ? (
                                    <div className="space-y-3 max-w-xl animate-in fade-in slide-in-from-top-2">
                                        <Input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            placeholder="Buchtitel"
                                            className="text-2xl md:text-3xl font-bold h-auto py-2 px-3 bg-background/50 backdrop-blur"
                                        />
                                        <Input
                                            value={editAuthor}
                                            onChange={(e) => setEditAuthor(e.target.value)}
                                            placeholder="Autor (optional)"
                                            className="text-lg h-auto py-2 px-3 bg-background/50 backdrop-blur"
                                        />
                                        <textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            placeholder="Beschreibung (optional)"
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-md border border-input bg-background/50 backdrop-blur text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                size="sm"
                                                onClick={handleSaveBookDetails}
                                                disabled={isSavingBook || !editTitle.trim()}
                                            >
                                                {isSavingBook ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Check className="mr-2 h-4 w-4" />
                                                )}
                                                Speichern
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCancelEditBook}
                                                disabled={isSavingBook}
                                            >
                                                <X className="mr-2 h-4 w-4" />
                                                Abbrechen
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-foreground">{book.title}</h1>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setIsEditingBook(true)}
                                            >
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                        {book.author && (
                                            <div className="text-lg text-muted-foreground font-medium mb-3">von {book.author}</div>
                                        )}
                                        {book.description && (
                                            <p className="text-muted-foreground max-w-2xl leading-relaxed">{book.description}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {!isEditingBook && (
                                <Button size="lg" onClick={handleCreateChapter} disabled={isCreatingChapter} className="shadow-lg shadow-primary/20">
                                    {isCreatingChapter ? (
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    ) : (
                                        <Plus className="mr-2 h-5 w-5" />
                                    )}
                                    Neues Kapitel
                                </Button>
                            )}
                        </div>

                        {/* Quick Toggles */}
                        {book.coverUrl && isEditingBook && (
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    id="hide-cover-text"
                                    checked={book.hideCoverText}
                                    onChange={async (e) => {
                                        const hideCoverText = e.target.checked;
                                        try {
                                            const response = await fetch(`/api/books/${book.id}`, {
                                                method: "PATCH",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ hideCoverText }),
                                            });
                                            if (response.ok) {
                                                setBook(prev => ({ ...prev, hideCoverText }));
                                            }
                                        } catch (error) {
                                            console.error("Error updating hideCoverText:", error);
                                        }
                                    }}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="hide-cover-text" className="text-sm cursor-pointer text-muted-foreground">
                                    Titel & Autor auf Cover ausblenden
                                </Label>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Kapitel", value: book.chapters.length, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Charaktere", value: book.characters.length, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { label: "Handlungspunkte", value: book.plotPoints.length, icon: Map, color: "text-purple-500", bg: "bg-purple-500/10" },
                    { label: "Wörter", value: totalWords.toLocaleString("de-DE"), icon: Pencil, color: "text-amber-500", bg: "bg-amber-500/10" },
                ].map((stat, i) => (
                    <Card key={stat.label} className="bg-card/50 backdrop-blur-sm border-white/5 hover:border-white/10 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardDescription className="text-sm font-medium">{stat.label}</CardDescription>
                            <div className={cn("p-2 rounded-full backdrop-blur-md", stat.bg)}>
                                <stat.icon className={cn("h-4 w-4", stat.color)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* AI Status & Batch Generation */}
            <Card className="bg-gradient-to-br from-chart-1/5 to-chart-3/5 border-chart-3/10 shadow-md">
                <CardContent className="py-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-chart-3/10 ring-1 ring-chart-3/20">
                            <Sparkles className="h-6 w-6 text-chart-3" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold">KI-Assistent</h3>
                            <p className="text-sm text-muted-foreground">
                                {book.aiSettings?.apiKey
                                    ? `Aktiv (${book.aiSettings.model}) - Dein Co-Autor ist bereit.`
                                    : "Noch nicht konfiguriert. Aktiviere die KI, um Schreibblockaden zu lösen."}
                            </p>
                        </div>
                        <Button variant="outline" onClick={() => setActiveTab("settings")}>
                            Einstellungen
                        </Button>
                    </div>

                    {/* Batch Generation Button */}
                    {book.chapters.length > 0 && book.aiSettings?.apiKey && (
                        <div className="border-t pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="font-medium">Inhalts-Generator</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {isGeneratingAll
                                            ? `Generiere Kapitel ${generationProgress} von ${generationTotal}...`
                                            : `${book.chapters.filter(ch => ch.wordCount === 0).length} Kapitel warten auf Inhalt`}
                                    </p>
                                </div>
                                <Button
                                    onClick={handleGenerateAllChapters}
                                    disabled={isGeneratingAll || book.chapters.filter(ch => ch.wordCount === 0).length === 0}
                                    className="bg-chart-3 text-white hover:bg-chart-3/90"
                                >
                                    {isGeneratingAll ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {generationProgress}/{generationTotal}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Alle generieren
                                        </>
                                    )}
                                </Button>
                            </div>
                            {isGeneratingAll && (
                                <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-chart-3 transition-all duration-300"
                                        style={{ width: `${(generationProgress / generationTotal) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Consistency Check */}
            <ConsistencyCheckPanel
                bookId={book.id}
                onNavigateToChapter={(chapterIndex) => {
                    const chapter = book.chapters[chapterIndex];
                    if (chapter) {
                        router.push(`/books/${book.id}/chapter/${chapter.id}` as Route);
                    }
                }}
            />
        </div>
    );
}
