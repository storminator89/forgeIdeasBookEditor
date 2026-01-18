"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles, PenTool, Upload, FileText, File, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StoryWizard from "@/components/wizard/StoryWizard";
import { useI18n } from "@/components/locale-provider";

type AISettings = {
    apiEndpoint: string;
    apiKey: string;
    model: string;
} | null;

type CreationMode = "select" | "manual" | "wizard" | "import";

export default function NewBookPage() {
    const { t } = useI18n();
    const router = useRouter();
    const [mode, setMode] = useState<CreationMode>("select");
    const [isLoading, setIsLoading] = useState(false);
    const [aiSettings, setAiSettings] = useState<AISettings>(null);
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

    // Load global AI settings
    useEffect(() => {
        async function loadAISettings() {
            try {
                // Fetch global settings with unmasked API key
                const response = await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "getUnmasked" }),
                });

                if (response.ok) {
                    const settings = await response.json();
                    if (settings.apiKey) {
                        setAiSettings({
                            apiEndpoint: settings.apiEndpoint,
                            apiKey: settings.apiKey,
                            model: settings.model,
                        });
                    }
                }
            } catch (error) {
                console.error("Error loading global settings:", error);
            } finally {
                setLoadingSettings(false);
            }
        }
        loadAISettings();
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
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            // Use filename as default title
            if (!importTitle) {
                const fileName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
                setImportTitle(fileName);
            }
        }
    };

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
                    message: data.error || t({ de: "Import fehlgeschlagen", en: "Import failed" }),
                });
            }
        } catch (error) {
            console.error("Import error:", error);
            setImportResult({
                success: false,
                message: t({ de: "Ein unerwarteter Fehler ist aufgetreten", en: "An unexpected error occurred" }),
            });
        } finally {
            setIsImporting(false);
        }
    };

    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith(".docx")) return <FileText className="h-8 w-8 text-blue-500" />;
        if (fileName.endsWith(".md")) return <File className="h-8 w-8 text-purple-500" />;
        return <File className="h-8 w-8 text-gray-500" />;
    };

    // Mode selection screen
    if (mode === "select") {
        return (
            <div className="container mx-auto py-8 px-4 max-w-4xl">
                <Link href={"/books" as Route} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    {t({ de: "Zurück zur Übersicht", en: "Back to overview" })}
                </Link>

                <h1 className="text-3xl font-bold mb-2">{t({ de: "Neues Buch erstellen", en: "Create a new book" })}</h1>
                <p className="text-muted-foreground mb-8">
                    {t({
                        de: "Wähle, wie du dein neues Buchprojekt starten möchtest.",
                        en: "Choose how you'd like to start your new book project.",
                    })}
                </p>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* AI Wizard Option */}
                    <Card
                        className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 ${!aiSettings ? "opacity-50" : ""
                            }`}
                        onClick={() => aiSettings && setMode("wizard")}
                    >
                        <CardHeader>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4">
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <CardTitle>{t({ de: "Mit KI-Assistent", en: "With AI assistant" })}</CardTitle>
                            <CardDescription>
                                {t({
                                    de: "Beschreibe deine Idee und lass die KI Charaktere, Handlung und Welt automatisch entwickeln.",
                                    en: "Describe your idea and let the AI develop characters, plot, and world automatically.",
                                })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingSettings ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t({ de: "Lade Einstellungen...", en: "Loading settings..." })}
                                </div>
                            ) : aiSettings ? (
                                <div className="space-y-2">
                                    <div className="text-sm text-green-600 dark:text-green-400">
                                        {t({ de: "? KI bereit ({{model}})", en: "? AI ready ({{model}})" }, { model: aiSettings.model })}
                                    </div>
                                    <Button className="w-full" onClick={() => setMode("wizard")}>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        {t({ de: "Wizard starten", en: "Start wizard" })}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                                        {t({ de: "Keine API-Konfiguration gefunden.", en: "No API configuration found." })}
                                    </div>
                                    <Link href={"/settings" as Route}>
                                        <Button variant="outline" className="w-full">
                                            {t({ de: "Einstellungen konfigurieren", en: "Configure settings" })}
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Manual Option */}
                    <Card
                        className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                        onClick={() => setMode("manual")}
                    >
                        <CardHeader>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-4">
                                <PenTool className="h-6 w-6 text-white" />
                            </div>
                            <CardTitle>{t({ de: "Manuell erstellen", en: "Create manually" })}</CardTitle>
                            <CardDescription>
                                {t({
                                    de: "Erstelle dein Buch klassisch mit einem leeren Projekt und füge alles selbst hinzu.",
                                    en: "Create your book the classic way with an empty project and add everything yourself.",
                                })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full" onClick={() => setMode("manual")}>
                                <PenTool className="mr-2 h-4 w-4" />
                                {t({ de: "Manuell starten", en: "Start manual" })}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Import Option */}
                    <Card
                        className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                        onClick={() => setMode("import")}
                    >
                        <CardHeader>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4">
                                <Upload className="h-6 w-6 text-white" />
                            </div>
                            <CardTitle>{t({ de: "Werk importieren", en: "Import work" })}</CardTitle>
                            <CardDescription>
                                {t({
                                    de: "Importiere ein bestehendes Werk aus DOCX, TXT oder Markdown mit automatischer Kapitelaufteilung.",
                                    en: "Import an existing work from DOCX, TXT, or Markdown with automatic chapter splitting.",
                                })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full" onClick={() => setMode("import")}>
                                <Upload className="mr-2 h-4 w-4" />
                                {t({ de: "Datei importieren", en: "Import file" })}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // AI Wizard mode
    if (mode === "wizard" && aiSettings) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-3xl">
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
                    {t({ de: "Lass die KI dir helfen, deine Geschichte zu entwickeln.", en: "Let AI help you develop your story." })}
                </p>

                <StoryWizard
                    apiEndpoint={aiSettings.apiEndpoint}
                    apiKey={aiSettings.apiKey}
                    model={aiSettings.model}
                    onCancel={() => setMode("select")}
                />
            </div>
        );
    }

    // Import mode
    if (mode === "import") {
        return (
            <div className="container mx-auto py-8 px-4 max-w-2xl">
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
                                <CardTitle className="text-2xl">{t({ de: "Werk importieren", en: "Import work" })}</CardTitle>
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
                                <h3 className="text-xl font-semibold mb-2">{t({ de: "Import erfolgreich!", en: "Import successful!" })}</h3>
                                <p className="text-muted-foreground mb-6">
                                    {importResult.message}
                                </p>
                                <Button
                                    onClick={() => router.push(`/books/${importResult.bookId}` as Route)}
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
                                    <Label>{t({ de: "Datei auswählen", en: "Select file" })}</Label>
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
                                                <p className="font-medium truncate">{selectedFile.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                {t({ de: "Ändern", en: "Change" })}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                                        >
                                            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                                            <p className="font-medium">{t({ de: "Datei hier ablegen oder klicken", en: "Drop file here or click" })}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {t({ de: "DOCX, TXT oder Markdown", en: "DOCX, TXT, or Markdown" })}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div className="space-y-2">
                                    <Label htmlFor="import-title">{t({ de: "Buchtitel", en: "Book title" })}</Label>
                                    <Input
                                        id="import-title"
                                        placeholder={t({ de: "Titel des importierten Buches", en: "Title of imported book" })}
                                        value={importTitle}
                                        onChange={(e) => setImportTitle(e.target.value)}
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
                                    <p className="font-medium">{t({ de: "Automatische Kapitelaufteilung:", en: "Automatic chapter splitting:" })}</p>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                        <li>{t({ de: "Kapitel werden anhand von Überschriften erkannt", en: "Chapters are detected by headings" })}</li>
                                        <li>{t({ de: "Auch \"Kapitel X\" / \"Chapter X\" werden erkannt", en: "Also recognizes \"Kapitel X\" / \"Chapter X\"" })}</li>
                                        <li>{t({ de: "Formatierung (Fett, Kursiv) wird beibehalten", en: "Formatting (bold, italic) is preserved" })}</li>
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
                                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <button
                onClick={() => setMode("select")}
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                {t({ de: "Zurück zur Auswahl", en: "Back to selection" })}
            </button>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">{t({ de: "Neues Buch erstellen", en: "Create a new book" })}</CardTitle>
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
                            <Label htmlFor="title">{t({ de: "Titel *", en: "Title *" })}</Label>
                            <Input
                                id="title"
                                placeholder={t({ de: "Der Titel deines Buches", en: "Your book's title" })}
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">{t({ de: "Beschreibung", en: "Description" })}</Label>
                            <textarea
                                id="description"
                                placeholder={t({ de: "Worum geht es in deinem Buch?", en: "What is your book about?" })}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full min-h-24 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="genre">{t({ de: "Genre", en: "Genre" })}</Label>
                                <Input
                                    id="genre"
                                    placeholder={t({ de: "z.B. Fantasy, Krimi, Roman", en: "e.g. Fantasy, Mystery, Novel" })}
                                    value={formData.genre}
                                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="targetAudience">{t({ de: "Zielgruppe", en: "Target audience" })}</Label>
                                <Input
                                    id="targetAudience"
                                    placeholder={t({ de: "z.B. Jugendliche, Erwachsene", en: "e.g. Teens, adults" })}
                                    value={formData.targetAudience}
                                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="writingStyle">{t({ de: "Schreibstil", en: "Writing style" })}</Label>
                            <Input
                                id="writingStyle"
                                placeholder={t({ de: "z.B. Humorvoll, Spannend, Poetisch", en: "e.g. Humorous, Suspenseful, Poetic" })}
                                value={formData.writingStyle}
                                onChange={(e) => setFormData({ ...formData, writingStyle: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => setMode("select")}>
                                {t({ de: "Abbrechen", en: "Cancel" })}
                            </Button>
                            <Button type="submit" disabled={isLoading || !formData.title.trim()}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t({ de: "Buch erstellen", en: "Create book" })}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
