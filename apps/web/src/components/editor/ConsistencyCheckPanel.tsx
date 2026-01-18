"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    FileSearch,
    Loader2,
    RefreshCw,
    User,
    Clock,
    Package,
    MapPin,
    GitBranch,
    HelpCircle,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConsistencyIssue {
    id: string;
    type: "character" | "timeline" | "object" | "location" | "plot" | "other";
    severity: "warning" | "error";
    title: string;
    description: string;
    chapters: number[];
    suggestion: string;
}

interface ConsistencyCheckResult {
    issues: ConsistencyIssue[];
    summary: string;
    checkedAt: string;
}

type Props = {
    bookId: string;
    onNavigateToChapter?: (chapterIndex: number) => void;
};

const ISSUE_TYPE_CONFIG: Record<string, { icon: typeof User; label: string; color: string }> = {
    character: { icon: User, label: "Charakter", color: "text-purple-500" },
    timeline: { icon: Clock, label: "Timeline", color: "text-blue-500" },
    object: { icon: Package, label: "Objekt", color: "text-orange-500" },
    location: { icon: MapPin, label: "Ort", color: "text-green-500" },
    plot: { icon: GitBranch, label: "Handlung", color: "text-pink-500" },
    other: { icon: HelpCircle, label: "Sonstiges", color: "text-gray-500" },
};

export default function ConsistencyCheckPanel({ bookId, onNavigateToChapter }: Props) {
    const [isChecking, setIsChecking] = useState(false);
    const [result, setResult] = useState<ConsistencyCheckResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

    const runCheck = async () => {
        setIsChecking(true);
        setError(null);

        try {
            const response = await fetch(`/api/books/${bookId}/ai/consistency-check`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Prüfung fehlgeschlagen");
            }

            const data = await response.json();
            setResult(data);

            // Auto-expand all issues on first load
            setExpandedIssues(new Set(data.issues.map((i: ConsistencyIssue) => i.id)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unbekannter Fehler");
        } finally {
            setIsChecking(false);
        }
    };

    const toggleIssue = (id: string) => {
        setExpandedIssues(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const errorCount = result?.issues.filter(i => i.severity === "error").length || 0;
    const warningCount = result?.issues.filter(i => i.severity === "warning").length || 0;

    return (
        <Card className="border-dashed">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-chart-3/10">
                            <FileSearch className="h-5 w-5 text-chart-3" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Konsistenzprüfung</CardTitle>
                            <CardDescription>
                                KI-basierte Analyse auf Widersprüche und Logikfehler
                            </CardDescription>
                        </div>
                    </div>
                    <Button
                        onClick={runCheck}
                        disabled={isChecking}
                        variant={result ? "outline" : "default"}
                    >
                        {isChecking ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Prüfe...
                            </>
                        ) : result ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Erneut prüfen
                            </>
                        ) : (
                            <>
                                <FileSearch className="h-4 w-4 mr-2" />
                                Jetzt prüfen
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Error State */}
                {error && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium">Fehler bei der Prüfung</p>
                            <p className="text-sm opacity-90">{error}</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setError(null)}
                            className="text-destructive hover:text-destructive"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Loading State */}
                {isChecking && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mb-4" />
                        <p className="font-medium">Analysiere dein Buch...</p>
                        <p className="text-sm">Dies kann je nach Buchlänge einige Sekunden dauern.</p>
                    </div>
                )}

                {/* Results */}
                {result && !isChecking && (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className={cn(
                            "flex items-center gap-3 p-4 rounded-lg",
                            result.issues.length === 0
                                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                : errorCount > 0
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                        )}>
                            {result.issues.length === 0 ? (
                                <CheckCircle2 className="h-5 w-5" />
                            ) : (
                                <AlertTriangle className="h-5 w-5" />
                            )}
                            <div className="flex-1">
                                <p className="font-medium">{result.summary}</p>
                                {result.issues.length > 0 && (
                                    <p className="text-sm opacity-90">
                                        {errorCount > 0 && `${errorCount} kritisch`}
                                        {errorCount > 0 && warningCount > 0 && ", "}
                                        {warningCount > 0 && `${warningCount} Warnung(en)`}
                                    </p>
                                )}
                            </div>
                            <span className="text-xs opacity-70">
                                {formatDate(result.checkedAt)}
                            </span>
                        </div>

                        {/* Issues List */}
                        {result.issues.length > 0 && (
                            <div className="space-y-2">
                                {result.issues.map((issue) => {
                                    const config = ISSUE_TYPE_CONFIG[issue.type] || ISSUE_TYPE_CONFIG.other;
                                    const Icon = config.icon;
                                    const isExpanded = expandedIssues.has(issue.id);

                                    return (
                                        <div
                                            key={issue.id}
                                            className={cn(
                                                "border rounded-lg overflow-hidden transition-colors",
                                                issue.severity === "error"
                                                    ? "border-destructive/50"
                                                    : "border-yellow-500/50"
                                            )}
                                        >
                                            {/* Issue Header */}
                                            <button
                                                onClick={() => toggleIssue(issue.id)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                                            >
                                                <div className={cn(
                                                    "p-1.5 rounded",
                                                    issue.severity === "error"
                                                        ? "bg-destructive/10"
                                                        : "bg-yellow-500/10"
                                                )}>
                                                    <Icon className={cn("h-4 w-4", config.color)} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{issue.title}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span className={cn(
                                                            "px-1.5 py-0.5 rounded text-xs font-medium",
                                                            issue.severity === "error"
                                                                ? "bg-destructive/10 text-destructive"
                                                                : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                                                        )}>
                                                            {issue.severity === "error" ? "Kritisch" : "Warnung"}
                                                        </span>
                                                        <span>{config.label}</span>
                                                        {issue.chapters.length > 0 && (
                                                            <span>• Kapitel {issue.chapters.join(", ")}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </button>

                                            {/* Issue Details */}
                                            {isExpanded && (
                                                <div className="px-3 pb-3 pt-0 space-y-3 border-t bg-muted/30">
                                                    <div className="pt-3">
                                                        <p className="text-sm text-muted-foreground mb-1">Beschreibung</p>
                                                        <p className="text-sm">{issue.description}</p>
                                                    </div>

                                                    {issue.suggestion && (
                                                        <div>
                                                            <p className="text-sm text-muted-foreground mb-1">Vorschlag</p>
                                                            <p className="text-sm bg-background p-2 rounded border">
                                                                {issue.suggestion}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {issue.chapters.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {issue.chapters.map((chapterNum) => (
                                                                <Button
                                                                    key={chapterNum}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => onNavigateToChapter?.(chapterNum - 1)}
                                                                    className="text-xs"
                                                                >
                                                                    Zu Kapitel {chapterNum}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* No Issues */}
                        {result.issues.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                                <h3 className="font-semibold text-lg mb-1">Keine Probleme gefunden!</h3>
                                <p className="text-muted-foreground text-sm max-w-md">
                                    Die KI hat keine offensichtlichen Widersprüche oder Inkonsistenzen in deinem Buch gefunden.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Initial State */}
                {!result && !isChecking && !error && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileSearch className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="font-semibold mb-1">Noch keine Prüfung durchgeführt</h3>
                        <p className="text-muted-foreground text-sm max-w-md mb-4">
                            Klicke auf "Jetzt prüfen", um dein Buch auf Widersprüche und Inkonsistenzen zu analysieren.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
