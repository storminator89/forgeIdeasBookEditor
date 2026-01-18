"use client";

import { useState } from "react";
import { Loader2, Sparkles, Plus, Check, X, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

const PLOT_TYPES = [
    { value: "hook", label: "Hook" },
    { value: "rising_action", label: "Steigende Handlung" },
    { value: "climax", label: "Höhepunkt" },
    { value: "falling_action", label: "Fallende Handlung" },
    { value: "resolution", label: "Auflösung" },
    { value: "subplot", label: "Nebenplot" },
    { value: "event", label: "Ereignis" },
];

export default function PlotAIPanel({
    bookId,
    onPlotPointCreated,
}: PlotAIPanelProps) {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<GeneratedPlotPoint | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("Bitte gib eine Beschreibung ein");
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
                throw new Error(data.error || "Fehler bei der Generierung");
            }

            const data = await response.json();
            setPreview(data.plotPoint);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unbekannter Fehler");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!preview) return;

        setIsSaving(true);
        setError(null);

        try {
            // We create the plot point via the regular API, but using the AI generated data
            // We need to fetch orderIndex? Usually backend handles it or we default to last.
            // Let's assume the POST /api/books/[bookId]/plot endpoint handles creation.
            // Wait, I need to check how standard creation works.
            // Standard creation usually takes { title, type, description, orderIndex? }

            const response = await fetch(`/api/books/${bookId}/plot`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(preview),
            });

            if (!response.ok) {
                throw new Error("Fehler beim Speichern");
            }

            const savedPoint = await response.json();
            onPlotPointCreated(savedPoint);
            setPreview(null);
            setPrompt("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Fehler beim Speichern");
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
                    KI-Plot-Assistent
                </CardTitle>
                <CardDescription>
                    Beschreibe eine Szene oder Wendung - die KI füllt die Details aus.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!preview ? (
                    <>
                        <div className="flex gap-2">
                            <Input
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="z.B. 'Ein unerwarteter Verrat durch den besten Freund' oder 'Der Held findet ein magisches Artefakt'"
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
                                    <label className="text-xs text-muted-foreground">Titel</label>
                                    <Input
                                        value={preview.title}
                                        onChange={(e) => updatePreview("title", e.target.value)}
                                        className="h-8 font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Typ</label>
                                    <select
                                        value={preview.type}
                                        onChange={(e) => updatePreview("type", e.target.value)}
                                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {PLOT_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">Beschreibung</label>
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
                                Verwerfen
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                )}
                                Speichern
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
