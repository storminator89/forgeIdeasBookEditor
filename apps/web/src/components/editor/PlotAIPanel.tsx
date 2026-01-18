"use client";

import { useState, useMemo } from "react";
import { Loader2, Sparkles, Plus, Check, X, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

type PlotPoint = {
    id: string;
    title: string;
    description: string | null;
    type: string;
    orderIndex: number;
};

type GeneratedPlotPoint = {
    title: string;
    type: string;
    description: string;
};

interface PlotAIPanelProps {
    bookId: string;
    onPlotPointCreated: (plotPoint: PlotPoint) => void;
}

export default function PlotAIPanel({
    bookId,
    onPlotPointCreated,
}: PlotAIPanelProps) {
    const { t } = useI18n();
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<GeneratedPlotPoint | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const plotTypes = useMemo(() => ([
        { value: "hook", label: t({ de: "Hook", en: "Hook" }) },
        { value: "rising_action", label: t({ de: "Steigende Handlung", en: "Rising action" }) },
        { value: "climax", label: t({ de: "Höhepunkt", en: "Climax" }) },
        { value: "falling_action", label: t({ de: "Fallende Handlung", en: "Falling action" }) },
        { value: "resolution", label: t({ de: "Auflösung", en: "Resolution" }) },
        { value: "subplot", label: t({ de: "Nebenplot", en: "Subplot" }) },
        { value: "event", label: t({ de: "Ereignis", en: "Event" }) },
    ]), [t]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError(t({ de: "Bitte gib eine Beschreibung ein", en: "Please enter a description" }));
            return;
        }

        setIsLoading(true);
        setError(null);
        setPreview(null);

        try {
            const response = await fetch(`/api/books/${bookId}/plot/ai`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "generate",
                    prompt,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || t({ de: "Fehler bei der Generierung", en: "Generation failed" }));
            }

            const data = await response.json();
            setPreview(data.plotPoint);
        } catch (err) {
            setError(err instanceof Error ? err.message : t({ de: "Unbekannter Fehler", en: "Unknown error" }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!preview) return;

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/books/${bookId}/plot`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(preview),
            });

            if (!response.ok) {
                throw new Error(t({ de: "Fehler beim Speichern", en: "Failed to save" }));
            }

            const savedPoint = await response.json();
            onPlotPointCreated(savedPoint);
            setPreview(null);
            setPrompt("");
        } catch (err) {
            setError(err instanceof Error ? err.message : t({ de: "Fehler beim Speichern", en: "Failed to save" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setPreview(null);
        setError(null);
    };

    const updatePreview = (field: keyof GeneratedPlotPoint, value: string) => {
        if (preview) {
            setPreview({ ...preview, [field]: value });
        }
    };

    return (
        <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20 mb-6">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    {t({ de: "KI-Plot-Assistent", en: "AI plot assistant" })}
                </CardTitle>
                <CardDescription>
                    {t({
                        de: "Beschreibe eine Szene oder Wendung - die KI füllt die Details aus.",
                        en: "Describe a scene or twist - the AI fills in the details.",
                    })}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!preview ? (
                    <>
                        <div className="flex gap-2">
                            <Input
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={t({
                                    de: "z.B. 'Ein unerwarteter Verrat durch den besten Freund' oder 'Der Held findet ein magisches Artefakt'",
                                    en: "e.g. 'An unexpected betrayal by the best friend' or 'The hero finds a magical artifact'",
                                })}
                                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                                disabled={isLoading}
                            />
                            <Button onClick={handleGenerate} disabled={isLoading || !prompt.trim()}>
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Map className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        {error && (
                            <div className="p-2 rounded bg-destructive/10 text-destructive text-sm">
                                {error}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg border bg-card/50 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs text-muted-foreground">{t({ de: "Titel", en: "Title" })}</label>
                                    <Input
                                        value={preview.title}
                                        onChange={(e) => updatePreview("title", e.target.value)}
                                        className="h-8 font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">{t({ de: "Typ", en: "Type" })}</label>
                                    <select
                                        value={preview.type}
                                        onChange={(e) => updatePreview("type", e.target.value)}
                                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {plotTypes.map((plotType) => (
                                            <option key={plotType.value} value={plotType.value}>{plotType.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">{t({ de: "Beschreibung", en: "Description" })}</label>
                                <textarea
                                    value={preview.description}
                                    onChange={(e) => updatePreview("description", e.target.value)}
                                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-2 rounded bg-destructive/10 text-destructive text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCancel} disabled={isSaving} className="flex-1">
                                <X className="h-4 w-4 mr-2" />
                                {t({ de: "Verwerfen", en: "Discard" })}
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                )}
                                {t({ de: "Speichern", en: "Save" })}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
