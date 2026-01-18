"use client";

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import {
    BookOpen,
    Plus,
    GripVertical,
    ArrowRight,
    MoreVertical,
    Pencil,
    Trash2,
    Clock,
    AlignLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/components/locale-provider";

type Chapter = {
    id: string;
    title: string;
    orderIndex: number;
    status: string;
    wordCount: number;
};

interface ChapterTabProps {
    bookId: string;
    chapters: Chapter[];
    onReorder: (result: DropResult) => void;
    onCreate: () => void;
    isCreating: boolean;
}

export default function ChapterTab({
    bookId,
    chapters,
    onReorder,
    onCreate,
    isCreating
}: ChapterTabProps) {
    const { t, intlLocale } = useI18n();

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
            case "in_progress": return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20";
            case "review": return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20";
            default: return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/20";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "completed": return t({ de: "Abgeschlossen", en: "Completed" });
            case "in_progress": return t({ de: "In Arbeit", en: "In progress" });
            case "review": return t({ de: "In Überarbeitung", en: "In review" });
            default: return t({ de: "Entwurf", en: "Draft" });
        }
    };

    // Calculate estimated reading time (approx 250 wpm)
    const getReadingTime = (words: number) => Math.max(1, Math.ceil(words / 250));

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold font-serif tracking-tight text-foreground">
                        {t({ de: "Kapitelplanung", en: "Chapter planning" })}
                    </h2>
                    <p className="text-muted-foreground font-medium">
                        {t({
                            de: "Verwalte die Struktur und den Fortschritt deiner Geschichte",
                            en: "Manage the structure and progress of your story",
                        })}
                    </p>
                </div>

                <Button
                    onClick={onCreate}
                    disabled={isCreating}
                    className="h-10 px-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
                >
                    {isCreating ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                        <Plus className="mr-2 h-4 w-4" />
                    )}
                    {t({ de: "Kapitel hinzufügen", en: "Add chapter" })}
                </Button>
            </div>

            {/* Chapters List */}
            <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/5 shadow-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/40 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-6 md:col-span-5">{t({ de: "Titel", en: "Title" })}</div>
                    <div className="col-span-2 hidden md:block">{t({ de: "Status", en: "Status" })}</div>
                    <div className="col-span-3 md:col-span-3 text-right pr-4">{t({ de: "Umfang", en: "Length" })}</div>
                    <div className="col-span-1"></div>
                </div>

                <DragDropContext onDragEnd={onReorder}>
                    <Droppable droppableId="chapters">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="divide-y divide-border/30 min-h-[200px]"
                            >
                                {chapters.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-center p-8">
                                        <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 ring-1 ring-primary/20">
                                            <BookOpen className="h-10 w-10 text-primary/40" />
                                        </div>
                                        <h3 className="text-lg font-serif font-bold text-foreground mb-2">
                                            {t({ de: "Dein Buch ist noch leer", en: "Your book is still empty" })}
                                        </h3>
                                        <p className="text-muted-foreground max-w-sm mb-6">
                                            {t({
                                                de: "Starte deine Reise, indem du dein erstes Kapitel anlegst.",
                                                en: "Start your journey by creating your first chapter.",
                                            })}
                                        </p>
                                        <Button variant="outline" onClick={onCreate}>
                                            {t({ de: "Jetzt beginnen", en: "Start now" })}
                                        </Button>
                                    </div>
                                ) : (
                                    chapters.map((chapter, index) => (
                                        <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={cn(
                                                        "grid grid-cols-12 gap-4 p-4 items-center group transition-all duration-200",
                                                        snapshot.isDragging
                                                            ? "bg-background shadow-lg scale-[1.02] border border-primary/20 rounded-lg z-50"
                                                            : "hover:bg-primary/5"
                                                    )}
                                                >
                                                    {/* Drag Handle & Number */}
                                                    <div className="col-span-1 flex items-center gap-3">
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="p-1.5 rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-colors"
                                                        >
                                                            <GripVertical className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-mono text-sm font-medium text-muted-foreground/50 w-6 text-center">
                                                            {(index + 1).toString().padStart(2, "0")}
                                                        </span>
                                                    </div>

                                                    {/* Title & Link */}
                                                    <div className="col-span-6 md:col-span-5">
                                                        <Link
                                                            href={`/books/${bookId}/chapter/${chapter.id}`}
                                                            className="flex items-center group/link w-full"
                                                        >
                                                            <span className="font-medium text-base text-foreground group-hover/link:text-primary transition-colors line-clamp-1">
                                                                {chapter.title || t({ de: "Unbenanntes Kapitel", en: "Untitled chapter" })}
                                                            </span>
                                                            <ArrowRight className="h-3.5 w-3.5 ml-2 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-primary" />
                                                        </Link>
                                                    </div>

                                                    {/* Status Badge */}
                                                    <div className="col-span-2 hidden md:block">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider",
                                                            getStatusColor(chapter.status)
                                                        )}>
                                                            {getStatusLabel(chapter.status)}
                                                        </span>
                                                    </div>

                                                    {/* Stats */}
                                                    <div className="col-span-3 md:col-span-3 text-right">
                                                        <div className="flex flex-col items-end pr-4">
                                                            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                                                <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                                                {chapter.wordCount.toLocaleString(intlLocale)}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                                <Clock className="h-3 w-3" />
                                                                ~{getReadingTime(chapter.wordCount)} min
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="col-span-1 flex justify-end">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger className={cn(
                                                                "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-foreground h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            )}>
                                                                <MoreVertical className="h-4 w-4" />
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-40">
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/books/${bookId}/chapter/${chapter.id}`}>
                                                                        <Pencil className="mr-2 h-4 w-4" /> {t({ de: "Bearbeiten", en: "Edit" })}
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                                    <Trash2 className="mr-2 h-4 w-4" /> {t({ de: "Löschen", en: "Delete" })}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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
        </div>
    );
}
