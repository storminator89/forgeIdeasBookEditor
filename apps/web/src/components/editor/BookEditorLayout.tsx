"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    BookOpen,
    Users,
    Map,
    Globe,
    Settings,
    Plus,
    FileText,
    Loader2,
    Eye,
    Pencil,
    Trash2,
    GripVertical,
    LayoutGrid,
    GitBranch,
    Link2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AISettingsForm from "@/components/editor/AISettingsForm";
import CharacterForm from "@/components/editor/CharacterForm";
import PlotPointForm from "@/components/editor/PlotPointForm";
import WorldElementForm from "@/components/editor/WorldElementForm";
import CharacterAIPanel from "@/components/editor/CharacterAIPanel";
import BookPreview from "@/components/editor/BookPreview";
import CharacterRelationModal from "@/components/editor/CharacterRelationModal";
import CharacterRelationshipGraph from "@/components/editor/CharacterRelationshipGraph";
import GlobalSearch from "@/components/editor/GlobalSearch";
import OverviewTab from "@/components/editor/OverviewTab";

type Chapter = {
    id: string;
    title: string;
    orderIndex: number;
    status: string;
    wordCount: number;
};

type CharacterRelation = {
    id: string;
    relationType: string;
    description: string | null;
    relatedCharacter: {
        id: string;
        name: string;
        role: string;
        imageUrl: string | null;
    };
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
    relationsFrom?: CharacterRelation[];
    relationsTo?: Array<{
        id: string;
        relationType: string;
        description: string | null;
        character: {
            id: string;
            name: string;
            role: string;
            imageUrl: string | null;
        };
    }>;
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

    // Chapter state
    const [isCreatingChapter, setIsCreatingChapter] = useState(false);

    // Entity Editing State
    const [showCharacterForm, setShowCharacterForm] = useState(false);
    const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
    const [showPlotForm, setShowPlotForm] = useState(false);
    const [editingPlotPoint, setEditingPlotPoint] = useState<PlotPoint | null>(null);
    const [showWorldForm, setShowWorldForm] = useState(false);
    const [editingWorldElement, setEditingWorldElement] = useState<WorldElement | null>(null);

    // Character relationships state
    const [characterViewMode, setCharacterViewMode] = useState<"cards" | "graph">("cards");
    const [showRelationModal, setShowRelationModal] = useState(false);
    const [editingRelationsCharacter, setEditingRelationsCharacter] = useState<Character | null>(null);

    const totalWords = book.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

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
            setBook(prev => ({
                ...prev,
                characters: prev.characters.map(c =>
                    c.id === savedCharacter.id ? savedCharacter : c
                )
            }));
        } else {
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
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-secondary/10 blur-[100px]" />
            </div>

            {/* Sidebar */}
            <aside className="w-72 border-r border-border/50 bg-background/60 backdrop-blur-xl flex flex-col z-20 shadow-xl transition-all">
                <div className="p-6 border-b border-border/50">
                    <Link href={"/books" as Route} className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mb-6 group">
                        <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                        Zurück zur Bibliothek
                    </Link>
                    <h2 className="font-serif font-bold text-xl tracking-tight text-foreground line-clamp-2 leading-tight">{book.title}</h2>
                    {book.genre && (
                        <span className="inline-flex items-center mt-3 px-2.5 py-1 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-border/50">
                            {book.genre}
                        </span>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                        : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                                )}
                                <tab.icon className={cn("h-4.5 w-4.5 transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Global Search */}
                <div className="px-4 py-3 border-t border-border/50 bg-secondary/20">
                    <GlobalSearch
                        bookId={book.id}
                        onNavigateToChapter={(chapterId) => {
                            router.push(`/books/${book.id}/chapter/${chapterId}` as Route);
                        }}
                        onNavigateToTab={(tab, itemId) => {
                            setActiveTab(tab as Tab);
                            if (itemId) {
                                // Wait for tab switch then open modal
                                setTimeout(() => {
                                    if (tab === "characters") {
                                        const character = book.characters.find(c => c.id === itemId);
                                        if (character) {
                                            setEditingCharacter(character as unknown as Character);
                                            setShowCharacterForm(true);
                                        }
                                    } else if (tab === "plot") {
                                        const plotPoint = book.plotPoints.find(p => p.id === itemId);
                                        if (plotPoint) {
                                            setEditingPlotPoint(plotPoint);
                                            setShowPlotForm(true);
                                        }
                                    } else if (tab === "world") {
                                        const element = book.worldElements.find(e => e.id === itemId);
                                        if (element) {
                                            setEditingWorldElement(element as unknown as WorldElement);
                                            setShowWorldForm(true);
                                        }
                                    }
                                }, 100);
                            }
                        }}
                    />
                </div>

                {/* Quick Stats */}
                <div className="p-4 border-t border-border/50 space-y-3 text-xs text-muted-foreground bg-background/40">
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> Kapitel</span>
                        <span className="font-medium text-foreground">{book.chapters.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> Charaktere</span>
                        <span className="font-medium text-foreground">{book.characters.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><Pencil className="h-3 w-3" /> Wörter</span>
                        <span className="font-medium text-foreground">{totalWords.toLocaleString("de-DE")}</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative z-10 scrollbar-hide">
                <div className="relative p-8 md:p-10 max-w-6xl mx-auto min-h-screen">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === "overview" && (
                                <OverviewTab
                                    book={book}
                                    setBook={setBook}
                                    setActiveTab={setActiveTab}
                                    handleCreateChapter={handleCreateChapter}
                                    isCreatingChapter={isCreatingChapter}
                                />
                            )}

                            {activeTab === "chapters" && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold font-serif">Kapitelübersicht</h2>
                                        <Button onClick={handleCreateChapter} disabled={isCreatingChapter} className="shadow-lg shadow-primary/20">
                                            {isCreatingChapter ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Plus className="mr-2 h-4 w-4" />
                                            )}
                                            Neues Kapitel
                                        </Button>
                                    </div>

                                    <Card className="bg-card/50 backdrop-blur-sm border-white/5">
                                        <CardContent className="p-0">
                                            <div className="rounded-lg overflow-hidden">
                                                <div className="grid grid-cols-12 gap-4 p-4 text-xs font-medium text-muted-foreground bg-secondary/30 border-b border-border/50">
                                                    <div className="col-span-1"></div>
                                                    <div className="col-span-1">#</div>
                                                    <div className="col-span-6">Titel</div>
                                                    <div className="col-span-2">Status</div>
                                                    <div className="col-span-2 text-right">Wörter</div>
                                                </div>

                                                <DragDropContext onDragEnd={handleChapterReorder}>
                                                    <Droppable droppableId="chapters">
                                                        {(provided) => (
                                                            <div
                                                                {...provided.droppableProps}
                                                                ref={provided.innerRef}
                                                                className="divide-y divide-border/50"
                                                            >
                                                                {book.chapters.length === 0 ? (
                                                                    <div className="p-12 text-center text-muted-foreground">
                                                                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                                                        <p>Noch keine Kapitel erstellt.</p>
                                                                    </div>
                                                                ) : (
                                                                    book.chapters.map((chapter, index) => (
                                                                        <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                                                                            {(provided, snapshot) => (
                                                                                <div
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    className={cn(
                                                                                        "grid grid-cols-12 gap-4 p-4 items-center hover:bg-secondary/50 transition-colors group",
                                                                                        snapshot.isDragging && "bg-secondary shadow-lg z-50 rounded-lg"
                                                                                    )}
                                                                                >
                                                                                    <div className="col-span-1 flex items-center justify-center text-muted-foreground/30 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing" {...provided.dragHandleProps}>
                                                                                        <GripVertical className="h-4 w-4" />
                                                                                    </div>
                                                                                    <div className="col-span-1 font-mono text-sm text-muted-foreground">
                                                                                        {index + 1}
                                                                                    </div>
                                                                                    <div className="col-span-6 font-medium">
                                                                                        <Link
                                                                                            href={`/books/${book.id}/chapter/${chapter.id}` as Route}
                                                                                            className="hover:text-primary transition-colors flex items-center gap-2"
                                                                                        >
                                                                                            {chapter.title || "Unbenanntes Kapitel"}
                                                                                            <ArrowLeft className="h-3 w-3 opacity-0 group-hover:opacity-100 rotate-180 transition-opacity text-primary" />
                                                                                        </Link>
                                                                                    </div>
                                                                                    <div className="col-span-2">
                                                                                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", getStatusColor(chapter.status))}>
                                                                                            {getStatusLabel(chapter.status)}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="col-span-2 text-right text-sm text-muted-foreground font-mono">
                                                                                        {chapter.wordCount}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Draggable>
                                                                    ))
                                                                )}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </DragDropContext>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {activeTab === "characters" && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <h2 className="text-2xl font-bold font-serif">Charaktere</h2>
                                            <div className="flex items-center bg-secondary/50 rounded-lg p-1 border border-border/50">
                                                <button
                                                    onClick={() => setCharacterViewMode("cards")}
                                                    className={cn(
                                                        "p-1.5 rounded-md transition-all",
                                                        characterViewMode === "cards" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                    title="Kartenansicht"
                                                >
                                                    <LayoutGrid className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setCharacterViewMode("graph")}
                                                    className={cn(
                                                        "p-1.5 rounded-md transition-all",
                                                        characterViewMode === "graph" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                    title="Beziehungs-Graph"
                                                >
                                                    <GitBranch className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <Button onClick={() => setShowCharacterForm(true)} className="shadow-lg shadow-primary/20">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Neuer Charakter
                                        </Button>
                                    </div>

                                    {/* AI Charakter Assistent */}
                                    <CharacterAIPanel bookId={book.id} onCharacterGenerated={handleCharacterSave} />

                                    {characterViewMode === "graph" ? (
                                        <Card className="h-[600px] overflow-hidden border-border/50 shadow-inner bg-card/30">
                                            <CharacterRelationshipGraph
                                                characters={book.characters}
                                                onNodeClick={(character) => {
                                                    setEditingCharacter(character as any);
                                                    setShowCharacterForm(true);
                                                }}
                                            />
                                        </Card>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {book.characters.map((character) => (
                                                <Card
                                                    key={character.id}
                                                    className="group cursor-pointer hover:shadow-xl hover:shadow-primary/5 hover:border-primary/50 transition-all duration-300 overflow-hidden bg-card/50 backdrop-blur-sm"
                                                    onClick={() => {
                                                        setEditingCharacter(character);
                                                        setShowCharacterForm(true);
                                                    }}
                                                >
                                                    <div className="flex h-full">
                                                        {/* Character Image Strip */}
                                                        <div className="w-24 bg-secondary/50 relative overflow-hidden flex-shrink-0">
                                                            {character.imageUrl ? (
                                                                <img
                                                                    src={character.imageUrl}
                                                                    alt={character.name}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-secondary">
                                                                    <Users className="h-8 w-8 text-muted-foreground/30" />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/50" />
                                                        </div>

                                                        <div className="flex-1 p-5 flex flex-col">
                                                            <div>
                                                                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{character.name}</h3>
                                                                <div className="text-sm font-medium text-muted-foreground mb-2">{character.role}</div>
                                                                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                                                    {character.description || "Keine Beschreibung"}
                                                                </p>
                                                            </div>

                                                            <div className="mt-auto pt-4 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                                                <Button
                                                                    size="icon"
                                                                    variant="secondary"
                                                                    className="h-8 w-8 rounded-full"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingRelationsCharacter(character);
                                                                        setShowRelationModal(true);
                                                                    }}
                                                                    title="Beziehungen bearbeiten"
                                                                >
                                                                    <Link2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCharacterDelete(character.id);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                            {book.characters.length === 0 && (
                                                <div className="col-span-full py-12 text-center text-muted-foreground">
                                                    <p>Erstelle deinen ersten Charakter</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === "plot" && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold font-serif">Handlungspunkte</h2>
                                        <Button onClick={() => setShowPlotForm(true)} className="shadow-lg shadow-primary/20">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Neuer Punkt
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        {book.plotPoints.map((plotPoint) => (
                                            <Card
                                                key={plotPoint.id}
                                                className="cursor-pointer hover:bg-secondary/20 hover:border-primary/30 transition-all duration-300"
                                                onClick={() => {
                                                    setEditingPlotPoint(plotPoint);
                                                    setShowPlotForm(true);
                                                }}
                                            >
                                                <CardHeader>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <CardTitle className="text-lg">{plotPoint.title}</CardTitle>
                                                            <CardDescription>{plotPoint.type}</CardDescription>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handlePlotPointDelete(plotPoint.id);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-sm text-muted-foreground">{plotPoint.description || "Keine Beschreibung"}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === "world" && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold font-serif">Welt & Lore</h2>
                                        <Button onClick={() => setShowWorldForm(true)} className="shadow-lg shadow-primary/20">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Neues Element
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {book.worldElements.map((element) => (
                                            <Card
                                                key={element.id}
                                                className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden bg-card/60 backdrop-blur"
                                                onClick={() => {
                                                    setEditingWorldElement(element);
                                                    setShowWorldForm(true);
                                                }}
                                            >
                                                <div className="aspect-video w-full bg-secondary/50 relative overflow-hidden">
                                                    {element.imageUrl ? (
                                                        <img
                                                            src={element.imageUrl}
                                                            alt={element.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground/40">
                                                            <Globe className="h-8 w-8 mb-2" />
                                                            <span className="text-xs uppercase tracking-widest opacity-70">Kein Bild</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                    <div className="absolute bottom-4 left-4 right-4">
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-background/80 backdrop-blur text-foreground mb-1">
                                                            {element.type}
                                                        </span>
                                                        <h3 className="font-bold text-lg text-white text-shadow-sm">{element.name}</h3>
                                                    </div>
                                                </div>
                                                <CardContent className="p-4 relative">
                                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                                        {element.description || "Keine Beschreibung"}
                                                    </p>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleWorldElementDelete(element.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === "preview" && (
                                <div className="h-[calc(100vh-8rem)]">
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
                                            content: "", // Content loaded mostly in preview component or we might need it here? 
                                            // The original code mapped mapped chapters but content might be missing if not loaded.
                                            // BookPreview usually fetches or uses what's passed. 
                                            // Looking at original file, it passed book.chapters which are just summaries usually unless fetched full.
                                            // Let's pass what we have.
                                            orderIndex: ch.orderIndex,
                                        }))}
                                    />
                                </div>
                            )}

                            {activeTab === "settings" && (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    <h2 className="text-2xl font-bold font-serif mb-6">Buch & KI Einstellungen</h2>
                                    <AISettingsForm
                                        bookId={book.id}
                                        initialSettings={book.aiSettings}
                                        onSave={(settings) => setBook(prev => ({ ...prev, aiSettings: settings }))}
                                    />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Modals */}
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

            {showRelationModal && editingRelationsCharacter && (
                <CharacterRelationModal
                    open={showRelationModal}
                    onOpenChange={setShowRelationModal}
                    character={editingRelationsCharacter}
                    allCharacters={book.characters}
                    onSave={() => {
                        // Refresh book data to get updated relations
                        // ideally we'd update state here, for now relying on parent refresh or just closing
                        setShowRelationModal(false);
                    }}
                />
            )}

            {showPlotForm && (
                <PlotPointForm
                    open={showPlotForm}
                    onOpenChange={setShowPlotForm}
                    initialData={editingPlotPoint}
                    onSave={handlePlotPointSave}
                />
            )}

            {showWorldForm && (
                <WorldElementForm
                    open={showWorldForm}
                    onOpenChange={setShowWorldForm}
                    initialData={editingWorldElement}
                    onSave={handleWorldElementSave}
                />
            )}
        </div>
    );
}

