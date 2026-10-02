"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BookCover } from "@/components/book-cover";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type Tab =
  | "overview"
  | "chapters"
  | "characters"
  | "plot"
  | "world"
  | "preview"
  | "settings";

export default function BookEditorLayout({ book: initialBook }: Props) {
  const { t, intlLocale } = useI18n();
  const router = useRouter();
  const [book, setBook] = useState(initialBook);
  const [activeTab, setActiveTabState] = useState<Tab>("overview");
  useEffect(() => {
    const restoreTab = () => {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (
        [
          "overview",
          "chapters",
          "characters",
          "plot",
          "world",
          "preview",
          "settings",
        ].includes(tab || "")
      )
        setActiveTabState(tab as Tab);
      else setActiveTabState("overview");
    };
    restoreTab();
    window.addEventListener("popstate", restoreTab);
    return () => window.removeEventListener("popstate", restoreTab);
  }, []);
  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
  };

  // Chapter state
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);

  // Entity Editing State
  const [showCharacterForm, setShowCharacterForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(
    null,
  );
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [editingPlotPoint, setEditingPlotPoint] = useState<PlotPoint | null>(
    null,
  );
  const [showWorldForm, setShowWorldForm] = useState(false);
  const [editingWorldElement, setEditingWorldElement] =
    useState<WorldElement | null>(null);

  // Character relationships state
  const [characterViewMode, setCharacterViewMode] = useState<"cards" | "graph">(
    "cards",
  );
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [editingRelationsCharacter, setEditingRelationsCharacter] =
    useState<CharacterWithRelations | null>(null);

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
      } else {
        throw new Error("Create chapter failed");
      }
    } catch (error) {
      console.error("Error creating chapter:", error);
      toast.error(
        t({
          de: "Kapitel konnte nicht erstellt werden.",
          en: "Could not create chapter.",
        }),
      );
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
      const response = await fetch(`/api/books/${book.id}/chapters`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterIds: updatedChapters.map((ch) => ch.id),
        }),
      });
      if (!response.ok) throw new Error("Reorder failed");
    } catch (error) {
      console.error("Error reordering chapters:", error);
      toast.error(
        t({
          de: "Reihenfolge konnte nicht gespeichert werden.",
          en: "Could not save chapter order.",
        }),
      );
      // Revert on error
      setBook((prev) => ({ ...prev, chapters: book.chapters }));
    }
  };

  const handleCharacterSave = (savedCharacter: Character) => {
    if (editingCharacter) {
      setBook((prev) => ({
        ...prev,
        characters: prev.characters.map((c) =>
          c.id === savedCharacter.id ? savedCharacter : c,
        ),
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
    if (
      !confirm(
        t({
          de: "Möchtest du diesen Charakter wirklich löschen?",
          en: "Do you really want to delete this character?",
        }),
      )
    )
      return;
    try {
      const response = await fetch(
        `/api/books/${book.id}/characters/${characterId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("Delete failed");
      setBook((prev) => ({
        ...prev,
        characters: prev.characters.filter((c) => c.id !== characterId),
      }));
    } catch (error) {
      console.error("Error deleting character:", error);
      toast.error(
        t({
          de: "Löschen fehlgeschlagen. Bitte erneut versuchen.",
          en: "Delete failed. Please try again.",
        }),
      );
    }
  };

  const handlePlotPointSave = (savedPlotPoint: PlotPoint) => {
    if (editingPlotPoint) {
      setBook((prev) => ({
        ...prev,
        plotPoints: prev.plotPoints.map((p) =>
          p.id === savedPlotPoint.id ? savedPlotPoint : p,
        ),
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
    if (
      !confirm(
        t({
          de: "Möchtest du diesen Handlungspunkt wirklich löschen?",
          en: "Do you really want to delete this plot point?",
        }),
      )
    )
      return;
    try {
      const response = await fetch(
        `/api/books/${book.id}/plot/${plotPointId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("Delete failed");
      setBook((prev) => ({
        ...prev,
        plotPoints: prev.plotPoints.filter((p) => p.id !== plotPointId),
      }));
    } catch (error) {
      console.error("Error deleting plot point:", error);
      toast.error(
        t({
          de: "Löschen fehlgeschlagen. Bitte erneut versuchen.",
          en: "Delete failed. Please try again.",
        }),
      );
    }
  };

  const handleWorldElementSave = (savedWorldElement: WorldElement) => {
    if (editingWorldElement) {
      setBook((prev) => ({
        ...prev,
        worldElements: prev.worldElements.map((w) =>
          w.id === savedWorldElement.id ? savedWorldElement : w,
        ),
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
    if (
      !confirm(
        t({
          de: "Möchtest du dieses Weltelement wirklich löschen?",
          en: "Do you really want to delete this world element?",
        }),
      )
    )
      return;
    try {
      const response = await fetch(
        `/api/books/${book.id}/world/${worldElementId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("Delete failed");
      setBook((prev) => ({
        ...prev,
        worldElements: prev.worldElements.filter(
          (w) => w.id !== worldElementId,
        ),
      }));
    } catch (error) {
      console.error("Error deleting world element:", error);
      toast.error(
        t({
          de: "Löschen fehlgeschlagen. Bitte erneut versuchen.",
          en: "Delete failed. Please try again.",
        }),
      );
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    {
      id: "overview",
      label: t({ de: "Übersicht", en: "Overview" }),
      icon: BookOpen,
    },
    {
      id: "chapters",
      label: t({ de: "Kapitel", en: "Chapters" }),
      icon: FileText,
    },
    {
      id: "characters",
      label: t({ de: "Charaktere", en: "Characters" }),
      icon: Users,
    },
    { id: "plot", label: t({ de: "Handlung", en: "Plot" }), icon: Map },
    { id: "world", label: t({ de: "Welt", en: "World" }), icon: Globe },
    { id: "preview", label: t({ de: "Vorschau", en: "Preview" }), icon: Eye },
    {
      id: "settings",
      label: t({ de: "Einstellungen", en: "Settings" }),
      icon: Settings,
    },
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
    <div className="book-workspace">
      <aside className="book-sidebar">
        <Link href="/books" className="book-sidebar-back">
          <ArrowLeft size={15} />
          {t({ de: "Bibliothek", en: "Library" })}
        </Link>
        <div className="book-sidebar-project">
          <BookCover
            title={book.title}
            genre={book.genre}
            coverUrl={book.coverUrl}
            decorative
          />
          <div>
            <span>
              {book.genre || t({ de: "Buchprojekt", en: "Book project" })}
            </span>
            <h1>{book.title}</h1>
            <p>
              {book.author ||
                t({ de: "Deine nächste Geschichte", en: "Your next story" })}
            </p>
          </div>
        </div>
        <div className="book-sidebar-search">
          <GlobalSearch
            bookId={book.id}
            onNavigateToTab={(tab) => setActiveTab(tab as Tab)}
          />
        </div>
        <span className="sidebar-eyebrow">STORY WORKSPACE</span>
        <nav
          className="book-tab-nav"
          aria-label={t({ de: "Buchbereiche", en: "Book sections" })}
        >
          {tabs.map((tab) => {
            const count =
              tab.id === "chapters"
                ? book.chapters.length
                : tab.id === "characters"
                  ? book.characters.length
                  : tab.id === "plot"
                    ? book.plotPoints.length
                    : tab.id === "world"
                      ? book.worldElements.length
                      : null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={cn(
                  "book-tab-button",
                  activeTab === tab.id && "active",
                )}
              >
                <tab.icon size={17} />
                <span>{tab.label}</span>
                {count !== null && <small>{count}</small>}
              </button>
            );
          })}
        </nav>
        <div className="book-sidebar-progress">
          <span>
            {t({ de: "Wörter im Manuskript", en: "Words in manuscript" })}
          </span>
          <strong>{totalWords.toLocaleString(intlLocale)}</strong>
          <p>
            {book.chapters.filter((ch) => ch.status === "completed").length} /{" "}
            {book.chapters.length}{" "}
            {t({ de: "Kapitel fertig", en: "chapters complete" })}
          </p>
          <div
            className="manuscript-progress"
            role="progressbar"
            aria-label={t({
              de: "Abgeschlossene Kapitel",
              en: "Completed chapters",
            })}
            aria-valuemin={0}
            aria-valuemax={Math.max(1, book.chapters.length)}
            aria-valuenow={
              book.chapters.filter((ch) => ch.status === "completed").length
            }
          >
            <span
              style={{
                width: `${book.chapters.length ? (book.chapters.filter((ch) => ch.status === "completed").length / book.chapters.length) * 100 : 0}%`,
              }}
            />
          </div>
          <Button
            onClick={handleCreateChapter}
            disabled={isCreatingChapter}
            className="w-full mt-5"
          >
            {isCreatingChapter ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Plus />
            )}
            {t({ de: "Neues Kapitel", en: "New chapter" })}
          </Button>
        </div>
      </aside>
      <main className="book-workspace-main">
        <div className="book-workspace-topbar">
          <span>
            {book.title}
            <span className="mx-2 text-muted-foreground">/</span>
            <strong>{tabs.find((tab) => tab.id === activeTab)?.label}</strong>
          </span>
          <span className="book-workspace-mode">
            <span className="status-dot" />
            {t({ de: "Dein Schreibstudio", en: "Your writing studio" })}
          </span>
        </div>
        <div className="book-workspace-panel">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={false}
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
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <h2 className="text-3xl font-sans font-black tracking-tight text-foreground">
                        {t({ de: "Charaktere", en: "Characters" })}
                      </h2>
                      <div className="flex items-center bg-secondary/50 rounded-xl p-1 border border-border/40">
                        <button
                          onClick={() => setCharacterViewMode("cards")}
                          className={cn(
                            "p-1.5 rounded-lg transition-all cursor-pointer",
                            characterViewMode === "cards"
                              ? "bg-background shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                          title={t({ de: "Kartenansicht", en: "Card view" })}
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setCharacterViewMode("graph")}
                          className={cn(
                            "p-1.5 rounded-lg transition-all cursor-pointer",
                            characterViewMode === "graph"
                              ? "bg-background shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                          title={t({
                            de: "Beziehungs-Graph",
                            en: "Relationship graph",
                          })}
                        >
                          <GitBranch className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowCharacterForm(true)}
                      className="rounded-xl shadow-md shadow-primary/10"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t({ de: "Neuer Charakter", en: "New character" })}
                    </Button>
                  </div>

                  {/* AI Charakter Assistent */}
                  <CharacterAIPanel
                    bookId={book.id}
                    onCharacterCreated={handleCharacterSave}
                    onCharacterUpdated={handleCharacterSave}
                  />

                  {characterViewMode === "graph" ? (
                    <Card className="h-[600px] overflow-hidden border border-border/40 shadow-inner bg-card/25 rounded-2xl">
                      <CharacterRelationshipGraph
                        characters={book.characters as any}
                        onNodeClick={handleCharacterNodeClick}
                      />
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {book.characters.map((character) => (
                        <Card
                          key={character.id}
                          className="group cursor-pointer hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300 overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40 rounded-2xl flex flex-col justify-between "
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
                                <h3 className="font-sans font-black text-base group-hover:text-primary transition-colors text-foreground line-clamp-1">
                                  {character.name}
                                </h3>
                                <div className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-2.5">
                                  {character.role}
                                </div>
                                <p className="text-xs font-sans text-muted-foreground line-clamp-3 leading-relaxed">
                                  {character.description ||
                                    t({
                                      de: "Keine Beschreibung",
                                      en: "No description",
                                    })}
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-border/30 flex gap-1.5 justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-all transform translate-y-1.5 group-hover:translate-y-0">
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="h-7.5 w-7.5 rounded-lg border border-border bg-card/95 hover:bg-secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingRelationsCharacter(
                                      character as any,
                                    );
                                    setShowRelationModal(true);
                                  }}
                                  title={t({
                                    de: "Beziehungen bearbeiten",
                                    en: "Edit relationships",
                                  })}
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
                        <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-border/40 text-muted-foreground font-sans">
                          <p>
                            {t({
                              de: "Erstelle deinen ersten Charakter",
                              en: "Create your first character",
                            })}
                          </p>
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
                  <h2 className="text-2xl font-bold font-sans mb-6">
                    {t({
                      de: "Buch & KI Einstellungen",
                      en: "Book & AI settings",
                    })}
                  </h2>
                  <AISettingsForm
                    bookId={book.id}
                    initialSettings={book.aiSettings}
                    onSave={(settings) =>
                      setBook((prev) => ({ ...prev, aiSettings: settings }))
                    }
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
