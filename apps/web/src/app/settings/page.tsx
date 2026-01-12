"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Eye, EyeOff, Save, Sparkles, Check } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GlobalSettings = {
    id: string;
    apiEndpoint: string;
    apiKey: string | null;
    hasApiKey: boolean;
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string | null;
};

const PRESET_MODELS = [
    { value: "gpt-4o", label: "GPT-4o (OpenAI)" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini (OpenAI)" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo (OpenAI)" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Anthropic)" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (Anthropic)" },
    { value: "gemini-pro", label: "Gemini Pro (Google)" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Google)" },
    { value: "llama-3.1-70b", label: "Llama 3.1 70B" },
    { value: "mistral-large", label: "Mistral Large" },
];

export default function SettingsPage() {
    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [apiEndpoint, setApiEndpoint] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [model, setModel] = useState("");
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(4096);
    const [systemPrompt, setSystemPrompt] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        async function loadSettings() {
            try {
                const response = await fetch("/api/settings");
                if (response.ok) {
                    const data = await response.json();
                    setSettings(data);
                    setApiEndpoint(data.apiEndpoint);
                    setModel(data.model);
                    setTemperature(data.temperature);
                    setMaxTokens(data.maxTokens);
                    setSystemPrompt(data.systemPrompt || "");
                }
            } catch (err) {
                console.error("Error loading settings:", err);
                setError("Fehler beim Laden der Einstellungen");
            } finally {
                setIsLoading(false);
            }
        }
        loadSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const body: Record<string, unknown> = {
                apiEndpoint,
                model,
                temperature,
                maxTokens,
                systemPrompt: systemPrompt || null,
            };

            // Only include API key if it's been changed
            if (apiKey) {
                body.apiKey = apiKey;
            }

            const response = await fetch("/api/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error("Fehler beim Speichern");
            }

            const updatedSettings = await response.json();
            setSettings(updatedSettings);
            setSuccess(true);
            setApiKey(""); // Clear after save
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unbekannter Fehler");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-2xl flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <Link href={"/books" as Route} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Zurück zur Übersicht
            </Link>

            <h1 className="text-3xl font-bold mb-2">Einstellungen</h1>
            <p className="text-muted-foreground mb-8">
                Zentrale KI-Konfiguration für alle Buchprojekte.
            </p>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            API-Konfiguration
                        </CardTitle>
                        <CardDescription>
                            Diese Einstellungen gelten für alle Bücher.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* API Endpoint */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">API-Endpunkt</label>
                            <Input
                                value={apiEndpoint}
                                onChange={(e) => setApiEndpoint(e.target.value)}
                                placeholder="https://api.openai.com/v1"
                            />
                            <p className="text-xs text-muted-foreground">
                                OpenAI-kompatible API-URL (z.B. OpenAI, Anthropic via Proxy, lokale LLMs)
                            </p>
                        </div>

                        {/* API Key */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">API-Schlüssel</label>
                            <div className="relative">
                                <Input
                                    type={showApiKey ? "text" : "password"}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={settings?.hasApiKey ? "••••••••••••••••" : "sk-..."}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                >
                                    {showApiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {settings?.hasApiKey && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    ✓ API-Schlüssel konfiguriert ({settings.apiKey}). Leer lassen, um den bestehenden beizubehalten.
                                </p>
                            )}
                        </div>

                        {/* Model Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Modell</label>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            >
                                {PRESET_MODELS.map((preset) => (
                                    <option key={preset.value} value={preset.value}>
                                        {preset.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">
                                Oder gib einen benutzerdefinierten Modellnamen ein:
                            </p>
                            <Input
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                placeholder="gpt-4o-mini"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Generierungseinstellungen</CardTitle>
                        <CardDescription>
                            Passe die Parameter für die Textgenerierung an.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Temperature */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Temperatur</label>
                                <span className="text-sm text-muted-foreground">{temperature}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={temperature}
                                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Niedrig = deterministische Antworten, Hoch = kreativer/zufälliger
                            </p>
                        </div>

                        {/* Max Tokens */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Max. Tokens</label>
                                <span className="text-sm text-muted-foreground">{maxTokens}</span>
                            </div>
                            <input
                                type="range"
                                min="256"
                                max="16384"
                                step="256"
                                value={maxTokens}
                                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Maximale Länge der generierten Antwort
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>System-Prompt</CardTitle>
                        <CardDescription>
                            Optionaler Basis-Prompt der bei jeder Generierung verwendet wird.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Du bist ein kreativer Schriftsteller, der beim Schreiben eines Buches hilft..."
                            className="w-full min-h-[150px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="text-xs text-muted-foreground">
                            Leer lassen für den Standard-Prompt. Buch-Kontext wird automatisch hinzugefügt.
                        </p>
                    </CardContent>
                </Card>

                {/* Error/Success Messages */}
                {error && (
                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Einstellungen erfolgreich gespeichert!
                    </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Einstellungen speichern
                    </Button>
                </div>
            </div>
        </div>
    );
}
