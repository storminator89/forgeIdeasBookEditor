"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Loader2, Eye, EyeOff, Save, Sparkles, Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

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
    const { t } = useI18n();
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
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [modelsError, setModelsError] = useState<string | null>(null);

    const fetchModels = useCallback(async () => {
        setIsLoadingModels(true);
        setModelsError(null);
        try {
            const params = new URLSearchParams();
            if (apiEndpoint) params.set("apiEndpoint", apiEndpoint);
            if (apiKey) params.set("apiKey", apiKey);

            const response = await fetch(`/api/settings/models?${params}`);
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.error || "Failed to fetch models");
            }
            const data = await response.json();
            setAvailableModels(data.models || []);
        } catch (err) {
            setModelsError(err instanceof Error ? err.message : t({ de: "Fehler beim Laden der Modelle", en: "Failed to load models" }));
        } finally {
            setIsLoadingModels(false);
        }
    }, [apiEndpoint, apiKey, t]);

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
                setError(t({ de: "Fehler beim Laden der Einstellungen", en: "Failed to load settings" }));
            } finally {
                setIsLoading(false);
            }
        }
        loadSettings();
    }, [t]);

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
                throw new Error(t({ de: "Fehler beim Speichern", en: "Failed to save" }));
            }

            const updatedSettings = await response.json();
            setSettings(updatedSettings);
            setSuccess(true);
            setApiKey(""); // Clear after save
        } catch (err) {
            setError(err instanceof Error ? err.message : t({ de: "Unbekannter Fehler", en: "Unknown error" }));
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
        <div className="relative min-h-screen bg-background overflow-x-hidden scrollbar-hide py-10 px-4 md:px-6">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="ambient-glow-amber top-[-10%] left-[-5%] opacity-20" />
                <div className="ambient-glow-violet bottom-[-10%] right-[-5%] opacity-15" />
            </div>

            <div className="container mx-auto max-w-2xl relative z-10 animate-in fade-in duration-500">
                <Link 
                    href={"/books" as Route} 
                    className="inline-flex items-center gap-2 text-[10px] font-serif font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-6 transition-all group"
                >
                    <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    {t({ de: "Zurück zur Übersicht", en: "Back to overview" })}
                </Link>

                <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-foreground mb-1">
                    {t({ de: "Systemeinstellungen", en: "System Settings" })}
                </h1>
                <p className="text-xs font-serif text-muted-foreground leading-relaxed italic mb-8 border-l border-border/30 pl-4">
                    {t({ de: "Zentrale KI-Konfiguration für alle Buchprojekte.", en: "Central AI configuration for all book projects." })}
                </p>

                <div className="space-y-6">
                    {/* API Configuration Card */}
                    <Card className="relative overflow-hidden bg-card/60 dark:bg-card/35 backdrop-blur-md border border-border/40 shadow-xl paper-texture">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/35 via-primary/80 to-primary/35 rounded-l-full" />
                        
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-sm font-serif font-black text-foreground">
                                <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
                                {t({ de: "API-Konfiguration", en: "API configuration" })}
                            </CardTitle>
                            <CardDescription className="text-xs font-serif text-muted-foreground/80">
                                {t({ de: "Diese Einstellungen gelten für alle Bücher.", en: "These settings apply to all books." })}
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-5">
                            {/* API Endpoint */}
                            <div className="space-y-2">
                                <label className="text-xs font-serif font-black uppercase tracking-wider text-muted-foreground">
                                    {t({ de: "API-Endpunkt", en: "API endpoint" })}
                                </label>
                                <Input
                                    value={apiEndpoint}
                                    onChange={(e) => setApiEndpoint(e.target.value)}
                                    placeholder="https://api.openai.com/v1"
                                    className="rounded-xl bg-background/55 text-xs h-9.5 border-border/40 shadow-inner font-serif"
                                />
                                <p className="text-[10px] font-serif text-muted-foreground/75 leading-relaxed italic">
                                    {t({
                                        de: "ℹ️ OpenAI-kompatible API-URL (z.B. OpenAI, Anthropic via Proxy, lokale LLMs)",
                                        en: "ℹ️ OpenAI-compatible API URL (e.g., OpenAI, Anthropic via proxy, local LLMs)",
                                    })}
                                </p>
                            </div>

                            {/* API Key */}
                            <div className="space-y-2">
                                <label className="text-xs font-serif font-black uppercase tracking-wider text-muted-foreground">
                                    {t({ de: "API-Schlüssel", en: "API key" })}
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showApiKey ? "text" : "password"}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={settings?.hasApiKey ? "••••••••••••••••" : "sk-..."}
                                        className="rounded-xl bg-background/55 text-xs h-9.5 border-border/40 shadow-inner font-serif pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-lg hover:bg-secondary/45 cursor-pointer"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                    >
                                        {showApiKey ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                                {settings?.hasApiKey && (
                                    <p className="text-[10px] font-serif text-green-600 dark:text-green-400 font-semibold leading-relaxed">
                                        ✓ {t({
                                            de: "API-Schlüssel konfiguriert ({{key}}). Leer lassen, um den bestehenden beizubehalten.",
                                            en: "API key configured ({{key}}). Leave empty to keep the existing one.",
                                        }, { key: settings.apiKey ?? "" })}
                                    </p>
                                )}
                            </div>

                            {/* Model Selection */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-4">
                                    <label className="text-xs font-serif font-black uppercase tracking-wider text-muted-foreground">
                                        {t({ de: "Modell", en: "Model" })}
                                    </label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchModels}
                                        disabled={isLoadingModels || !apiEndpoint || (!apiKey && !settings?.hasApiKey)}
                                        className="h-7 px-2.5 rounded-lg text-[10px] font-serif uppercase tracking-wider border-border/50 hover:bg-secondary/45 cursor-pointer"
                                    >
                                        {isLoadingModels ? (
                                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                        ) : (
                                            <RefreshCw className="mr-1.5 h-3 w-3 text-primary" />
                                        )}
                                        {t({ de: "Modelle laden", en: "Load models" })}
                                    </Button>
                                </div>
                                {availableModels.length > 0 ? (
                                    <select
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        className="w-full h-9.5 px-3 rounded-xl border border-border/40 bg-background/55 text-xs font-serif focus:ring-1 focus:ring-primary/45 focus:outline-none shadow-inner"
                                    >
                                        {availableModels.map((m) => (
                                            <option key={m} value={m} className="bg-card">
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <select
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        className="w-full h-9.5 px-3 rounded-xl border border-border/40 bg-background/55 text-xs font-serif focus:ring-1 focus:ring-primary/45 focus:outline-none shadow-inner"
                                    >
                                        {PRESET_MODELS.map((preset) => (
                                            <option key={preset.value} value={preset.value} className="bg-card">
                                                {preset.label}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {modelsError && (
                                    <p className="text-[10px] font-serif text-destructive">{modelsError}</p>
                                )}
                                <p className="text-[10px] font-serif text-muted-foreground/75 leading-relaxed italic">
                                    {availableModels.length > 0
                                        ? t({ de: "Oder gib einen benutzerdefinierten Modellnamen ein:", en: "Or enter a custom model name:" })
                                        : t({ de: "ℹ️ Klicke auf \"Modelle laden\" um verfügbare Modelle vom Endpunkt zu laden, oder gib einen Modellnamen ein:", en: "Click \"Load models\" to fetch available models from the endpoint, or enter a model name:" })}
                                </p>
                                <Input
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    placeholder="gpt-4o-mini"
                                    className="rounded-xl bg-background/55 text-xs h-9.5 border-border/40 shadow-inner font-serif"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Generation Settings Card */}
                    <Card className="relative overflow-hidden bg-card/60 dark:bg-card/35 backdrop-blur-md border border-border/40 shadow-xl paper-texture">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/35 via-primary/80 to-primary/35 rounded-l-full" />
                        
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-serif font-black text-foreground">
                                {t({ de: "Generierungseinstellungen", en: "Generation settings" })}
                            </CardTitle>
                            <CardDescription className="text-xs font-serif text-muted-foreground/80">
                                {t({ de: "Passe die Parameter für die Textgenerierung an.", en: "Adjust the parameters for text generation." })}
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-6">
                            {/* Temperature */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <label className="text-xs font-serif font-black uppercase tracking-wider text-muted-foreground">
                                        {t({ de: "Temperatur", en: "Temperature" })}
                                    </label>
                                    <span className="text-xs font-serif font-bold bg-secondary/65 border border-border/25 px-2 py-0.5 rounded-lg text-foreground shadow-sm">
                                        {temperature}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-secondary/50 rounded-lg h-1 cursor-pointer"
                                />
                                <p className="text-[10px] font-serif text-muted-foreground/75 leading-relaxed italic">
                                    {t({
                                        de: "ℹ️ Niedrig = deterministische Antworten, Hoch = kreativer/zufälliger",
                                        en: "ℹ️ Low = deterministic responses, High = more creative/random",
                                    })}
                                </p>
                            </div>

                            {/* Max Tokens */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <label className="text-xs font-serif font-black uppercase tracking-wider text-muted-foreground">
                                        {t({ de: "Max. Tokens", en: "Max tokens" })}
                                    </label>
                                    <span className="text-xs font-serif font-bold bg-secondary/65 border border-border/25 px-2 py-0.5 rounded-lg text-foreground shadow-sm">
                                        {maxTokens}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="256"
                                    max="16384"
                                    step="256"
                                    value={maxTokens}
                                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                    className="w-full accent-primary bg-secondary/50 rounded-lg h-1 cursor-pointer"
                                />
                                <p className="text-[10px] font-serif text-muted-foreground/75 leading-relaxed italic">
                                    {t({ de: "ℹ️ Maximale Länge der generierten Antwort", en: "Maximum length of the generated response" })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Prompt Card */}
                    <Card className="relative overflow-hidden bg-card/60 dark:bg-card/35 backdrop-blur-md border border-border/40 shadow-xl paper-texture">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/35 via-primary/80 to-primary/35 rounded-l-full" />
                        
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-serif font-black text-foreground">
                                {t({ de: "System-Prompt", en: "System prompt" })}
                            </CardTitle>
                            <CardDescription className="text-xs font-serif text-muted-foreground/80">
                                {t({
                                    de: "Optionaler Basis-Prompt der bei jeder Generierung verwendet wird.",
                                    en: "Optional base prompt used for every generation.",
                                })}
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-3">
                            <textarea
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                placeholder={t({
                                    de: "Du bist ein kreativer Schriftsteller, der beim Schreiben eines Buches hilft...",
                                    en: "You are a creative writer who helps with writing a book...",
                                })}
                                className="w-full min-h-[140px] px-3 py-2.5 rounded-xl border border-border/40 bg-background/55 text-xs font-serif resize-none focus:outline-none focus:ring-1 focus:ring-primary/45 leading-relaxed shadow-inner"
                            />
                            <p className="text-[10px] font-serif text-muted-foreground/75 leading-relaxed italic">
                                {t({
                                    de: "ℹ️ Leer lassen für den Standard-Prompt. Buch-Kontext wird automatisch hinzugefügt.",
                                    en: "ℹ️ Leave empty for the default prompt. Book context is added automatically.",
                                })}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-serif leading-relaxed">
                            ⚠️ {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-serif font-semibold flex items-center gap-2.5 animate-in fade-in">
                            <Check className="h-4 w-4" />
                            {t({ de: "Einstellungen erfolgreich gespeichert!", en: "Settings saved successfully!" })}
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="shadow-lg shadow-primary/10 rounded-xl h-11 px-6 text-xs font-serif font-black uppercase tracking-wider cursor-pointer"
                        >
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4 text-white" />
                            )}
                            {t({ de: "Einstellungen speichern", en: "Save settings" })}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
