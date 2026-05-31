"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
    Plus,
    BookOpen,
    Users,
    Sparkles,
    Trash2,
    Loader2,
    Search,
    Filter,
    Calendar,
    ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/locale-provider";

type Book = {
    id: string;
    title: string;
    description: string | null;
    genre: string | null;
    updatedAt: string;
    coverUrl: string | null;
    _count: {
        chapters: number;
        characters: number;
    };
};

export default function BooksPage() {
    const { t, intlLocale } = useI18n();
    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"updated" | "title" | "newest">("updated");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        async function loadBooks() {
            try {
                const response = await fetch("/api/books");
                if (response.ok) {
                    const data = await response.json();
                    setBooks(data);
                }
            } catch (error) {
                console.error("Error loading books:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadBooks();
    }, []);

    const handleDelete = async (e: React.MouseEvent, bookId: string) => {
        e.preventDefault(); // Prevent link navigation
        e.stopPropagation();

        if (!confirm(t({
            de: "Bist du sicher, dass du dieses Buch löschen möchtest? Alle Daten werden unwiderruflich gelöscht.",
            en: "Are you sure you want to delete this book? All data will be permanently removed.",
        }))) {
            return;
        }

        setDeletingId(bookId);
        try {
            const response = await fetch(`/api/books/${bookId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setBooks((prev) => prev.filter((b) => b.id !== bookId));
            } else {
                alert(t({ de: "Fehler beim Löschen des Buchs", en: "Failed to delete the book" }));
            }
        } catch (error) {
            console.error("Error deleting book:", error);
            alert(t({ de: "Fehler beim Löschen des Buchs", en: "Failed to delete the book" }));
        } finally {
            setDeletingId(null);
        }
    };

    const filteredBooks = useMemo(() => {
        let filtered = books.filter(book =>
            book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.genre?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return filtered.sort((a, b) => {
            if (sortBy === "title") return a.title.localeCompare(b.title);
            if (sortBy === "newest") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }, [books, searchQuery, sortBy]);

    const sortLabel = sortBy === "updated"
        ? t({ de: "Zuletzt bearbeitet", en: "Recently updated" })
        : sortBy === "newest"
            ? t({ de: "Neueste", en: "Newest" })
            : t({ de: "Titel", en: "Title" });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="relative mb-6">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="absolute inset-0 bg-primary/20 rounded-full filter blur-md animate-pulse" />
                </div>
                <p className="text-muted-foreground font-medium animate-pulse">
                    {t({ de: "Lade deine Bibliothek...", en: "Loading your library..." })}
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden pb-16">
            
            {/* Soft Ambient Candlelight Glows */}
            <div className="ambient-glow-amber top-[10%] right-[10%]" />
            <div className="ambient-glow-violet bottom-[15%] left-[5%]" />

            <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 relative z-10">
                
                {/* Header Section / Sanctuary Study */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="space-y-3">
                        <motion.h1
                            initial={{ opacity: 0, y: -15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl sm:text-5xl font-serif font-black tracking-tight bg-gradient-to-r from-foreground via-foreground to-stone-500 bg-clip-text text-transparent"
                        >
                            {t({ de: "Deine Bibliothek", en: "Your library" })}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-md sm:text-lg text-muted-foreground font-serif max-w-xl leading-relaxed"
                        >
                            {t({
                                de: "Verwalte deine Buchprojekte und erschaffe neue Welten mit feinfühliger KI-Unterstützung.",
                                en: "Manage your book projects and create new worlds with gentle AI support.",
                            })}
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        className="flex gap-3"
                    >
                        <Link href={"/books/new" as Route}>
                            <Button size="lg" className="rounded-full shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-102 transition-all duration-300 font-medium px-6 py-5.5 bg-primary text-primary-foreground">
                                <Plus className="h-5 w-5 mr-2" />
                                {t({ de: "Neues Buch", en: "New book" })}
                            </Button>
                        </Link>
                    </motion.div>
                </div>

                {/* Search & Sort Capsule - Glass Floating Overlay */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 p-3 rounded-2xl bg-card/65 dark:bg-card/45 backdrop-blur-xl border border-border/40 shadow-md"
                >
                    <div className="relative w-full sm:w-96 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder={t({ de: "Suchen nach Titel, Genre...", en: "Search by title, genre..." })}
                            className="pl-10.5 bg-secondary/35 border-transparent focus:bg-background focus:border-border/55 focus:ring-0 transition-all rounded-xl h-10.5 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button variant="ghost" className="gap-2 rounded-xl text-sm border border-border/30 px-4 h-10.5 hover:bg-secondary/45" />
                                }
                            >
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">{t({ de: "Sortieren", en: "Sort" })}: {sortLabel}</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/40 shadow-xl">
                                <DropdownMenuLabel className="font-semibold text-xs text-muted-foreground">{t({ de: "Sortieren nach", en: "Sort by" })}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="rounded-lg text-sm" onClick={() => setSortBy("updated")}>
                                    {t({ de: "Zuletzt bearbeitet", en: "Recently updated" })}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg text-sm" onClick={() => setSortBy("newest")}>
                                    {t({ de: "Erstellt am", en: "Date created" })}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg text-sm" onClick={() => setSortBy("title")}>
                                    {t({ de: "Titel (A-Z)", en: "Title (A-Z)" })}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </motion.div>

                {/* Book Grid bookshelf */}
                {books.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-border/50 bg-card/10 p-8"
                    >
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-accent/50 to-secondary flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                            <BookOpen className="h-8 w-8 text-primary/70 relative z-10" />
                        </div>
                        <h3 className="text-xl font-bold font-serif mb-2 text-foreground">
                            {t({ de: "Deine Bibliothek ist leer", en: "Your library is empty" })}
                        </h3>
                        <p className="text-muted-foreground font-serif max-w-sm mb-8 text-sm leading-relaxed">
                            {t({
                                de: "Der Anfang ist oft das Schwerste. Erstelle dein erstes Buchprojekt und lass deiner Kreativität freien Lauf.",
                                en: "The beginning is often the hardest. Create your first book project and let your creativity run free.",
                            })}
                        </p>
                        <Link href={"/books/new" as Route}>
                            <Button className="gap-2 rounded-full px-6 shadow-md hover:shadow-lg transition-all bg-primary text-primary-foreground font-semibold">
                                <Plus className="h-4 w-4" />
                                {t({ de: "Erstes Buch erstellen", en: "Create your first book" })}
                            </Button>
                        </Link>
                    </motion.div>
                ) : (
                    <div 
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
                        style={{ perspective: "1200px" }}
                    >
                        <AnimatePresence>
                            {filteredBooks.map((book, index) => (
                                <motion.div
                                    key={book.id}
                                    layout
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ type: "spring", stiffness: 100, damping: 16, delay: index * 0.04 }}
                                    whileHover={{ 
                                        y: -8,
                                        rotateY: -10,
                                        rotateX: 2,
                                        scale: 1.025,
                                        transition: { duration: 0.25, ease: "easeOut" }
                                    }}
                                    className="h-full"
                                    style={{ transformStyle: "preserve-3d" }}
                                >
                                    <Link href={`/books/${book.id}` as Route} className="group block h-full select-none">
                                        
                                        {/* 3D HARDCOVER VIRTUAL BOOK */}
                                        <div className="relative h-full min-h-[380px] bg-card rounded-2xl border border-border/45 overflow-hidden shadow-md group-hover:shadow-2xl transition-shadow duration-300 flex flex-col justify-between paper-texture">
                                            
                                            {/* Book Binding Spine effect (Wow factor) */}
                                            <div className="book-binding-line" />

                                            {/* Top Banner Cover Art */}
                                            <div className="relative h-44 w-full overflow-hidden bg-secondary/20">
                                                {!book.coverUrl && (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary to-chart-1/10 group-hover:scale-105 transition-transform duration-700" />
                                                )}
                                                {book.coverUrl && (
                                                    <img
                                                        src={book.coverUrl}
                                                        alt={book.title}
                                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-card via-black/0 to-black/10" />

                                                {/* Genre Seal Pressed Label */}
                                                {book.genre && (
                                                    <div className="absolute top-4 left-5 z-10">
                                                        <span className="px-3 py-1 rounded-full text-[9px] font-semibold tracking-wider uppercase bg-card/90 dark:bg-card text-primary border border-primary/10 shadow-sm">
                                                            {book.genre}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Trash Icon Button - Fades in on Hover */}
                                                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <Button
                                                        variant="secondary"
                                                        size="icon"
                                                        className="h-8.5 w-8.5 rounded-full bg-card/95 border border-border text-destructive hover:bg-destructive hover:text-white shadow-md"
                                                        onClick={(e) => handleDelete(e, book.id)}
                                                        disabled={deletingId === book.id}
                                                    >
                                                        {deletingId === book.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Content Block / Pages of the Cover */}
                                            <div className="p-6 pt-2 flex-1 flex flex-col justify-between pl-8">
                                                <div>
                                                    <h3 className="font-serif font-black text-xl leading-tight mb-2.5 text-foreground group-hover:text-primary transition-colors line-clamp-2" title={book.title}>
                                                        {book.title}
                                                    </h3>
                                                    {book.description && (
                                                        <p className="text-xs text-muted-foreground font-serif line-clamp-3 leading-relaxed mb-4">
                                                            {book.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="pt-4 border-t border-border/40">
                                                    {/* Count Widgets */}
                                                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-serif mb-4.5">
                                                        <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
                                                            <BookOpen className="h-3.5 w-3.5" />
                                                            <span className="font-semibold">{book._count.chapters} {t({ de: "Kap.", en: "Ch." })}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
                                                            <Users className="h-3.5 w-3.5" />
                                                            <span className="font-semibold">{book._count.characters} {t({ de: "Char.", en: "Chars." })}</span>
                                                        </div>
                                                    </div>

                                                    {/* Bottom Row: Date & Open */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-wider uppercase text-muted-foreground/80">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{new Date(book.updatedAt).toLocaleDateString(intlLocale)}</span>
                                                        </div>
                                                        <div className="flex items-center text-primary text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-8px] group-hover:translate-x-0">
                                                            {t({ de: "Öffnen", en: "Open" })} <ArrowUpRight className="ml-1 h-3.5 w-3.5 animate-pulse" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
