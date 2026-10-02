"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    Sparkles,
    PenTool,
    Upload,
    FileText,
    File,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    Check,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StoryWizard from "@/components/wizard/StoryWizard";
import { useI18n } from "@/components/locale-provider";

type CreationMode = "select" | "manual" | "wizard" | "import";

export default function NewBookPage() {
    const { t } = useI18n();
    const router = useRouter();
    const [mode, setMode] = useState<CreationMode>("select");
    const [isLoading, setIsLoading] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [aiModel, setAiModel] = useState<string>("");
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        genre: "",
        targetAudience: "",
        writingStyle: "",
    });

    // Import state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importTitle, setImportTitle] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{
        success: boolean;
        message: string;
        bookId?: string;
        chaptersImported?: number;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if global AI settings are configured
    useEffect(() => {
        async function checkAISettings() {
            try {
                const response = await fetch("/api/settings");
                if (response.ok) {
                    const settings = await response.json();
                    setHasApiKey(!!settings.hasApiKey);
                    setAiModel(settings.model || "");
                }
            } catch (error) {
                console.error("Error loading global settings:", error);
            } finally {
                setLoadingSettings(false);
            }
        }
        checkAISettings();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return;

        setIsLoading(true);
        try {
            const response = await fetch("/api/books", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error("Failed to create book");

            const book = await response.json();
            router.push(`/books/${book.id}` as Route);
        } catch (error) {
            console.error("Error creating book:", error);
            toast.error(
                t({
                    de: "Das Buch konnte nicht erstellt werden. Bitte versuche es erneut.",
                    en: "Could not create your book. Please try again.",
                }),
            );
            setIsLoading(false);
        }
    };

    const selectFile = (file: File | undefined) => {
        if (file && !/\.(docx|txt|md)$/i.test(file.name)) {
            toast.error(
                t({
                    de: "Bitte eine DOCX-, TXT- oder Markdown-Datei auswählen.",
                    en: "Please select a DOCX, TXT or Markdown file.",
                }),
            );
            return;
        }
        if (file) {
            setSelectedFile(file);
            // Use filename as default title
            if (!importTitle) {
                const fileName = file.name
                    .replace(/\.[^.]+$/, "")
                    .replace(/[_-]/g, " ");
                setImportTitle(fileName);
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) =>
        selectFile(e.target.files?.[0]);

    const handleImport = async () => {
        if (!selectedFile) return;

        setIsImporting(true);
        setImportResult(null);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("title", importTitle);

            const response = await fetch("/api/books/import", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setImportResult({
                    success: true,
                    message: data.message,
                    bookId: data.book.id,
                    chaptersImported: data.chaptersImported,
                });
            } else {
                setImportResult({
                    success: false,
                    message:
                        data.error ||
                        t({ de: "Import fehlgeschlagen", en: "Import failed" }),
                });
            }
        } catch (error) {
            console.error("Import error:", error);
            setImportResult({
                success: false,
                message: t({
                    de: "Ein unerwarteter Fehler ist aufgetreten",
                    en: "An unexpected error occurred",
                }),
            });
        } finally {
            setIsImporting(false);
        }
    };

    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith(".docx"))
            return <FileText className="h-8 w-8 text-blue-500" />;
        if (fileName.endsWith(".md"))
            return <File className="h-8 w-8 text-purple-500" />;
        return <File className="h-8 w-8 text-gray-500" />;
    };

    // Mode selection screen
    if (mode === "select") {
        return (
            <main className="creation-page">
                <Link href="/books" className="creation-back">
                    <ArrowLeft size={15} />
                    {t({ de: "Zur Bibliothek", en: "Back to library" })}
                </Link>
                <div className="creation-intro">
                    <span className="page-eyebrow">
                        A BLANK PAGE. INFINITE POSSIBILITIES.
                    </span>
                    <h1>
                        {t({
                            de: "Was ist deine nächste",
                            en: "What's your next",
                        })}
                        <br />
                        <span>
                            {t({ de: "große Geschichte?", en: "great story?" })}
                        </span>
                    </h1>
                    <p>
                        {t({
                            de: "Eine erste Idee, ein leeres Blatt oder ein fertiger Entwurf – finde deinen Einstieg. Den Rest schreibst du.",
                            en: "A first idea, a blank page or an existing draft — find your starting point. You write the rest.",
                        })}
                    </p>
                </div>
                <div className="creation-options">
                    <section className="creation-option creation-ai">
                        <span className="creation-number">01 / CO-CREATE</span>
                        <span className="creation-option-icon">
                            <Sparkles size={28} />
                        </span>
                        <h2>
                            {t({
                                de: "Eine Idee. Viele Möglichkeiten.",
                                en: "One idea. Endless possibilities.",
                            })}
                        </h2>
                        <p>
                            {t({
                                de: "Entwickle mit dem KI Story-Wizard deine Figuren, Handlung und Welt. Deine Kreativität gibt die Richtung vor.",
                                en: "Develop your characters, plot and world with the AI story wizard. Your creativity sets the direction.",
                            })}
                        </p>
                        <div className="creation-option-footer">
                            {loadingSettings ? (
                                <span className="flex items-center gap-2 text-xs">
                                    <Loader2
                                        size={15}
                                        className="animate-spin"
                                    />
                                    {t({
                                        de: "KI-Verbindung prüfen …",
                                        en: "Checking AI connection …",
                                    })}
                                </span>
                            ) : hasApiKey ? (
                                <>
                                    <span className="creation-ready">
                                        <Check size={13} />
                                        {aiModel}
                                    </span>
                                    <Button
                                        onClick={() => setMode("wizard")}
                                        className="w-full"
                                    >
                                        {t({
                                            de: "Mit KI entwickeln",
                                            en: "Create with AI",
                                        })}
                                        <ArrowUpRight size={16} />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <span className="creation-hint">
                                        {t({
                                            de: "Verbinde zuerst deinen KI-Anbieter.",
                                            en: "Connect your AI provider first.",
                                        })}
                                    </span>
                                    <Link
                                        href="/settings"
                                        className="creation-settings-link"
                                    >
                                        {t({
                                            de: "KI einrichten",
                                            en: "Set up AI",
                                        })}
                                        <ArrowUpRight size={16} />
                                    </Link>
                                </>
                            )}
                        </div>
                    </section>
                    <button
                        type="button"
                        className="creation-option creation-manual"
                        onClick={() => setMode("manual")}
                    >
                        <span className="creation-number">02 / WRITE</span>
                        <span className="creation-option-icon">
                            <PenTool size={28} />
                        </span>
                        <h2>
                            {t({
                                de: "Dein Buch. Deine Regeln.",
                                en: "Your book. Your rules.",
                            })}
                        </h2>
                        <p>
                            {t({
                                de: "Starte mit einem leeren Projekt. Plane in deinem Tempo und lass Wort für Wort deine Geschichte entstehen.",
                                en: "Start with a blank project. Plan at your own pace and let your story unfold word by word.",
                            })}
                        </p>
                        <span className="creation-option-footer">
                            <span className="creation-option-action">
                                {t({
                                    de: "Mit leerem Buch starten",
                                    en: "Start with a blank book",
                                })}
                                <ArrowUpRight size={16} />
                            </span>
                        </span>
                    </button>
                    <button
                        type="button"
                        className="creation-option creation-import"
                        onClick={() => setMode("import")}
                    >
                        <span className="creation-number">
                            03 / BRING YOUR STORY
                        </span>
                        <span className="creation-option-icon">
                            <Upload size={28} />
                        </span>
                        <h2>
                            {t({
                                de: "Schon mittendrin?",
                                en: "Already in the middle?",
                            })}
                        </h2>
                        <p>
                            {t({
                                de: "Bring dein Manuskript mit. Importiere DOCX, TXT oder Markdown – die Kapitelaufteilung übernehmen wir.",
                                en: "Bring your manuscript. Import DOCX, TXT or Markdown — we'll take care of splitting chapters.",
                            })}
                        </p>
                        <span className="creation-option-footer">
                            <span className="creation-option-action">
                                {t({
                                    de: "Manuskript importieren",
                                    en: "Import manuscript",
                                })}
                                <ArrowUpRight size={16} />
                            </span>
                        </span>
                    </button>
                </div>
                <p className="creation-bottom-note">
                    {t({
                        de: "Vom ersten Satz bis zum letzten Kapitel. Alles an einem Ort.",
                        en: "From the first sentence to the last chapter. All in one place.",
                    })}
                </p>
            </main>
        );
    }

    // AI Wizard mode
    if (mode === "wizard" && hasApiKey) {
        return (
            <div className="creation-form-page container mx-auto py-10 px-5 max-w-3xl">
                <button
                    onClick={() => setMode("select")}
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t({ de: "Zurück zur Auswahl", en: "Back to selection" })}
                </button>

                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Sparkles className="h-8 w-8 text-purple-500" />
                    {t({ de: "KI Story-Wizard", en: "AI story wizard" })}
                </h1>
                <p className="text-muted-foreground mb-8">
                    {t({
                        de: "Lass die KI dir helfen, deine Geschichte zu entwickeln.",
                        en: "Let AI help you develop your story.",
                    })}
                </p>

                <StoryWizard onCancel={() => setMode("select")} />
            </div>
        );
    }

    // Import mode
    if (mode === "import") {
        return (
            <div className="creation-form-page container mx-auto py-10 px-5 max-w-2xl">
                <button
                    onClick={() => {
                        setMode("select");
                        setSelectedFile(null);
                        setImportTitle("");
                        setImportResult(null);
                    }}
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t({ de: "Zurück zur Auswahl", en: "Back to selection" })}
                </button>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <Upload className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">
                                    {t({
                                        de: "Werk importieren",
                                        en: "Import work",
                                    })}
                                </CardTitle>
                                <CardDescription>
                                    {t({
                                        de: "Lade dein bestehendes Werk hoch und wir teilen es automatisch in Kapitel auf.",
                                        en: "Upload your existing work and we'll automatically split it into chapters.",
                                    })}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Success State */}
                        {importResult?.success && (
                            <div className="flex flex-col items-center py-8 text-center">
                                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                                <h3 className="text-xl font-semibold mb-2">
                                    {t({
                                        de: "Import erfolgreich!",
                                        en: "Import successful!",
                                    })}
                                </h3>
                                <p className="text-muted-foreground mb-6">
                                    {importResult.message}
                                </p>
                                <Button
                                    onClick={() =>
                                        router.push(
                                            `/books/${importResult.bookId}` as Route,
                                        )
                                    }
                                    size="lg"
                                >
                                    {t({ de: "Zum Buch", en: "Go to book" })}
                                </Button>
                            </div>
                        )}

                        {/* Error State */}
                        {importResult && !importResult.success && (
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive mb-4">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <p>{importResult.message}</p>
                            </div>
                        )}

                        {/* Upload Form */}
                        {!importResult?.success && (
                            <>
                                {/* File Upload */}
                                <div className="space-y-2">
                                    <Label>
                                        {t({
                                            de: "Datei auswählen",
                                            en: "Select file",
                                        })}
                                    </Label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".docx,.txt,.md"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />

                                    {selectedFile ? (
                                        <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/50">
                                            {getFileIcon(selectedFile.name)}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">
                                                    {selectedFile.name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {(
                                                        selectedFile.size / 1024
                                                    ).toFixed(1)}{" "}
                                                    KB
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    fileInputRef.current?.click()
                                                }
                                            >
                                                {t({
                                                    de: "Ändern",
                                                    en: "Change",
                                                })}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === "Enter" ||
                                                    e.key === " "
                                                ) {
                                                    e.preventDefault();
                                                    fileInputRef.current?.click();
                                                }
                                            }}
                                            onDragOver={(e) =>
                                                e.preventDefault()
                                            }
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                selectFile(
                                                    e.dataTransfer.files[0],
                                                );
                                            }}
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                                        >
                                            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                                            <p className="font-medium">
                                                {t({
                                                    de: "Datei hier ablegen oder klicken",
                                                    en: "Drop file here or click",
                                                })}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {t({
                                                    de: "DOCX, TXT oder Markdown",
                                                    en: "DOCX, TXT, or Markdown",
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div className="space-y-2">
                                    <Label htmlFor="import-title">
                                        {t({
                                            de: "Buchtitel",
                                            en: "Book title",
                                        })}
                                    </Label>
                                    <Input
                                        id="import-title"
                                        placeholder={t({
                                            de: "Titel des importierten Buches",
                                            en: "Title of imported book",
                                        })}
                                        value={importTitle}
                                        onChange={(e) =>
                                            setImportTitle(e.target.value)
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t({
                                            de: "Wird aus dem Dateinamen übernommen, kann aber angepasst werden.",
                                            en: "Taken from the filename, but can be adjusted.",
                                        })}
                                    </p>
                                </div>

                                {/* Info Box */}
                                <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-2">
                                    <p className="font-medium">
                                        {t({
                                            de: "Automatische Kapitelaufteilung:",
                                            en: "Automatic chapter splitting:",
                                        })}
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                        <li>
                                            {t({
                                                de: "Kapitel werden anhand von Überschriften erkannt",
                                                en: "Chapters are detected by headings",
                                            })}
                                        </li>
                                        <li>
                                            {t({
                                                de: 'Auch "Kapitel X" / "Chapter X" werden erkannt',
                                                en: 'Also recognizes "Kapitel X" / "Chapter X"',
                                            })}
                                        </li>
                                        <li>
                                            {t({
                                                de: "Formatierung (Fett, Kursiv) wird beibehalten",
                                                en: "Formatting (bold, italic) is preserved",
                                            })}
                                        </li>
                                    </ul>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-4 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setMode("select");
                                            setSelectedFile(null);
                                            setImportTitle("");
                                        }}
                                    >
                                        {t({ de: "Abbrechen", en: "Cancel" })}
                                    </Button>
                                    <Button
                                        onClick={handleImport}
                                        disabled={!selectedFile || isImporting}
                                    >
                                        {isImporting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {t({ de: "Importieren", en: "Import" })}
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Manual creation mode
    return (
        <div className="creation-form-page container mx-auto py-10 px-5 max-w-2xl">
            <button
                onClick={() => setMode("select")}
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                {t({ de: "Zurück zur Auswahl", en: "Back to selection" })}
            </button>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {t({
                            de: "Neues Buch erstellen",
                            en: "Create a new book",
                        })}
                    </CardTitle>
                    <CardDescription>
                        {t({
                            de: "Gib deinem Buchprojekt einen Namen und optional weitere Details.",
                            en: "Give your book project a name and optional details.",
                        })}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">
                                {t({ de: "Titel *", en: "Title *" })}
                            </Label>
                            <Input
                                id="title"
                                placeholder={t({
                                    de: "Der Titel deines Buches",
                                    en: "Your book's title",
                                })}
                                value={formData.title}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        title: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">
                                {t({ de: "Beschreibung", en: "Description" })}
                            </Label>
                            <textarea
                                id="description"
                                placeholder={t({
                                    de: "Worum geht es in deinem Buch?",
                                    en: "What is your book about?",
                                })}
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
                                className="w-full min-h-24 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="genre">
                                    {t({ de: "Genre", en: "Genre" })}
                                </Label>
                                <Input
                                    id="genre"
                                    placeholder={t({
                                        de: "z.B. Fantasy, Krimi, Roman",
                                        en: "e.g. Fantasy, Mystery, Novel",
                                    })}
                                    value={formData.genre}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            genre: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="targetAudience">
                                    {t({
                                        de: "Zielgruppe",
                                        en: "Target audience",
                                    })}
                                </Label>
                                <Input
                                    id="targetAudience"
                                    placeholder={t({
                                        de: "z.B. Jugendliche, Erwachsene",
                                        en: "e.g. Teens, adults",
                                    })}
                                    value={formData.targetAudience}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            targetAudience: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="writingStyle">
                                {t({ de: "Schreibstil", en: "Writing style" })}
                            </Label>
                            <Input
                                id="writingStyle"
                                placeholder={t({
                                    de: "z.B. Humorvoll, Spannend, Poetisch",
                                    en: "e.g. Humorous, Suspenseful, Poetic",
                                })}
                                value={formData.writingStyle}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        writingStyle: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setMode("select")}
                            >
                                {t({ de: "Abbrechen", en: "Cancel" })}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading || !formData.title.trim()}
                            >
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {t({ de: "Buch erstellen", en: "Create book" })}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
