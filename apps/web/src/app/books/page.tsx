"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Plus, BookOpen, Users, Sparkles, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Book = {
    id: string;
    title: string;
    description: string | null;
    genre: string | null;
    updatedAt: string;
    _count: {
        chapters: number;
        characters: number;
    };
};

export default function BooksPage() {
    const router = useRouter();
    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
        e.preventDefault();
        e.stopPropagation();

        if (!confirm("Bist du sicher, dass du dieses Buch löschen möchtest? Alle Kapitel, Charaktere und andere Daten werden unwiderruflich gelöscht.")) {
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

    if (isLoading) {
        return (
            <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-chart-3 bg-clip-text text-transparent">
                        Meine Bücher
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Erstelle und verwalte deine Buchprojekte
                    </p>
                </div>
                <Link href={"/books/new" as Route}>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Neues Buch
                    </Button>
                </Link>
            </div>

            {books.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="rounded-full bg-muted p-4 mb-4">
                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Noch keine Bücher</h3>
                        <p className="text-muted-foreground text-center max-w-sm mb-4">
                            Beginne dein erstes Buchprojekt und lass dich von KI unterstützen.
                        </p>
                        <Link href={"/books/new" as Route}>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Erstes Buch erstellen
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {books.map((book) => (
                        <Link key={book.id} href={`/books/${book.id}` as Route}>
                            <Card className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer h-full relative">
                                {/* Delete button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-10"
                                    onClick={(e) => handleDelete(e, book.id)}
                                    disabled={deletingId === book.id}
                                >
                                    {deletingId === book.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>

                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 pr-8">
                                            <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                                                {book.title}
                                            </CardTitle>
                                            {book.genre && (
                                                <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                                    {book.genre}
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-2 rounded-lg bg-gradient-to-br from-chart-1/20 to-chart-3/20">
                                            <Sparkles className="h-5 w-5 text-chart-3" />
                                        </div>
                                    </div>
                                    {book.description && (
                                        <CardDescription className="mt-3 line-clamp-2">
                                            {book.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <BookOpen className="h-4 w-4" />
                                            <span>{book._count.chapters} Kapitel</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-4 w-4" />
                                            <span>{book._count.characters} Charaktere</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="text-xs text-muted-foreground">
                                    Zuletzt bearbeitet: {new Date(book.updatedAt).toLocaleDateString("de-DE")}
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
