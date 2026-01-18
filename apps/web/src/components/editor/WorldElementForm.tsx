"use client";

import { useState } from "react";
import { Loader2, Save, X, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, MapPin, Box, Lightbulb, Users, Zap, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

type WorldElement = {
    id: string;
    name: string;
    type: string;
    description: string | null;
    imageUrl: string | null;
};

type WorldElementInput = Omit<WorldElement, "id">;

interface WorldElementFormProps {
    bookId: string;
    worldElement?: WorldElement;
    onSave?: (worldElement: WorldElement) => void;
    onCancel?: () => void;
}

const WORLD_TYPES = [
    { value: "location", label: "Ort", icon: MapPin },
    { value: "item", label: "Gegenstand", icon: Box },
    { value: "concept", label: "Konzept", icon: Lightbulb },
    { value: "organization", label: "Gruppe", icon: Users },
    { value: "magic_system", label: "Magie", icon: Zap },
    { value: "technology", label: "Tech", icon: Cpu },
];

export default function WorldElementForm({
    bookId,
    worldElement,
    onSave,
    onCancel,
}: WorldElementFormProps) {
    const isEditing = !!worldElement;

    const [name, setName] = useState(worldElement?.name || "");
    const [type, setType] = useState(worldElement?.type || "location");
    const [description, setDescription] = useState(worldElement?.description || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Filtered types for selection to ensure icon lookup works
    const SelectedIcon = WORLD_TYPES.find(t => t.value === type)?.icon || Globe;

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Name ist erforderlich");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const body: WorldElementInput = {
                name: name.trim(),
                type,
                description: description || null,
                imageUrl: worldElement?.imageUrl || null,
            };

            const url = isEditing
                ? `/api/books/${bookId}/world/${worldElement.id}`
                : `/api/books/${bookId}/world`;

            const response = await fetch(url, {
                method: isEditing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error("Fehler beim Speichern");
            }

            const savedWorldElement = await response.json();
            onSave?.(savedWorldElement);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unbekannter Fehler");
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerate = async () => {
        if (!aiPrompt.trim() && !name.trim()) {
            setError("Bitte gib einen Namen oder einen Prompt ein.");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const promptToSend = aiPrompt.trim() || `Erstelle eine Beschreibung für ${type}: "${name}"`;

            const response = await fetch(`/api/books/${bookId}/world/ai`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: isEditing ? "enhance" : "generate",
                    worldElementId: worldElement?.id,
                    prompt: promptToSend,
                }),
            });

            if (!response.ok) throw new Error("KI-Generierung fehlgeschlagen");

            const data = await response.json();
            const generated = data.worldElement;

            if (generated) {
                if (generated.name) setName(generated.name);
                if (generated.type && WORLD_TYPES.some(t => t.value === generated.type)) setType(generated.type);
                if (generated.description) setDescription(generated.description);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Fehler bei der Generierung");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
            <Card className="w-full max-w-lg relative z-10 shadow-2xl border-white/10 bg-card/90 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                {isEditing ? "Element bearbeiten" : "Neues Weltelement"}
                            </CardTitle>
                            <CardDescription>
                                Erweitere deine Welt mit Orten, Gegenständen und mehr.
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full hover:bg-white/10">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* AI Generation Section */}
                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Beschreibe, was du erstellen möchtest (oder lass leer für den Namen)..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="bg-background/50 border-primary/20 focus-visible:ring-primary/30"
                                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                            />
                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20"
                            >
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 inline text-purple-500" />
                            {isEditing ? "KI kann die Beschreibung verbessern." : "KI kann Name und Beschreibung vorschlagen."}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* Type Selection */}
                        <div className="grid grid-cols-3 gap-2">
                            {WORLD_TYPES.map((t) => {
                                const Icon = t.icon;
                                const isSelected = type === t.value;
                                return (
                                    <div
                                        key={t.value}
                                        onClick={() => setType(t.value)}
                                        className={cn(
                                            "cursor-pointer rounded-lg border p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200",
                                            isSelected
                                                ? "bg-primary/10 border-primary text-primary shadow-sm"
                                                : "bg-background hover:bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-xs font-medium">{t.label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <div className="relative">
                                <SelectedIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Name des Elements"
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Beschreibung</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detaillierte Beschreibung..."
                                className="w-full min-h-[150px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                                <X className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                        <Button variant="ghost" onClick={onCancel}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Speichern
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
