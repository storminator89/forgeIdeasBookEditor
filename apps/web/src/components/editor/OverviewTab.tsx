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
import { useI18n } from "@/components/locale-provider";

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
    const { t, intlLocale } = useI18n();
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
    const pendingChapters = book.chapters.filter(ch => ch.wordCount === 0).length;

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

            if (!uploadResponse.ok) throw new Error("Upload failed");

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
            alert(t({ de: "Bitte konfiguriere zuerst die KI-Einstellungen.", en: "Please configure the AI settings first." }));
            setActiveTab("settings");
            return;
        }

        // Find chapters without content (wordCount === 0)
        const emptyChapters = book.chapters
            .filter(ch => ch.wordCount === 0)
            .sort((a, b) => a.orderIndex - b.orderIndex);

        if (emptyChapters.length === 0) {
            alert(t({ de: "Alle Kapitel haben bereits Inhalt.", en: "All chapters already have content." }));
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
                const wordCount = content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
                setBook(prev => ({
                    ...prev,
                    chapters: prev.chapters.map(ch =>
                        ch.id === chapter.id
                            ? { ...ch, wordCount, status: "in_progress" }
                            : ch
                    )
                }));
            }

            alert(t({
                de: "{{count}} Kapitel erfolgreich generiert!",
                en: "{{count}} chapters generated successfully!",
            }, { count: emptyChapters.length }));
        } catch (error) {
            console.error("Error generating chapters:", error);
            alert(t({ de: "Fehler bei der Generierung. Bitte versuche es erneut.", en: "Error during generation. Please try again." }));
        } finally {
            setIsGeneratingAll(false);
            setGenerationProgress(0);
            setGenerationTotal(0);
        }
    };

    const stats = [
        { label: t({ de: "Kapitel", en: "Chapters" }), value: book.chapters.length, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: t({ de: "Charaktere", en: "Characters" }), value: book.characters.length, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: t({ de: "Handlungspunkte", en: "Plot points" }), value: book.plotPoints.length, icon: Map, color: "text-purple-500", bg: "bg-purple-500/10" },
        { label: t({ de: "Wörter", en: "Words" }), value: new Intl.NumberFormat(intlLocale).format(totalWords), icon: Pencil, color: "text-amber-500", bg: "bg-amber-500/10" },
    ];

    const pendingLabel = pendingChapters === 1
        ? t({ de: "1 Kapitel wartet auf Inhalt", en: "1 chapter is waiting for content" })
        : t({ de: "{{count}} Kapitel warten auf Inhalt", en: "{{count}} chapters are waiting for content" }, { count: pendingChapters });
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Hero Section */}
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 dark:bg-card/35 backdrop-blur-md shadow-xl paper-texture">
                {/* Candlelight Pulsing Ambience */}
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-tr from-primary/10 via-transparent to-primary/5" />
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/35 via-primary/80 to-primary/35 rounded-l-full" />

                <div className="relative p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    {/* Cover Preview (Tactile 3D notebook) */}
                    <motion.div
                        whileHover={{ y: -6, rotateY: -6, rotateX: 2, scale: 1.025 }}
                        transition={{ type: "spring", stiffness: 140, damping: 14 }}
                        className="flex-shrink-0 group relative w-36 md:w-40 aspect-[2/3] bg-background rounded-lg shadow-xl overflow-hidden border border-border/30 cursor-pointer [transform-style:preserve-3d] [perspective:1000px]"
                    >
                        {/* Book Binding Edge Spine Accent */}
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/25 dark:bg-black/35 border-r border-white/5 z-10" />
                        <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-white/10 z-10" />

                        {book.coverUrl ? (
                            <img
                                src={book.coverUrl}
                                alt={t({ de: "Buchcover", en: "Book cover" })}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                                <div className="text-3xl text-primary/40 font-serif font-black mb-2 select-none">🕮</div>
                                <span className="text-[9px] uppercase tracking-widest font-black text-muted-foreground/40">{t({ de: "Kein Cover", en: "No Cover" })}</span>
                            </div>
                        )}

                        {/* Hover Overlay for Upload */}
                        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 z-20">
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
                                className="h-8 text-[10px] font-serif uppercase tracking-wider rounded-lg"
                                onClick={() => coverInputRef.current?.click()}
                                disabled={isUploadingCover}
                            >
                                {isUploadingCover ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1 text-primary" />}
                                {t({ de: "Cover", en: "Cover" })}
                            </Button>
                            {book.coverUrl && (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 text-[10px] font-serif uppercase tracking-wider rounded-lg"
                                    onClick={handleRemoveCover}
                                >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    {t({ de: "Löschen", en: "Remove" })}
                                </Button>
                            )}
                        </div>
                    </motion.div>

                    {/* Meta Data */}
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                {isEditingBook ? (
                                    <div className="space-y-3 max-w-xl animate-in fade-in slide-in-from-top-2">
                                        <Input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            placeholder={t({ de: "Buchtitel", en: "Book title" })}
                                            className="text-xl font-serif font-bold h-auto py-2 px-3 bg-background/55 border-border/40 rounded-xl"
                                        />
                                        <Input
                                            value={editAuthor}
                                            onChange={(e) => setEditAuthor(e.target.value)}
                                            placeholder={t({ de: "Autor (optional)", en: "Author (optional)" })}
                                            className="text-sm font-serif h-auto py-2 px-3 bg-background/55 border-border/40 rounded-xl"
                                        />
                                        <textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            placeholder={t({ de: "Beschreibung (optional)", en: "Description (optional)" })}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-xl border border-border/40 bg-background/55 text-xs font-serif resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                                        />
                                        <div className="flex gap-2 justify-center md:justify-start pt-1">
                                            <Button
                                                size="sm"
                                                onClick={handleSaveBookDetails}
                                                disabled={isSavingBook || !editTitle.trim()}
                                                className="rounded-lg h-8 text-[11px] font-serif uppercase tracking-wider bg-primary text-primary-foreground"
                                            >
                                                {isSavingBook ? (
                                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Check className="mr-1.5 h-3.5 w-3.5" />
                                                )}
                                                {t({ de: "Speichern", en: "Save" })}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCancelEditBook}
                                                disabled={isSavingBook}
                                                className="rounded-lg h-8 text-[11px] font-serif uppercase tracking-wider border-border/55"
                                            >
                                                <X className="mr-1.5 h-3.5 w-3.5" />
                                                {t({ de: "Abbrechen", en: "Cancel" })}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group">
                                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                            <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-foreground">{book.title}</h1>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-secondary/45"
                                                onClick={() => setIsEditingBook(true)}
                                            >
                                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                        </div>
                                        {book.author && (
                                            <div className="text-sm text-primary font-serif font-medium tracking-wide mb-3 uppercase">
                                                {t({ de: "von", en: "by" })} {book.author}
                                            </div>
                                        )}
                                        {book.description && (
                                            <p className="text-xs font-serif text-muted-foreground max-w-2xl leading-relaxed italic border-l-2 border-border/30 pl-4 py-1 text-left">
                                                {book.description}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {!isEditingBook && (
                                <Button 
                                    size="lg" 
                                    onClick={handleCreateChapter} 
                                    disabled={isCreatingChapter} 
                                    className="shadow-lg shadow-primary/10 rounded-xl h-11 px-5 text-xs font-serif font-bold uppercase tracking-wider cursor-pointer"
                                >
                                    {isCreatingChapter ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="mr-2 h-4 w-4 text-white" />
                                    )}
                                    {t({ de: "Neues Kapitel", en: "New chapter" })}
                                </Button>
                            )}
                        </div>

                        {/* Quick Toggles */}
                        {book.coverUrl && isEditingBook && (
                            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
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
                                    className="h-3.5 w-3.5 rounded border-border/40 focus:ring-primary/45"
                                />
                                <Label htmlFor="hide-cover-text" className="text-[11px] font-serif cursor-pointer text-muted-foreground">
                                    {t({ de: "Titel & Autor auf Cover ausblenden", en: "Hide title & author on cover" })}
                                </Label>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
                {stats.map((stat) => (
                    <Card key={stat.label} className="relative bg-card/45 dark:bg-card/25 backdrop-blur-md border border-border/40 hover:border-primary/40 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group paper-texture">
                        {/* Ambient Pulsing hover element */}
                        <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors duration-500" />
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-primary/50 transition-colors duration-300" />
                        
                        <CardHeader className="pb-2.5 flex flex-row items-center justify-between space-y-0 relative z-10">
                            <CardDescription className="text-[11px] font-serif font-black uppercase tracking-wider text-muted-foreground/80">{stat.label}</CardDescription>
                            <div className={cn("p-2 rounded-xl backdrop-blur-md border border-border/20 shadow-sm transition-all duration-300 group-hover:scale-105", stat.bg)}>
                                <stat.icon className={cn("h-4 w-4", stat.color)} />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-2xl font-serif font-black tracking-tight text-foreground">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* AI Status & Batch Generation */}
            <Card className="relative overflow-hidden bg-card/45 dark:bg-card/25 backdrop-blur-md border border-border/40 shadow-lg paper-texture">
                <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -right-16 -top-16 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                
                <CardContent className="py-6 space-y-6 relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shadow-sm flex-shrink-0 animate-pulse">
                                <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-serif font-black text-foreground">{t({ de: "KI-Co-Autor", en: "AI Co-Author" })}</h3>
                                <p className="text-xs font-serif text-muted-foreground leading-relaxed">
                                    {book.aiSettings?.apiKey
                                        ? t({
                                            de: "Aktiviert und bereit auf dem Modell {{model}}.",
                                            en: "Activated and running on model {{model}}.",
                                        }, { model: book.aiSettings.model })
                                        : t({
                                            de: "Noch nicht konfiguriert. Aktiviere deinen Schreibpartner in den Einstellungen.",
                                            en: "Not configured yet. Enable your co-author helper in settings.",
                                        })}
                                </p>
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => setActiveTab("settings")}
                            className="rounded-lg h-9 text-xs font-serif uppercase tracking-wider border-border/50 hover:bg-secondary/45"
                        >
                            {t({ de: "Einstellungen", en: "Settings" })}
                        </Button>
                    </div>

                    {/* Batch Generation Button */}
                    {book.chapters.length > 0 && book.aiSettings?.apiKey && (
                        <div className="border-t border-border/30 pt-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t({ de: "Inhalts-Generator", en: "Content generator" })}</h4>
                                    <p className="text-xs font-serif text-muted-foreground italic">
                                        {isGeneratingAll
                                            ? t({
                                                de: "Generiere Kapitel {{current}} von {{total}}...",
                                                en: "Generating chapter {{current}} of {{total}}...",
                                            }, { current: generationProgress, total: generationTotal })
                                            : pendingLabel}
                                    </p>
                                </div>
                                <Button
                                    onClick={handleGenerateAllChapters}
                                    disabled={isGeneratingAll || pendingChapters === 0}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/10 rounded-xl h-10 px-4 text-xs font-serif font-bold uppercase tracking-wider cursor-pointer"
                                >
                                    {isGeneratingAll ? (
                                        <>
                                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                            {generationProgress}/{generationTotal}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-3.5 w-3.5 text-white animate-pulse" />
                                            {t({ de: "Alle generieren", en: "Generate all" })}
                                        </>
                                    )}
                                </Button>
                            </div>
                            {isGeneratingAll && (
                                <div className="mt-4 h-1.5 bg-secondary/50 rounded-full overflow-hidden border border-border/20">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-300 rounded-full"
                                        style={{ width: `${(generationProgress / generationTotal) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Consistency Check */}
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/35 backdrop-blur-md shadow-md paper-texture p-1">
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
        </div>
    );
}
