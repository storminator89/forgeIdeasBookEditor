"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles, PenTool } from "lucide-react";
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

type CreationMode = "select" | "manual" | "wizard";

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

    // Mode selection screen
    if (mode === "select") {
        return (
            <div className="container mx-auto py-8 px-4 max-w-3xl">
                <Link href={"/books" as Route} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Zurück zur Übersicht
                </Link>

                <h1 className="text-3xl font-bold mb-2">Neues Buch erstellen</h1>
                <p className="text-muted-foreground mb-8">
                    Wähle, wie du dein neues Buchprojekt starten möchtest.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
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
