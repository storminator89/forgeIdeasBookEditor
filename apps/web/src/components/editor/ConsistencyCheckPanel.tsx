"use client";

import { useState, useMemo } from "react";
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
import { useI18n } from "@/components/locale-provider";

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

export default function ConsistencyCheckPanel({ bookId, onNavigateToChapter }: Props) {
    const { t, intlLocale } = useI18n();
    const [isChecking, setIsChecking] = useState(false);
    const [result, setResult] = useState<ConsistencyCheckResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

    const issueTypeConfig = useMemo(() => ({
        character: { icon: User, label: t({ de: "Charakter", en: "Character" }), color: "text-purple-500" },
        timeline: { icon: Clock, label: t({ de: "Timeline", en: "Timeline" }), color: "text-blue-500" },
        object: { icon: Package, label: t({ de: "Objekt", en: "Object" }), color: "text-orange-500" },
        location: { icon: MapPin, label: t({ de: "Ort", en: "Location" }), color: "text-green-500" },
        plot: { icon: GitBranch, label: t({ de: "Handlung", en: "Plot" }), color: "text-pink-500" },
        other: { icon: HelpCircle, label: t({ de: "Sonstiges", en: "Other" }), color: "text-gray-500" },
    }), [t]);

    const runCheck = async () => {
        setIsChecking(true);
        setError(null);

        try {
            const response = await fetch(`/api/books/${bookId}/ai/consistency-check`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || t({ de: "Prüfung fehlgeschlagen", en: "Check failed" }));
            }

            const data = await response.json();
            setResult(data);

            // Auto-expand all issues on first load
            setExpandedIssues(new Set(data.issues.map((i: ConsistencyIssue) => i.id)));
        } catch (err) {
            setError(err instanceof Error ? err.message : t({ de: "Unbekannter Fehler", en: "Unknown error" }));
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
        return new Date(isoString).toLocaleString(intlLocale, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const errorCount = result?.issues.filter(i => i.severity === "error").length || 0;
    const warningCount = result?.issues.filter(i => i.severity === "warning").length || 0;

    const criticalLabel = errorCount === 1
        ? t({ de: "1 kritisch", en: "1 critical" })
        : t({ de: "{{count}} kritisch", en: "{{count}} critical" }, { count: errorCount });

    const warningLabel = warningCount === 1
        ? t({ de: "1 Warnung", en: "1 warning" })
        : t({ de: "{{count}} Warnungen", en: "{{count}} warnings" }, { count: warningCount });

    return (
        <Card className="border-dashed">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-chart-3/10">
                            <FileSearch className="h-5 w-5 text-chart-3" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{t({ de: "Konsistenzprüfung", en: "Consistency check" })}</CardTitle>
                            <CardDescription>
                                {t({ de: "KI-basierte Analyse auf Widersprüche und Logikfehler", en: "AI-based analysis for inconsistencies and logic errors" })}
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
                                {t({ de: "Prüfe...", en: "Checking..." })}
                            </>
                        ) : result ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t({ de: "Erneut prüfen", en: "Check again" })}
                            </>
                        ) : (
                            <>
                                <FileSearch className="h-4 w-4 mr-2" />
                                {t({ de: "Jetzt prüfen", en: "Check now" })}
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
                            <p className="font-medium">{t({ de: "Fehler bei der Prüfung", en: "Error during check" })}</p>
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
                        <p className="font-medium">{t({ de: "Analysiere dein Buch...", en: "Analyzing your book..." })}</p>
                        <p className="text-sm">{t({ de: "Dies kann je nach Buchlänge einige Sekunden dauern.", en: "This can take a few seconds depending on book length." })}</p>
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
                                        {errorCount > 0 && criticalLabel}
                                        {errorCount > 0 && warningCount > 0 && ", "}
                                        {warningCount > 0 && warningLabel}
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
                                    const config = issueTypeConfig[issue.type] || issueTypeConfig.other;
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
                                                            {issue.severity === "error"
                                                                ? t({ de: "Kritisch", en: "Critical" })
                                                                : t({ de: "Warnung", en: "Warning" })}
                                                        </span>
                                                        <span>{config.label}</span>
                                                        {issue.chapters.length > 0 && (
                                                            <span>
                                                                • {issue.chapters.length === 1
                                                                    ? t({ de: "Kapitel", en: "Chapter" })
                                                                    : t({ de: "Kapitel", en: "Chapters" })}
                                                                {" "}{issue.chapters.join(", ")}
                                                            </span>
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
                                                        <p className="text-sm text-muted-foreground mb-1">{t({ de: "Beschreibung", en: "Description" })}</p>
                                                        <p className="text-sm">{issue.description}</p>
                                                    </div>

                                                    {issue.suggestion && (
                                                        <div>
                                                            <p className="text-sm text-muted-foreground mb-1">{t({ de: "Vorschlag", en: "Suggestion" })}</p>
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
                                                                    {t({ de: "Zu Kapitel", en: "Go to chapter" })} {chapterNum}
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
                                <h3 className="font-semibold text-lg mb-1">{t({ de: "Keine Probleme gefunden!", en: "No issues found!" })}</h3>
                                <p className="text-muted-foreground text-sm max-w-md">
                                    {t({
                                        de: "Die KI hat keine offensichtlichen Widersprüche oder Inkonsistenzen in deinem Buch gefunden.",
                                        en: "The AI found no obvious inconsistencies or contradictions in your book.",
                                    })}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Initial State */}
                {!result && !isChecking && !error && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileSearch className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="font-semibold mb-1">{t({ de: "Noch keine Prüfung durchgeführt", en: "No check run yet" })}</h3>
                        <p className="text-muted-foreground text-sm max-w-md mb-4">
                            {t({
                                de: "Klicke auf \"Jetzt prüfen\", um dein Buch auf Widersprüche und Inkonsistenzen zu analysieren.",
                                en: "Click \"Check now\" to analyze your book for inconsistencies.",
                            })}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
