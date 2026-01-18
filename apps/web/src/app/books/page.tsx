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
    ArrowUpRight,
    MoreVertical
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

        if (!confirm("Bist du sicher, dass du dieses Buch löschen möchtest? Alle Daten werden unwiderruflich gelöscht.")) {
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
                alert("Fehler beim Löschen des Buchs");
            }
        } catch (error) {
            console.error("Error deleting book:", error);
            alert("Fehler beim Löschen des Buchs");
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
            if (sortBy === "newest") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); // Creation date ideally, but using updated for now
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); // Default: Recently updated
        });
    }, [books, searchQuery, sortBy]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50 mb-4" />
                <p className="text-muted-foreground animate-pulse">Lade deine Bibliothek...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-chart-3/5 blur-[100px]" />
            </div>

            <div className="container mx-auto py-12 px-4 md:px-6 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-4">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-serif font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent"
                        >
                            Deine Bibliothek
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-lg text-muted-foreground max-w-lg"
                        >
                            Verwalte deine Buchprojekte und erschaffe neue Welten mit KI-Unterstützung.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex gap-3"
                    >
                        <Link href={"/books/new" as Route}>
                            <Button size="lg" className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                <Plus className="h-5 w-5 mr-2" />
                                Neues Buch
                            </Button>
                        </Link>
                    </motion.div>
                </div>

                {/* Filters & Search */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 sticky top-4 z-50 p-2 rounded-2xl bg-background/80 backdrop-blur-xl border border-border/50 shadow-sm"
                >
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Suchen nach Titel, Genre..."
                            className="pl-9 bg-secondary/50 border-transparent focus:bg-background focus:border-input transition-all rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
                                    <Filter className="h-4 w-4" />
                                    Sortieren: {sortBy === "updated" ? "Zuletzt bearbeitet" : sortBy === "newest" ? "Neueste" : "Titel"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSortBy("updated")}>
                                    Zuletzt bearbeitet
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy("newest")}>
                                    Erstellt am
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy("title")}>
                                    Titel (A-Z)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </motion.div>

                {/* Grid */}
                {books.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-muted to-secondary flex items-center justify-center mb-6">
                            <BookOpen className="h-10 w-10 text-muted-foreground opacity-50" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Deine Bibliothek ist leer</h3>
                        <p className="text-muted-foreground max-w-md mb-8">
                            Der Anfang ist oft das Schwerste. Erstelle dein erstes Buchprojekt und lass deiner Kreativität freien Lauf.
                        </p>
                        <Link href={"/books/new" as Route}>
                            <Button variant="outline" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Erstes Buch erstellen
                            </Button>
                        </Link>
                    </motion.div>
                ) : (
                    <motion.div
                        layout
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        <AnimatePresence>
                            {filteredBooks.map((book, index) => (
                                <motion.div
                                    key={book.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <Link href={`/books/${book.id}` as Route} className="group block h-full">
                                        <div className="relative h-full bg-card rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/50 hover:-translate-y-1">
                                            {/* Cover / Header Area */}
                                            <div className="relative h-48 w-full overflow-hidden bg-muted/30">
                                                {/* Gradient Background if no cover */}
                                                {!book.coverUrl && (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-chart-3/5 group-hover:scale-105 transition-transform duration-500" />
                                                )}

                                                {/* Cover Image if available */}
                                                {book.coverUrl && (
                                                    <img
                                                        src={book.coverUrl}
                                                        alt={book.title}
                                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                )}

                                                {/* Overlay Gradient */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                                                {/* Quick Actions (Hover) */}
                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                                                    <Button
                                                        variant="secondary"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full bg-background/80 backdrop-blur text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                                                        onClick={(e) => handleDelete(e, book.id)}
                                                        disabled={deletingId === book.id}
                                                    >
                                                        {deletingId === book.id ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3 w-3" />
                                                        )}
                                                    </Button>
                                                </div>

                                                {/* Genre Badge */}
                                                {book.genre && (
                                                    <div className="absolute top-3 left-3">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-background/60 backdrop-blur text-foreground border border-white/10 shadow-sm">
                                                            {book.genre}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="relative p-5 -mt-12">
                                                <div className="bg-card/80 backdrop-blur-xl rounded-xl p-4 border border-white/5 shadow-sm group-hover:bg-card/95 transition-colors">
                                                    <h3 className="font-serif font-bold text-lg leading-tight mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-1" title={book.title}>
                                                        {book.title}
                                                    </h3>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                                        <div className="flex items-center gap-1">
                                                            <BookOpen className="h-3 w-3" />
                                                            <span>{book._count.chapters} Kap.</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Users className="h-3 w-3" />
                                                            <span>{book._count.characters} Char.</span>
                                                        </div>
                                                    </div>

                                                    {book.description && (
                                                        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5em] mb-3">
                                                            {book.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{new Date(book.updatedAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex items-center text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                                                            Öffnen <ArrowUpRight className="ml-1 h-3 w-3" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
