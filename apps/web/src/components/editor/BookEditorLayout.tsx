"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    BookOpen,
    Users,
    Map,
    Globe,
    Settings,
    Sparkles,
    Plus,
    ChevronRight,
    FileText,
    Loader2,
    Eye,
    Pencil,
    Check,
    X,
    Upload,
    Trash2,
    ImageIcon,
    GripVertical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AISettingsForm from "@/components/editor/AISettingsForm";
import CharacterForm from "@/components/editor/CharacterForm";
import PlotPointForm from "@/components/editor/PlotPointForm";
import WorldElementForm from "@/components/editor/WorldElementForm";
import CharacterAIPanel, { CharacterEnhanceButton } from "@/components/editor/CharacterAIPanel";
import BookPreview from "@/components/editor/BookPreview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Chapter = {
    id: string;
    title: string;
    orderIndex: number;
    status: string;
    wordCount: number;
};

type Character = {
    id: string;
    name: string;
    role: string;
    description: string | null;
    personality: string | null;
    backstory: string | null;
    appearance: string | null;
    motivation: string | null;
    arc: string | null;
    notes: string | null;
    imageUrl: string | null;
};

type PlotPoint = {
    id: string;
    title: string;
    description: string | null;
    type: string;
    orderIndex: number;
};

type WorldElement = {
    id: string;
    name: string;
    type: string;
    description: string | null;
    imageUrl: string | null;
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
    characters: Character[];
    plotPoints: PlotPoint[];
    worldElements: WorldElement[];
    aiSettings: AISettings;
};

type Props = {
    book: Book;
};

type Tab = "overview" | "chapters" | "characters" | "plot" | "world" | "preview" | "settings";

