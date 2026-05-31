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
import ChapterTab from "@/components/editor/ChapterTab";
import PlotTab from "@/components/editor/PlotTab";
import WorldTab from "@/components/editor/WorldTab";
import { useI18n } from "@/components/locale-provider";

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

type CharacterWithRelations = Character & {
  relationsFrom: Array<{
    id: string;
    relationType: string;
    description: string | null;
    relatedCharacter: {
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
  const { t, intlLocale } = useI18n();
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
  const [editingRelationsCharacter, setEditingRelationsCharacter] = useState<CharacterWithRelations | null>(null);

  const handleCharacterNodeClick = (characterId: string) => {
    const character = book.characters.find((c) => c.id === characterId);
    if (character) {
      setEditingCharacter(character);
      setShowCharacterForm(true);
    }
  };

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
    setBook((prev) => ({ ...prev, chapters: updatedChapters }));

    // Save to API
    try {
      await fetch(`/api/books/${book.id}/chapters`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterIds: updatedChapters.map((ch) => ch.id),
        }),
      });
    } catch (error) {
      console.error("Error reordering chapters:", error);
      // Revert on error
      setBook((prev) => ({ ...prev, chapters: book.chapters }));
    }
  };

  const handleCharacterSave = (savedCharacter: Character) => {
    if (editingCharacter) {
      setBook((prev) => ({
        ...prev,
        characters: prev.characters.map((c) => (c.id === savedCharacter.id ? savedCharacter : c)),
      }));
    } else {
      setBook((prev) => ({
        ...prev,
        characters: [...prev.characters, savedCharacter],
      }));
    }
    setShowCharacterForm(false);
    setEditingCharacter(null);
  };

  const handleCharacterDelete = async (characterId: string) => {
    if (!confirm(t({ de: "Möchtest du diesen Charakter wirklich löschen?", en: "Do you really want to delete this character?" }))) return;
    try {
      await fetch(`/api/books/${book.id}/characters/${characterId}`, {
        method: "DELETE",
      });
      setBook((prev) => ({
        ...prev,
        characters: prev.characters.filter((c) => c.id !== characterId),
      }));
    } catch (error) {
      console.error("Error deleting character:", error);
    }
  };

  const handlePlotPointSave = (savedPlotPoint: PlotPoint) => {
    if (editingPlotPoint) {
      setBook((prev) => ({
        ...prev,
        plotPoints: prev.plotPoints.map((p) => (p.id === savedPlotPoint.id ? savedPlotPoint : p)),
      }));
    } else {
      setBook((prev) => ({
        ...prev,
        plotPoints: [...prev.plotPoints, savedPlotPoint],
      }));
    }
    setShowPlotForm(false);
    setEditingPlotPoint(null);
  };

  const handlePlotPointDelete = async (plotPointId: string) => {
    if (!confirm(t({ de: "Möchtest du diesen Handlungspunkt wirklich löschen?", en: "Do you really want to delete this plot point?" }))) return;
    try {
      await fetch(`/api/books/${book.id}/plot/${plotPointId}`, {
        method: "DELETE",
      });
      setBook((prev) => ({
        ...prev,
        plotPoints: prev.plotPoints.filter((p) => p.id !== plotPointId),
      }));
    } catch (error) {
      console.error("Error deleting plot point:", error);
    }
  };

  const handleWorldElementSave = (savedWorldElement: WorldElement) => {
    if (editingWorldElement) {
      setBook((prev) => ({
        ...prev,
        worldElements: prev.worldElements.map((w) => (w.id === savedWorldElement.id ? savedWorldElement : w)),
      }));
    } else {
      setBook((prev) => ({
        ...prev,
        worldElements: [...prev.worldElements, savedWorldElement],
      }));
    }
    setShowWorldForm(false);
    setEditingWorldElement(null);
  };

  const handleWorldElementDelete = async (worldElementId: string) => {
    if (!confirm(t({ de: "Möchtest du dieses Weltelement wirklich löschen?", en: "Do you really want to delete this world element?" }))) return;
    try {
      await fetch(`/api/books/${book.id}/world/${worldElementId}`, {
        method: "DELETE",
      });
      setBook((prev) => ({
        ...prev,
        worldElements: prev.worldElements.filter((w) => w.id !== worldElementId),
      }));
    } catch (error) {
      console.error("Error deleting world element:", error);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: "overview", label: t({ de: "Übersicht", en: "Overview" }), icon: BookOpen },
    { id: "chapters", label: t({ de: "Kapitel", en: "Chapters" }), icon: FileText },
    { id: "characters", label: t({ de: "Charaktere", en: "Characters" }), icon: Users },
    { id: "plot", label: t({ de: "Handlung", en: "Plot" }), icon: Map },
    { id: "world", label: t({ de: "Welt", en: "World" }), icon: Globe },
    { id: "preview", label: t({ de: "Vorschau", en: "Preview" }), icon: Eye },
    { id: "settings", label: t({ de: "Einstellungen", en: "Settings" }), icon: Settings },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-600 dark:text-green-400";
      case "in_progress":
        return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400";
      case "review":
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return t({ de: "Fertig", en: "Completed" });
      case "in_progress":
        return t({ de: "In Arbeit", en: "In progress" });
      case "review":
        return t({ de: "Review", en: "Review" });
      default:
        return t({ de: "Entwurf", en: "Draft" });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="ambient-glow-amber top-[-10%] left-[-5%] opacity-20" />
        <div className="ambient-glow-violet bottom-[-10%] right-[-5%] opacity-15" />
      </div>

      {/* Immersive Floating macOS-style Navigation Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-border/40 bg-card/75 dark:bg-card/45 backdrop-blur-2xl shadow-2xl px-5 py-2.5 flex items-center gap-3 transition-all duration-300 hover:shadow-primary/10 hover:border-primary/30">
        
        {/* Link back to library */}
        <Link 
          href={"/books" as Route} 
          className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-secondary/45 transition-all select-none group" 
          title={t({ de: "Zurück zur Bibliothek", en: "Back to library" })}
        >
          <ArrowLeft className="h-4.5 w-4.5 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
        <div className="w-px h-6 bg-border/40" />

        {/* Dynamic workspace tab triggers with magnetic scale */}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "p-2.5 rounded-xl text-xs font-semibold font-serif transition-all duration-300 flex flex-col items-center justify-center gap-1 select-none relative cursor-pointer min-w-[56px] group",
                isActive
                  ? "text-primary scale-110 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:scale-105 hover:bg-secondary/45"
              )}
            >
              <tab.icon className="h-4.5 w-4.5 transition-transform group-hover:scale-105" />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80 scale-90 group-hover:scale-95 origin-center">{tab.label}</span>

              {/* Active Golden Highlight Bar underneath */}
              {isActive && (
                <motion.div
                  layoutId="active-dock-indicator"
                  className="absolute -bottom-1 left-1/4 right-1/4 h-0.5 bg-primary rounded-full shadow-md shadow-primary/20 z-0 pointer-events-none"
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-10 scrollbar-hide pb-28">
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
                <ChapterTab
                  bookId={book.id}
                  chapters={book.chapters}
                  onReorder={handleChapterReorder}
                  onCreate={handleCreateChapter}
                  isCreating={isCreatingChapter}
                />
              )}

              {activeTab === "characters" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-border/30 pb-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-3xl font-serif font-black tracking-tight text-foreground">{t({ de: "Charaktere", en: "Characters" })}</h2>
                      <div className="flex items-center bg-secondary/50 rounded-xl p-1 border border-border/40">
                        <button
                          onClick={() => setCharacterViewMode("cards")}
                          className={cn(
                            "p-1.5 rounded-lg transition-all cursor-pointer",
                            characterViewMode === "cards" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                          title={t({ de: "Kartenansicht", en: "Card view" })}
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setCharacterViewMode("graph")}
                          className={cn(
                            "p-1.5 rounded-lg transition-all cursor-pointer",
                            characterViewMode === "graph" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                          title={t({ de: "Beziehungs-Graph", en: "Relationship graph" })}
                        >
                          <GitBranch className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <Button onClick={() => setShowCharacterForm(true)} className="rounded-xl shadow-md shadow-primary/10">
                      <Plus className="mr-2 h-4 w-4" />
                      {t({ de: "Neuer Charakter", en: "New character" })}
                    </Button>
                  </div>

                  {/* AI Charakter Assistent */}
                  <CharacterAIPanel bookId={book.id} onCharacterCreated={handleCharacterSave} onCharacterUpdated={handleCharacterSave} />

                  {characterViewMode === "graph" ? (
                    <Card className="h-[600px] overflow-hidden border border-border/40 shadow-inner bg-card/25 rounded-2xl">
                      <CharacterRelationshipGraph characters={book.characters as any} onNodeClick={handleCharacterNodeClick} />
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {book.characters.map((character) => (
                        <Card
                          key={character.id}
                          className="group cursor-pointer hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300 overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40 rounded-2xl flex flex-col justify-between paper-texture"
                          onClick={() => {
                            setEditingCharacter(character);
                            setShowCharacterForm(true);
                          }}
                        >
                          <div className="flex h-full relative">
                            {/* Binder left line */}
                            <div className="book-binding-line" />

                            {/* Character Image Strip */}
                            <div className="w-22 bg-secondary/35 relative overflow-hidden flex-shrink-0 border-r border-border/20 pl-2">
                              {character.imageUrl ? (
                                <img
                                  src={character.imageUrl}
                                  alt={character.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-secondary/40">
                                  <Users className="h-6 w-6 text-muted-foreground/20" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/0 to-card/50" />
                            </div>

                            <div className="flex-1 p-5 flex flex-col justify-between">
                              <div>
                                <h3 className="font-serif font-black text-base group-hover:text-primary transition-colors text-foreground line-clamp-1">{character.name}</h3>
                                <div className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-2.5">{character.role}</div>
                                <p className="text-xs font-serif text-muted-foreground line-clamp-3 leading-relaxed">
                                  {character.description || t({ de: "Keine Beschreibung", en: "No description" })}
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-border/30 flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-all transform translate-y-1.5 group-hover:translate-y-0">
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="h-7.5 w-7.5 rounded-lg border border-border bg-card/95 hover:bg-secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingRelationsCharacter(character as any);
                                    setShowRelationModal(true);
                                  }}
                                  title={t({ de: "Beziehungen bearbeiten", en: "Edit relationships" })}
                                >
                                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7.5 w-7.5 rounded-lg text-destructive hover:bg-destructive/10"
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
                        <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-border/40 text-muted-foreground font-serif">
                          <p>{t({ de: "Erstelle deinen ersten Charakter", en: "Create your first character" })}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "plot" && (
                <PlotTab
                  bookId={book.id}
                  plotPoints={book.plotPoints}
                  onEdit={(point) => {
                    setEditingPlotPoint(point);
                    setShowPlotForm(true);
                  }}
                  onDelete={handlePlotPointDelete}
                  onCreate={() => {
                    setEditingPlotPoint(null);
                    setShowPlotForm(true);
                  }}
                  onSave={handlePlotPointSave}
                />
              )}

              {activeTab === "world" && (
                <WorldTab
                  worldElements={book.worldElements}
                  onEdit={(element) => {
                    setEditingWorldElement(element);
                    setShowWorldForm(true);
                  }}
                  onDelete={handleWorldElementDelete}
                  onCreate={() => {
                    setEditingWorldElement(null);
                    setShowWorldForm(true);
                  }}
                />
              )}

              {activeTab === "preview" && (
                <div className="h-[calc(100vh-8rem)]">
                  <BookPreview
                    bookId={book.id}
                    bookTitle={book.title}
                    author={book.author || t({ de: "Autor", en: "Author" })}
                    language={book.language}
                    coverUrl={book.coverUrl}
                    hideCoverText={book.hideCoverText}
                    chapters={book.chapters.map((ch) => ({
                      id: ch.id,
                      title: ch.title,
                      content: "",
                      orderIndex: ch.orderIndex,
                    }))}
                    onClose={() => setActiveTab("overview")}
                  />
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold font-serif mb-6">{t({ de: "Buch & KI Einstellungen", en: "Book & AI settings" })}</h2>
                  <AISettingsForm
                    bookId={book.id}
                    initialSettings={book.aiSettings}
                    onSave={(settings) => setBook((prev) => ({ ...prev, aiSettings: settings }))}
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
          character={editingRelationsCharacter}
          allCharacters={book.characters}
          bookId={book.id}
          onClose={() => {
            setShowRelationModal(false);
          }}
          onSave={() => {
            setShowRelationModal(false);
          }}
        />
      )}

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
