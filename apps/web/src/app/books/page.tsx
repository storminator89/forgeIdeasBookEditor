"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowDownAZ,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookCover } from "@/components/book-cover";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

type Book = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  genre: string | null;
  updatedAt: string;
  createdAt: string;
  coverUrl: string | null;
  _count: { chapters: number; characters: number };
};

export default function BooksPage() {
  const { t, intlLocale } = useI18n();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [genre, setGenre] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [deleteBook, setDeleteBook] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/books");
      if (!response.ok) throw new Error("Unable to load books");
      setBooks(await response.json());
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("forge-library-view");
      if (saved === "list") setView(saved);
    } catch {
      /* Storage may be unavailable. */
    }
  }, []);
  const changeView = (value: "grid" | "list") => {
    setView(value);
    try {
      localStorage.setItem("forge-library-view", value);
    } catch {
      /* Keep session preference. */
    }
  };
  const genres = useMemo(
    () =>
      Array.from(
        new Set(
          books
            .map((b) => b.genre)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, intlLocale)),
    [books, intlLocale],
  );
  const filteredBooks = useMemo(
    () =>
      books
        .filter((book) => {
          const text = [book.title, book.description, book.genre, book.author]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase(intlLocale);
          return (
            text.includes(searchQuery.trim().toLocaleLowerCase(intlLocale)) &&
            (genre === "all" || book.genre === genre)
          );
        })
        .sort((a, b) =>
          sortBy === "title"
            ? a.title.localeCompare(b.title, intlLocale)
            : new Date(
                sortBy === "newest" ? b.createdAt : b.updatedAt,
              ).getTime() -
              new Date(
                sortBy === "newest" ? a.createdAt : a.updatedAt,
              ).getTime(),
        ),
    [books, searchQuery, genre, sortBy, intlLocale],
  );
  const latestBook = useMemo(
    () =>
      [...books].sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      )[0],
    [books],
  );
  const totals = books.reduce(
    (sum, book) => ({
      chapters: sum.chapters + book._count.chapters,
      characters: sum.characters + book._count.characters,
    }),
    { chapters: 0, characters: 0 },
  );
  const resetFilters = () => {
    setSearchQuery("");
    setGenre("all");
  };
  const handleDelete = async () => {
    if (!deleteBook) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/books/${deleteBook.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");
      setBooks((previous) =>
        previous.filter((book) => book.id !== deleteBook.id),
      );
      if (
        genre === deleteBook.genre &&
        books.filter((book) => book.genre === genre).length === 1
      )
        setGenre("all");
      setDeleteBook(null);
      toast.success(
        t({ de: "Buchprojekt gelöscht", en: "Book project deleted" }),
      );
    } catch {
      toast.error(
        t({
          de: "Das Buch konnte nicht gelöscht werden. Bitte versuche es erneut.",
          en: "The book could not be deleted. Please try again.",
        }),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="library-page">
      <div className="page-heading">
        <div>
          <div className="page-eyebrow">
            <span className="status-dot" />
            YOUR NEXT CHAPTER
          </div>
          <h1>
            {t({
              de: "Deine Geschichten beginnen hier.",
              en: "Your stories start here.",
            })}
          </h1>
          <p>
            {t({
              de: "Große Ideen verdienen einen Ort, an dem sie wachsen können.",
              en: "Great ideas deserve a place to grow.",
            })}
          </p>
        </div>
        <Link
          href="/books/new"
          className={cn(buttonVariants({ size: "lg" }), "new-project-button")}
        >
          <Plus size={18} />
          {t({ de: "Neues Buch", en: "New book" })}
        </Link>
      </div>

      <section className="library-hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <span className="hero-kicker">
            <Sparkles size={14} />
            {t({
              de: "VON DER IDEE ZUM MANUSKRIPT",
              en: "FROM IDEA TO MANUSCRIPT",
            })}
          </span>
          <h2 id="hero-heading">
            {t({ de: "Eine Idee ist erst", en: "An idea is just" })}
            <br />
            <span>{t({ de: "der Anfang.", en: "the beginning." })}</span>
          </h2>
          <p>
            {t({
              de: "Erschaffe Welten. Gib Figuren eine Stimme. Schreib das Buch, das nur du schreiben kannst.",
              en: "Build worlds. Give characters a voice. Write the book only you can write.",
            })}
          </p>
          <Link
            href={
              latestBook ? (`/books/${latestBook.id}` as Route) : "/books/new"
            }
            className="hero-action"
          >
            {latestBook
              ? t({ de: "Weiterschreiben", en: "Keep writing" })
              : t({
                  de: "Dein erstes Kapitel",
                  en: "Start your first chapter",
                })}
            <ArrowUpRight size={18} />
          </Link>
          <span className="hero-footnote">
            {latestBook
              ? latestBook.title
              : t({
                  de: "Deine Geschichte. Dein Tempo. Dein Studio.",
                  en: "Your story. Your pace. Your studio.",
                })}
          </span>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-art-ring" />
          <BookCover
            title={t({ de: "Zwischen den Sternen", en: "Between the stars" })}
            genre="SCIENCE FICTION"
            className="hero-book hero-book-back"
            decorative
          />
          <BookCover
            title={t({
              de: "Alles, was noch kommt",
              en: "All that lies ahead",
            })}
            genre="A NEW STORY"
            className="hero-book hero-book-front"
            decorative
          />
          <span className="hero-art-caption">
            <span />
            MADE OF IDEAS.
          </span>
          <Sparkles className="hero-spark" size={30} />
        </div>
        <span className="hero-index" aria-hidden="true">
          01 — CREATE SOMETHING GREAT
        </span>
      </section>

      <div
        className="library-stats"
        aria-label={t({
          de: "Deine Bibliothek in Zahlen",
          en: "Your library in numbers",
        })}
      >
        {[
          {
            icon: BookOpen,
            value: books.length,
            label: t({ de: "Buchprojekte", en: "Book projects" }),
            tone: "mint",
          },
          {
            icon: FileText,
            value: totals.chapters,
            label: t({ de: "Kapitel voller Ideen", en: "Chapters of ideas" }),
            tone: "violet",
          },
          {
            icon: Users,
            value: totals.characters,
            label: t({
              de: "Charaktere mit Geschichte",
              en: "Characters with a story",
            }),
            tone: "peach",
          },
        ].map(({ icon: Icon, value, label, tone }) => (
          <div className="library-stat" key={tone}>
            <span className={`stat-icon stat-${tone}`}>
              <Icon size={20} />
            </span>
            <div>
              <strong>
                {isLoading
                  ? "—"
                  : loadError
                    ? "—"
                    : value.toLocaleString(intlLocale)}
              </strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>

      <section
        className="library-collection"
        aria-labelledby="collection-heading"
      >
        <div className="collection-heading">
          <div>
            <h2 id="collection-heading">
              {t({ de: "Deine Bibliothek", en: "Your library" })}
              <span>{isLoading ? "…" : books.length}</span>
            </h2>
            <p>
              {t({
                de: "Aus Gedanken werden Geschichten.",
                en: "Where thoughts become stories.",
              })}
            </p>
          </div>
          <div
            className="view-switch"
            role="group"
            aria-label={t({ de: "Ansicht", en: "View" })}
          >
            <button
              onClick={() => changeView("grid")}
              aria-pressed={view === "grid"}
              aria-label={t({ de: "Kartenansicht", en: "Grid view" })}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              onClick={() => changeView("list")}
              aria-pressed={view === "list"}
              aria-label={t({ de: "Listenansicht", en: "List view" })}
            >
              <List size={19} />
            </button>
          </div>
        </div>
        <div className="collection-toolbar">
          <div className="library-search">
            <Search size={18} />
            <Input
              id="book-search"
              aria-label={t({
                de: "Bibliothek durchsuchen",
                en: "Search library",
              })}
              placeholder={t({
                de: "Titel, Genre oder Idee suchen …",
                en: "Search title, genre or idea …",
              })}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label={t({ de: "Suche löschen", en: "Clear search" })}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="library-sort">
            <ArrowDownAZ size={16} />
            <select
              aria-label={t({ de: "Sortieren nach", en: "Sort by" })}
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="updated">
                {t({ de: "Zuletzt bearbeitet", en: "Recently updated" })}
              </option>
              <option value="newest">
                {t({ de: "Zuletzt erstellt", en: "Newest created" })}
              </option>
              <option value="title">
                {t({ de: "Titel A–Z", en: "Title A–Z" })}
              </option>
            </select>
          </div>
        </div>
        {genres.length > 0 && (
          <div
            className="genre-filters"
            role="group"
            aria-label={t({ de: "Nach Genre filtern", en: "Filter by genre" })}
          >
            {["all", ...genres].map((value) => (
              <button
                key={value}
                onClick={() => setGenre(value)}
                aria-pressed={genre === value}
              >
                {value === "all"
                  ? t({ de: "Alle Projekte", en: "All projects" })
                  : value}
              </button>
            ))}
          </div>
        )}
        <div className="sr-only" role="status" aria-live="polite">
          {!isLoading &&
            t(
              {
                de: "{{count}} Buchprojekte gefunden",
                en: "{{count}} book projects found",
              },
              { count: filteredBooks.length },
            )}
        </div>
        {isLoading ? (
          <div
            className="book-grid"
            aria-busy="true"
            aria-label={t({
              de: "Bibliothek wird geladen",
              en: "Loading library",
            })}
          >
            {[1, 2, 3].map((key) => (
              <div className="book-skeleton" key={key}>
                <div />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="library-empty" role="alert">
            <BookOpen size={32} />
            <h3>
              {t({
                de: "Deine Bibliothek ist gerade nicht erreichbar.",
                en: "Your library is currently unavailable.",
              })}
            </h3>
            <p>
              {t({
                de: "Versuche es noch einmal, um deine Buchprojekte zu laden.",
                en: "Try again to load your book projects.",
              })}
            </p>
            <Button onClick={() => void loadBooks()}>
              {t({ de: "Erneut versuchen", en: "Try again" })}
            </Button>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="library-empty">
            <span className="empty-icon">
              {books.length ? <Search size={30} /> : <FeatherIcon />}
            </span>
            <h3>
              {books.length
                ? t({
                    de: "Noch keine passende Geschichte.",
                    en: "No matching stories yet.",
                  })
                : t({
                    de: "Alles beginnt mit einer Idee.",
                    en: "It all starts with an idea.",
                  })}
            </h3>
            <p>
              {books.length
                ? t({
                    de: "Probiere einen anderen Suchbegriff oder setze die Filter zurück.",
                    en: "Try another search term or reset your filters.",
                  })
                : t({
                    de: "Starte ein leeres Buch, entwickle deine Idee mit KI oder importiere dein Manuskript.",
                    en: "Start a blank book, develop your idea with AI or import your manuscript.",
                  })}
            </p>
            {books.length ? (
              <Button variant="outline" onClick={resetFilters}>
                {t({ de: "Filter zurücksetzen", en: "Reset filters" })}
              </Button>
            ) : (
              <Link href="/books/new" className={buttonVariants()}>
                <Plus size={17} />
                {t({
                  de: "Erstes Buch erstellen",
                  en: "Create your first book",
                })}
              </Link>
            )}
          </div>
        ) : (
          <div className={cn(view === "grid" ? "book-grid" : "book-list")}>
            {filteredBooks.map((book) => (
              <article className="library-book" key={book.id}>
                <Link
                  className="book-open-link"
                  href={`/books/${book.id}` as Route}
                  aria-label={t(
                    { de: "{{title}} öffnen", en: "Open {{title}}" },
                    { title: book.title },
                  )}
                >
                  <div className="book-art-stage">
                    <BookCover
                      title={book.title}
                      genre={book.genre}
                      coverUrl={book.coverUrl}
                      decorative
                    />
                    <span className="book-open-indicator">
                      <ArrowUpRight size={19} />
                    </span>
                  </div>
                  <div className="book-details">
                    <span className="book-genre">
                      {book.genre ||
                        t({ de: "Deine Geschichte", en: "Your story" })}
                    </span>
                    <h3>{book.title}</h3>
                    <p>
                      {book.description ||
                        t({
                          de: "Die nächste große Geschichte wartet auf dich.",
                          en: "Your next great story is waiting for you.",
                        })}
                    </p>
                    <div className="book-meta">
                      <span>
                        <FileText size={13} />
                        {book._count.chapters}{" "}
                        {t({ de: "Kapitel", en: "chapters" })}
                      </span>
                      <span>
                        <Users size={13} />
                        {book._count.characters}
                      </span>
                    </div>
                    <div className="book-date">
                      <time dateTime={book.updatedAt}>
                        {new Date(book.updatedAt).toLocaleDateString(
                          intlLocale,
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </time>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
                <button
                  className="book-delete"
                  aria-label={t(
                    { de: "{{title}} löschen", en: "Delete {{title}}" },
                    { title: book.title },
                  )}
                  onClick={() => setDeleteBook(book)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
            <Link href="/books/new" className="add-book-card">
              <span>
                <Plus size={25} />
              </span>
              <strong>
                {t({
                  de: "Platz für deine nächste Idee",
                  en: "Room for your next idea",
                })}
              </strong>
              <p>
                {t({
                  de: "Ein neues Kapitel beginnt mit dir.",
                  en: "A new chapter starts with you.",
                })}
              </p>
              <span className="add-book-action">
                {t({ de: "Buch erstellen", en: "Create book" })}
                <ArrowUpRight size={15} />
              </span>
            </Link>
          </div>
        )}
      </section>
      <footer className="library-footer">
        <span>FORGE STUDIO</span>
        <span>
          {t({
            de: "Für Geschichten, die bleiben.",
            en: "For stories that stay.",
          })}
        </span>
        <FeatherIcon />
      </footer>
      <Dialog
        open={Boolean(deleteBook)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteBook(null);
        }}
      >
        <DialogContent showCloseButton={!isDeleting}>
          <DialogHeader>
            <DialogTitle>
              {t({ de: "Buchprojekt löschen?", en: "Delete book project?" })}
            </DialogTitle>
            <DialogDescription>
              {t(
                {
                  de: "„{{title}}“ und alle zugehörigen Kapitel, Charaktere und Weltelemente werden unwiderruflich gelöscht.",
                  en: "“{{title}}” and all its chapters, characters and world elements will be permanently deleted.",
                },
                { title: deleteBook?.title || "" },
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteBook(null)}
            >
              {t({ de: "Behalten", en: "Keep book" })}
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {t({ de: "Endgültig löschen", en: "Permanently delete" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function FeatherIcon() {
  return <BookOpen size={22} strokeWidth={1.5} />;
}
