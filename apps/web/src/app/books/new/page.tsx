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

type AISettings = {
    apiEndpoint: string;
    apiKey: string;
    model: string;
} | null;

type CreationMode = "select" | "manual" | "wizard" | "import";

export default function NewBookPage() {
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
                    message: data.error || "Import fehlgeschlagen",
                });
            }
        } catch (error) {
            console.error("Import error:", error);
            setImportResult({
                success: false,
                message: "Ein unerwarteter Fehler ist aufgetreten",
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
                    Zurück zur Übersicht
                </Link>

                <h1 className="text-3xl font-bold mb-2">Neues Buch erstellen</h1>
                <p className="text-muted-foreground mb-8">
                    Wähle, wie du dein neues Buchprojekt starten möchtest.
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
                            <CardTitle>Mit KI-Assistent</CardTitle>
                            <CardDescription>
                                Beschreibe deine Idee und lass die KI Charaktere, Handlung und Welt automatisch entwickeln.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingSettings ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Lade Einstellungen...
                                </div>
                            ) : aiSettings ? (
                                <div className="space-y-2">
                                    <div className="text-sm text-green-600 dark:text-green-400">
                                        ✓ KI bereit ({aiSettings.model})
                                    </div>
                                    <Button className="w-full" onClick={() => setMode("wizard")}>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Wizard starten
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                                        ⚠ Keine API-Konfiguration gefunden.
                                    </div>
                                    <Link href={"/settings" as Route}>
                                        <Button variant="outline" className="w-full">
                                            Einstellungen konfigurieren
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
                            <CardTitle>Manuell erstellen</CardTitle>
                            <CardDescription>
                                Erstelle dein Buch klassisch mit einem leeren Projekt und füge alles selbst hinzu.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full" onClick={() => setMode("manual")}>
                                <PenTool className="mr-2 h-4 w-4" />
                                Manuell starten
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
                            <CardTitle>Werk importieren</CardTitle>
                            <CardDescription>
                                Importiere ein bestehendes Werk aus DOCX, TXT oder Markdown mit automatischer Kapitelaufteilung.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full" onClick={() => setMode("import")}>
                                <Upload className="mr-2 h-4 w-4" />
                                Datei importieren
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
                    Zurück zur Auswahl
                </button>

                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Sparkles className="h-8 w-8 text-purple-500" />
                    KI Story-Wizard
                </h1>
                <p className="text-muted-foreground mb-8">
                    Lass die KI dir helfen, deine Geschichte zu entwickeln.
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
                    Zurück zur Auswahl
                </button>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <Upload className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">Werk importieren</CardTitle>
                                <CardDescription>
                                    Lade dein bestehendes Werk hoch und wir teilen es automatisch in Kapitel auf.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Success State */}
                        {importResult?.success && (
                            <div className="flex flex-col items-center py-8 text-center">
                                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Import erfolgreich!</h3>
                                <p className="text-muted-foreground mb-6">
                                    {importResult.message}
                                </p>
                                <Button
                                    onClick={() => router.push(`/books/${importResult.bookId}` as Route)}
                                    size="lg"
                                >
                                    Zum Buch
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
                                    <Label>Datei auswählen</Label>
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
                                                Ändern
                                            </Button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                                        >
                                            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                                            <p className="font-medium">Datei hier ablegen oder klicken</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                DOCX, TXT oder Markdown
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div className="space-y-2">
                                    <Label htmlFor="import-title">Buchtitel</Label>
                                    <Input
                                        id="import-title"
                                        placeholder="Titel des importierten Buches"
                                        value={importTitle}
                                        onChange={(e) => setImportTitle(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Wird aus dem Dateinamen übernommen, kann aber angepasst werden.
                                    </p>
                                </div>

                                {/* Info Box */}
                                <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-2">
                                    <p className="font-medium">Automatische Kapitelaufteilung:</p>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                        <li>Kapitel werden anhand von Überschriften erkannt</li>
                                        <li>Auch "Kapitel X" / "Chapter X" werden erkannt</li>
                                        <li>Formatierung (Fett, Kursiv) wird beibehalten</li>
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
                                        Abbrechen
                                    </Button>
                                    <Button
                                        onClick={handleImport}
                                        disabled={!selectedFile || isImporting}
                                    >
                                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Importieren
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
                Zurück zur Auswahl
            </button>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Neues Buch erstellen</CardTitle>
                    <CardDescription>
                        Gib deinem Buchprojekt einen Namen und optional weitere Details.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Titel *</Label>
                            <Input
                                id="title"
                                placeholder="Der Titel deines Buches"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Beschreibung</Label>
                            <textarea
                                id="description"
                                placeholder="Worum geht es in deinem Buch?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full min-h-24 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="genre">Genre</Label>
                                <Input
                                    id="genre"
                                    placeholder="z.B. Fantasy, Krimi, Roman"
                                    value={formData.genre}
                                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="targetAudience">Zielgruppe</Label>
                                <Input
                                    id="targetAudience"
                                    placeholder="z.B. Jugendliche, Erwachsene"
                                    value={formData.targetAudience}
                                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="writingStyle">Schreibstil</Label>
                            <Input
                                id="writingStyle"
                                placeholder="z.B. Humorvoll, Spannend, Poetisch"
                                value={formData.writingStyle}
                                onChange={(e) => setFormData({ ...formData, writingStyle: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => setMode("select")}>
                                Abbrechen
                            </Button>
                            <Button type="submit" disabled={isLoading || !formData.title.trim()}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Buch erstellen
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