export default function BookEditorLayout({ book: initialBook }: Props) {
    const router = useRouter();
    const [book, setBook] = useState(initialBook);
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [isCreatingChapter, setIsCreatingChapter] = useState(false);
    const [showCharacterForm, setShowCharacterForm] = useState(false);
    const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
    const [showPlotForm, setShowPlotForm] = useState(false);
    const [editingPlotPoint, setEditingPlotPoint] = useState<PlotPoint | null>(null);
    const [showWorldForm, setShowWorldForm] = useState(false);
    const [editingWorldElement, setEditingWorldElement] = useState<WorldElement | null>(null);

    // Book editing state
    const [isEditingBook, setIsEditingBook] = useState(false);
    const [editTitle, setEditTitle] = useState(book.title);
    const [editAuthor, setEditAuthor] = useState(book.author || "");
    const [editDescription, setEditDescription] = useState(book.description || "");
    const [isSavingBook, setIsSavingBook] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
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

    const handleChapterReorder = async (result: DropResult) => {
        if (!result.destination) return;
        if (result.source.index === result.destination.index) return;

        const reorderedChapters = Array.from(book.chapters);
        const [removed] = reorderedChapters.splice(result.source.index, 1);
        reorderedChapters.splice(result.destination.index, 0, removed);

        // Update order indexes locally
        const updatedChapters = reorderedChapters.map((ch, idx) => ({
            ...ch,
            orderIndex: idx,
        }));

        // Optimistic update
        setBook(prev => ({ ...prev, chapters: updatedChapters }));

        // Save to API
        try {
            await fetch(`/api/books/${book.id}/chapters`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chapterIds: updatedChapters.map(ch => ch.id),
                }),
            });
        } catch (error) {
            console.error("Error reordering chapters:", error);
            // Revert on error
            setBook(prev => ({ ...prev, chapters: book.chapters }));
        }
    };

    const handleCharacterSave = (savedCharacter: Character) => {
        if (editingCharacter) {
            // Update existing character in state
            setBook(prev => ({
                ...prev,
                characters: prev.characters.map(c =>
                    c.id === savedCharacter.id ? savedCharacter : c
                )
            }));
        } else {
            // Add new character to state
            setBook(prev => ({
                ...prev,
                characters: [...prev.characters, savedCharacter]
            }));
        }
        setShowCharacterForm(false);
        setEditingCharacter(null);
    };

    const handleCharacterDelete = async (characterId: string) => {
        if (!confirm("Möchtest du diesen Charakter wirklich löschen?")) return;
        try {
            await fetch(`/api/books/${book.id}/characters/${characterId}`, {
                method: "DELETE",
            });
            setBook(prev => ({
                ...prev,
                characters: prev.characters.filter(c => c.id !== characterId)
            }));
        } catch (error) {
            console.error("Error deleting character:", error);
        }
    };

    // PlotPoint handlers
    const handlePlotPointSave = (savedPlotPoint: PlotPoint) => {
        if (editingPlotPoint) {
            setBook(prev => ({
                ...prev,
                plotPoints: prev.plotPoints.map(p =>
                    p.id === savedPlotPoint.id ? savedPlotPoint : p
                )
            }));
        } else {
            setBook(prev => ({
                ...prev,
                plotPoints: [...prev.plotPoints, savedPlotPoint]
            }));
        }
        setShowPlotForm(false);
        setEditingPlotPoint(null);
    };

    const handlePlotPointDelete = async (plotPointId: string) => {
        if (!confirm("Möchtest du diesen Handlungspunkt wirklich löschen?")) return;
        try {
            await fetch(`/api/books/${book.id}/plot/${plotPointId}`, {
                method: "DELETE",
            });
            setBook(prev => ({
                ...prev,
                plotPoints: prev.plotPoints.filter(p => p.id !== plotPointId)
            }));
        } catch (error) {
            console.error("Error deleting plot point:", error);
        }
    };

    // WorldElement handlers
    const handleWorldElementSave = (savedWorldElement: WorldElement) => {
        if (editingWorldElement) {
            setBook(prev => ({
                ...prev,
                worldElements: prev.worldElements.map(w =>
                    w.id === savedWorldElement.id ? savedWorldElement : w
                )
            }));
        } else {
            setBook(prev => ({
                ...prev,
                worldElements: [...prev.worldElements, savedWorldElement]
            }));
        }
        setShowWorldForm(false);
        setEditingWorldElement(null);
    };

    const handleWorldElementDelete = async (worldElementId: string) => {
        if (!confirm("Möchtest du dieses Weltelement wirklich löschen?")) return;
        try {
            await fetch(`/api/books/${book.id}/world/${worldElementId}`, {
                method: "DELETE",
            });
            setBook(prev => ({
                ...prev,
                worldElements: prev.worldElements.filter(w => w.id !== worldElementId)
            }));
        } catch (error) {
            console.error("Error deleting world element:", error);
        }
    };

    const handleCreateChapter = async () => {
        setIsCreatingChapter(true);
        try {
            const response = await fetch(`/api/books/${book.id}/chapters`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            if (response.ok) {
                const chapter = await response.json();
                router.push(`/books/${book.id}/chapter/${chapter.id}` as Route);
            }
        } catch (error) {
            console.error("Error creating chapter:", error);
        } finally {
            setIsCreatingChapter(false);
        }
    };

    const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
        { id: "overview", label: "Übersicht", icon: BookOpen },
        { id: "chapters", label: "Kapitel", icon: FileText },
        { id: "characters", label: "Charaktere", icon: Users },
        { id: "plot", label: "Handlung", icon: Map },
        { id: "world", label: "Welt", icon: Globe },
        { id: "preview", label: "Vorschau", icon: Eye },
        { id: "settings", label: "Einstellungen", icon: Settings },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-500/20 text-green-600 dark:text-green-400";
            case "in_progress": return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400";
            case "review": return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
            default: return "bg-muted text-muted-foreground";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "completed": return "Fertig";
            case "in_progress": return "In Arbeit";
            case "review": return "Review";
            default: return "Entwurf";
        }
    };

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <aside className="w-72 border-r border-sidebar-border bg-sidebar/50 backdrop-blur-xl flex flex-col z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-all">
                <div className="p-5 border-b border-sidebar-border/50">
                    <Link href={"/books" as Route} className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-4 group">
                        <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                        Zurück zur Übersicht
                    </Link>
                    <h2 className="font-serif font-bold text-xl tracking-tight text-sidebar-foreground line-clamp-2">{book.title}</h2>
                    {book.genre && (
                        <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border">
                            {book.genre}
                        </span>
                    )}
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
                                )}
                                <tab.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-sidebar-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Quick Stats */}
                <div className="p-4 border-t space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                        <span>Kapitel</span>
                        <span className="font-medium">{book.chapters.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Charaktere</span>
                        <span className="font-medium">{book.characters.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Wörter</span>
                        <span className="font-medium">{totalWords.toLocaleString("de-DE")}</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-secondary/30 relative">
                {/* Decorative background elements */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
                    style={{ backgroundImage: `radial-gradient(circle at 2px 2px, black 1px, transparent 0)`, backgroundSize: '24px 24px' }}
                />

                <div className="relative p-8 max-w-7xl mx-auto animate-fade-in">
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                {isEditingBook ? (
                                    <div className="flex-1 space-y-3">
                                        <Input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            placeholder="Buchtitel"
                                            className="text-2xl font-bold h-auto py-1"
                                        />
                                        <Input
                                            value={editAuthor}
                                            onChange={(e) => setEditAuthor(e.target.value)}
                                            placeholder="Autor (optional)"
                                            className="h-auto py-1"
                                        />
                                        <textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            placeholder="Beschreibung (optional)"
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                        <div className="flex gap-2">
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
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-2xl font-bold">{book.title}</h1>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setIsEditingBook(true)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {book.author && (
                                            <p className="text-sm text-muted-foreground">von {book.author}</p>
                                        )}
                                        {book.description && (
                                            <p className="text-muted-foreground mt-2">{book.description}</p>
                                        )}
                                    </div>
                                )}
                                <Button onClick={handleCreateChapter} disabled={isCreatingChapter}>
                                    {isCreatingChapter ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="mr-2 h-4 w-4" />
                                    )}
                                    Neues Kapitel
                                </Button>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: "Kapitel", value: book.chapters.length, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
                                    { label: "Charaktere", value: book.characters.length, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                                    { label: "Handlungspunkte", value: book.plotPoints.length, icon: Map, color: "text-purple-500", bg: "bg-purple-500/10" },
                                    { label: "Wörter", value: totalWords.toLocaleString("de-DE"), icon: Pencil, color: "text-amber-500", bg: "bg-amber-500/10" },
                                ].map((stat, i) => (
                                    <Card key={stat.label} className="glass-card border-none shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                            <CardDescription className="text-sm font-medium">{stat.label}</CardDescription>
                                            <div className={cn("p-2 rounded-full", stat.bg)}>
                                                <stat.icon className={cn("h-4 w-4", stat.color)} />
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Book Cover */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Buchcover</CardTitle>
                                    <CardDescription>Lade ein eigenes Cover hoch</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-6 items-start">
                                        {/* Cover Preview */}
                                        <div className="relative w-32 h-48 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                                            {book.coverUrl ? (
                                                <img
                                                    src={book.coverUrl}
                                                    alt="Buchcover"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                                    <div className="text-2xl text-amber-400/60 mb-2">❦</div>
                                                    <span className="text-xs text-stone-500 font-serif line-clamp-3">
                                                        {book.title}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Upload Controls */}
                                        <div className="space-y-3">
                                            <input
                                                ref={coverInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                onChange={handleCoverUpload}
                                                className="hidden"
                                                id="cover-upload"
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => coverInputRef.current?.click()}
                                                disabled={isUploadingCover}
                                            >
                                                {isUploadingCover ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Upload className="mr-2 h-4 w-4" />
                                                )}
                                                Cover hochladen
                                            </Button>
                                            {book.coverUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleRemoveCover}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Entfernen
                                                </Button>
                                            )}

                                            {book.coverUrl && (
                                                <div className="flex items-center gap-2">
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
                                                    <Label htmlFor="hide-cover-text" className="text-sm cursor-pointer">
                                                        Titel & Autor ausblenden
                                                    </Label>
                                                </div>
                                            )}

                                            <p className="text-xs text-muted-foreground">
                                                JPG, PNG, WebP oder GIF.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* AI Status */}
                            <Card className="bg-gradient-to-br from-chart-1/10 to-chart-3/10 border-chart-3/20">
                                <CardContent className="flex items-center gap-4 py-4">
                                    <div className="p-3 rounded-full bg-chart-3/20">
                                        <Sparkles className="h-5 w-5 text-chart-3" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium">KI-Unterstützung</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {book.aiSettings?.apiKey
                                                ? `Konfiguriert (${book.aiSettings.model})`
                                                : "Nicht konfiguriert - Gehe zu Einstellungen"}
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setActiveTab("settings")}>
                                        Konfigurieren
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    {/* End Main Content Wrapper */}


                    {activeTab === "chapters" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-bold">Kapitel</h1>
                                <Button onClick={handleCreateChapter} disabled={isCreatingChapter}>
                                    {isCreatingChapter ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="mr-2 h-4 w-4" />
                                    )}
                                    Neues Kapitel
                                </Button>
                            </div>
                            {book.chapters.length === 0 ? (
                                <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center py-12">
                                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="font-semibold mb-2">Noch keine Kapitel</h3>
                                        <p className="text-muted-foreground text-center max-w-sm mb-4">
                                            Beginne mit dem Schreiben deines ersten Kapitels.
                                        </p>
                                        <Button onClick={handleCreateChapter} disabled={isCreatingChapter}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Erstes Kapitel erstellen
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <DragDropContext onDragEnd={handleChapterReorder}>
                                    <Droppable droppableId="chapters">
                                        {(provided) => (
                                            <div
                                                className="space-y-2"
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                            >
                                                {book.chapters.map((chapter, index) => (
                                                    <Draggable
                                                        key={chapter.id}
                                                        draggableId={chapter.id}
                                                        index={index}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={snapshot.isDragging ? "opacity-90" : ""}
                                                            >
                                                                <Card
                                                                    className={`transition-colors cursor-pointer ${snapshot.isDragging ? "bg-accent shadow-lg" : "hover:bg-accent/50"}`}
                                                                    onClick={() => router.push(`/books/${book.id}/chapter/${chapter.id}` as Route)}
                                                                >
                                                                    <CardContent className="flex items-center justify-between py-4 px-4">
                                                                        <div className="flex items-center gap-4">
                                                                            <div
                                                                                {...provided.dragHandleProps}
                                                                                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <GripVertical className="h-5 w-5" />
                                                                            </div>
                                                                            <span className="text-xl font-bold text-muted-foreground w-10">
                                                                                {chapter.orderIndex + 1}
                                                                            </span>
                                                                            <div>
                                                                                <h3 className="font-medium">{chapter.title}</h3>
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    {chapter.wordCount.toLocaleString("de-DE")} Wörter
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(chapter.status)}`}>
                                                                                {getStatusLabel(chapter.status)}
                                                                            </span>
                                                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            )}
                        </div>
                    )}

                    {activeTab === "characters" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-bold">Charaktere</h1>
                                <Button onClick={() => setShowCharacterForm(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Neuer Charakter
                                </Button>
                            </div>
                            {book.characters.length === 0 ? (
                                <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center py-12">
                                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="font-semibold mb-2">Noch keine Charaktere</h3>
                                        <p className="text-muted-foreground text-center max-w-sm mb-4">
                                            Erstelle deine ersten Charaktere für dein Buch.
                                        </p>
                                        <Button onClick={() => setShowCharacterForm(true)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Ersten Charakter erstellen
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {book.characters.map((character) => (
                                        <Card
                                            key={character.id}
                                            className="hover:shadow-md transition-shadow cursor-pointer group"
                                            onClick={() => {
                                                setEditingCharacter(character as unknown as Character);
                                                setShowCharacterForm(true);
                                            }}
                                        >
                                            <CardContent className="pt-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-chart-1 to-chart-3 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                                                        {character.imageUrl ? (
                                                            <img
                                                                src={character.imageUrl}
                                                                alt={character.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            character.name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold">{character.name}</h3>
                                                        <span className="text-xs text-muted-foreground capitalize">
                                                            {character.role === "protagonist" && "Protagonist"}
                                                            {character.role === "antagonist" && "Antagonist"}
                                                            {character.role === "supporting" && "Nebenrolle"}
                                                            {character.role === "minor" && "Kleine Rolle"}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCharacterDelete(character.id);
                                                        }}
                                                    >
                                                        <span className="text-destructive text-xs">Löschen</span>
                                                    </Button>
                                                </div>
                                                {/* AI Enhance Button */}
                                                <div className="mt-2 pt-2 border-t">
                                                    <CharacterEnhanceButton
                                                        bookId={book.id}
                                                        character={character as unknown as Character}
                                                        onUpdate={(updated) => {
                                                            setBook(prev => ({
                                                                ...prev,
                                                                characters: prev.characters.map(c =>
                                                                    c.id === updated.id ? updated : c
                                                                ),
                                                            }));
                                                        }}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* AI Character Assistant */}
                            <CharacterAIPanel
                                bookId={book.id}
                                onCharacterCreated={(newChar) => {
                                    setBook(prev => ({
                                        ...prev,
                                        characters: [...prev.characters, newChar],
                                    }));
                                }}
                                onCharacterUpdated={(updated) => {
                                    setBook(prev => ({
                                        ...prev,
                                        characters: prev.characters.map(c =>
                                            c.id === updated.id ? updated : c
                                        ),
                                    }));
                                }}
                            />
                        </div>
                    )}

                    {activeTab === "plot" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-bold">Handlung</h1>
                                <Button onClick={() => setShowPlotForm(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Neuer Handlungspunkt
                                </Button>
                            </div>
                            {book.plotPoints.length === 0 ? (
                                <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center py-12">
                                        <Map className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="font-semibold mb-2">Noch keine Handlungspunkte</h3>
                                        <p className="text-muted-foreground text-center max-w-sm mb-4">
                                            Plane deine Storyline mit Handlungspunkten.
                                        </p>
                                        <Button onClick={() => setShowPlotForm(true)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Ersten Handlungspunkt erstellen
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {book.plotPoints.map((point, index) => (
                                        <Card
                                            key={point.id}
                                            className="hover:shadow-md transition-shadow cursor-pointer group"
                                            onClick={() => {
                                                setEditingPlotPoint(point);
                                                setShowPlotForm(true);
                                            }}
                                        >
                                            <CardContent className="flex items-center gap-4 py-4">
                                                <div className="h-8 w-8 rounded-full bg-chart-3/20 flex items-center justify-center text-chart-3 font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-medium">{point.title}</h3>
                                                    <span className="text-xs text-muted-foreground capitalize">
                                                        {point.type.replace("_", " ")}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePlotPointDelete(point.id);
                                                    }}
                                                >
                                                    <span className="text-destructive text-xs">Löschen</span>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "world" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-bold">Welt</h1>
                                <Button onClick={() => setShowWorldForm(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Neues Element
                                </Button>
                            </div>
                            {book.worldElements.length === 0 ? (
                                <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center py-12">
                                        <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="font-semibold mb-2">Noch keine Weltelemente</h3>
                                        <p className="text-muted-foreground text-center max-w-sm mb-4">
                                            Beschreibe Orte, Gegenstände und Konzepte deiner Welt.
                                        </p>
                                        <Button onClick={() => setShowWorldForm(true)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Erstes Element erstellen
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {book.worldElements.map((element) => (
                                        <Card
                                            key={element.id}
                                            className="hover:shadow-md transition-shadow cursor-pointer group"
                                            onClick={() => {
                                                setEditingWorldElement(element as unknown as WorldElement);
                                                setShowWorldForm(true);
                                            }}
                                        >
                                            <CardContent className="pt-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg bg-secondary">
                                                        <Globe className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold">{element.name}</h3>
                                                        <span className="text-xs text-muted-foreground capitalize">
                                                            {element.type}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleWorldElementDelete(element.id);
                                                        }}
                                                    >
                                                        <span className="text-destructive text-xs">Löschen</span>
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "preview" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-bold">Buch-Vorschau</h1>
                            </div>
                            {book.chapters.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="font-semibold mb-2">Keine Kapitel zum Anzeigen</h3>
                                    <p className="text-muted-foreground max-w-md">
                                        Erstelle zuerst Kapitel, um eine Buchvorschau zu sehen.
                                    </p>
                                </div>
                            ) : (
                                <BookPreview
                                    bookId={book.id}
                                    bookTitle={book.title}
                                    author={book.author || "Autor"}
                                    language={book.language}
                                    coverUrl={book.coverUrl}
                                    hideCoverText={book.hideCoverText}
                                    chapters={book.chapters.map(ch => ({
                                        id: ch.id,
                                        title: ch.title,
                                        content: "",
                                        orderIndex: ch.orderIndex,
                                    }))}
                                />
                            )}
                        </div>
                    )}

                    {activeTab === "settings" && (
                        <div className="space-y-6 max-w-2xl">
                            <h1 className="text-2xl font-bold">Einstellungen</h1>

                            <AISettingsForm
                                bookId={book.id}
                                initialSettings={book.aiSettings}
                            />

                            <Card>
                                <CardHeader>
                                    <CardTitle>Buch-Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Titel</span>
                                        <span className="font-medium">{book.title}</span>
                                    </div>
                                    {book.genre && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Genre</span>
                                            <span className="font-medium">{book.genre}</span>
                                        </div>
                                    )}
                                    {book.targetAudience && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Zielgruppe</span>
                                            <span className="font-medium">{book.targetAudience}</span>
                                        </div>
                                    )}
                                    {book.writingStyle && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Schreibstil</span>
                                            <span className="font-medium">{book.writingStyle}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Sprache</span>
                                        <span className="font-medium">{book.language === "de" ? "Deutsch" : book.language}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </main>

            {/* Character Form Modal */}
            {showCharacterForm && (
                <CharacterForm
                    bookId={book.id}
                    character={editingCharacter || undefined}
                    onSave={handleCharacterSave}
                    onCancel={() => {
                        setShowCharacterForm(false);
                        setEditingCharacter(null);
                    }}
                />
            )}

            {/* PlotPoint Form Modal */}
            {showPlotForm && (
                <PlotPointForm
                    bookId={book.id}
                    plotPoint={editingPlotPoint || undefined}
                    onSave={handlePlotPointSave}
                    onCancel={() => {
                        setShowPlotForm(false);
                        setEditingPlotPoint(null);
                    }}
                />
            )}

            {/* WorldElement Form Modal */}
            {showWorldForm && (
                <WorldElementForm
                    bookId={book.id}
                    worldElement={editingWorldElement || undefined}
                    onSave={handleWorldElementSave}
                    onCancel={() => {
                        setShowWorldForm(false);
                        setEditingWorldElement(null);
                    }}
                />
            )}
        </div>
    );
}
