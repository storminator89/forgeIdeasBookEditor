"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
    Search,
    X,
    FileText,
    User,
    GitBranch,
    Globe,
    Loader2,
    ChevronRight,
    Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
    type: "chapter" | "character" | "plotpoint" | "worldelement";
    id: string;
    title: string;
    matchField: string;
    context: string;
    orderIndex?: number;
}

interface GlobalSearchProps {
    bookId: string;
    onNavigateToChapter?: (chapterId: string) => void;
    onNavigateToTab?: (tab: string, itemId?: string) => void;
}

const TYPE_CONFIG = {
    chapter: { icon: FileText, label: "Kapitel", color: "text-blue-500", bg: "bg-blue-500/10" },
    character: { icon: User, label: "Charakter", color: "text-purple-500", bg: "bg-purple-500/10" },
    plotpoint: { icon: GitBranch, label: "Handlung", color: "text-pink-500", bg: "bg-pink-500/10" },
    worldelement: { icon: Globe, label: "Welt", color: "text-green-500", bg: "bg-green-500/10" },
};

export default function GlobalSearch({ bookId, onNavigateToChapter, onNavigateToTab }: GlobalSearchProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [total, setTotal] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mounted, setMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // For SSR safety
    useEffect(() => {
        setMounted(true);
    }, []);

    // Perform search
    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.trim().length < 2) {
            setResults([]);
            setTotal(0);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(`/api/books/${bookId}/search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: searchQuery }),
            });

            if (response.ok) {
                const data = await response.json();
                setResults(data.results || []);
                setTotal(data.total || 0);
                setSelectedIndex(0);
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    }, [bookId]);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (query.trim().length >= 2) {
            debounceRef.current = setTimeout(() => {
                performSearch(query);
            }, 200);
        } else {
            setResults([]);
            setTotal(0);
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query, performSearch]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery("");
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Keyboard shortcut (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Handle keyboard navigation in results
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setIsOpen(false);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === "Enter" && results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
        }
    };

    // Highlight match in context
    const highlightMatch = (text: string, searchTerm: string) => {
        if (!text || !searchTerm) return text;

        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
        const parts = text.split(regex);

        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-yellow-300 dark:bg-yellow-700 px-0.5 rounded font-medium">
                    {part}
                </mark>
            ) : part
        );
    };

    const handleResultClick = (result: SearchResult) => {
        setIsOpen(false);

        if (result.type === "chapter") {
            if (onNavigateToChapter) {
                onNavigateToChapter(result.id);
            } else {
                router.push(`/books/${bookId}/chapter/${result.id}` as Route);
            }
        } else if (result.type === "character") {
            if (onNavigateToTab?.("characters", result.id)) return;
        } else if (result.type === "plotpoint") {
            if (onNavigateToTab?.("plot", result.id)) return;
        } else if (result.type === "worldelement") {
            if (onNavigateToTab?.("world", result.id)) return;
        }
    };

    // Modal content
    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <div
                className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl px-4"
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'fixed' }}
            >
                <div className="bg-popover border rounded-xl shadow-2xl overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b">
                        <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Kapitel, Charaktere, Handlung durchsuchen..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
                        />
                        {query && (
                            <button
                                onClick={() => {
                                    setQuery("");
                                    inputRef.current?.focus();
                                }}
                                className="p-1 hover:bg-muted rounded"
                            >
                                <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 border rounded"
                        >
                            ESC
                        </button>
                    </div>

                    {/* Results */}
                    <div className="max-h-[60vh] overflow-auto">
                        {isSearching ? (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-3" />
                                <span>Suche...</span>
                            </div>
                        ) : results.length === 0 && query.length >= 2 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p className="text-lg">Keine Ergebnisse für "{query}"</p>
                                <p className="text-sm mt-1">Versuche einen anderen Suchbegriff</p>
                            </div>
                        ) : results.length === 0 && query.length < 2 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <p className="text-sm">Gib mindestens 2 Zeichen ein, um zu suchen</p>
                            </div>
                        ) : (
                            <div className="py-2">
                                {results.map((result, index) => {
                                    const config = TYPE_CONFIG[result.type];
                                    const Icon = config.icon;
                                    const isSelected = index === selectedIndex;

                                    return (
                                        <button
                                            key={`${result.type}-${result.id}`}
                                            onClick={() => handleResultClick(result)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={cn(
                                                "w-full flex items-start gap-4 px-4 py-3 transition-colors text-left",
                                                isSelected ? "bg-accent" : "hover:bg-muted/50"
                                            )}
                                        >
                                            <div className={cn("mt-0.5 p-2 rounded-lg", config.bg)}>
                                                <Icon className={cn("h-4 w-4", config.color)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold">
                                                        {result.type === "chapter" && result.orderIndex !== undefined && (
                                                            <span className="text-muted-foreground font-normal mr-1">
                                                                Kap. {result.orderIndex + 1}:
                                                            </span>
                                                        )}
                                                        {result.title}
                                                    </span>
                                                    <span className={cn(
                                                        "text-xs px-2 py-0.5 rounded-full",
                                                        config.bg, config.color
                                                    )}>
                                                        {result.matchField}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {highlightMatch(result.context, query)}
                                                </p>
                                            </div>
                                            <ChevronRight className={cn(
                                                "h-5 w-5 mt-2 flex-shrink-0 transition-colors",
                                                isSelected ? "text-foreground" : "text-muted-foreground/50"
                                            )} />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {results.length > 0 && (
                        <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {total > results.length
                                    ? `${results.length} von ${total} Ergebnissen`
                                    : `${results.length} Ergebnis${results.length !== 1 ? "se" : ""}`
                                }
                            </span>
                            <div className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 bg-muted rounded border text-xs">↑↓</kbd>
                                <span>Navigieren</span>
                                <kbd className="px-1.5 py-0.5 bg-muted rounded border text-xs">↵</kbd>
                                <span>Öffnen</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-transparent hover:border-border transition-all"
            >
                <Search className="h-4 w-4" />
                <span className="flex-1 text-left">Suchen...</span>
                <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono bg-muted rounded border">
                    <Command className="h-3 w-3" />K
                </kbd>
            </button>

            {/* Portal Modal - render at document.body level */}
            {mounted && isOpen && createPortal(modalContent, document.body)}
        </>
    );
}
