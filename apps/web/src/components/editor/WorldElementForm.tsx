"use client";

import { useState, useMemo } from "react";
import { Loader2, Save, X, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, MapPin, Box, Lightbulb, Users, Zap, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/locale-provider";

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

export default function WorldElementForm({
    bookId,
    worldElement,
    onSave,
    onCancel,
}: WorldElementFormProps) {
    const { t } = useI18n();
    const isEditing = !!worldElement;

    const worldTypes = useMemo(() => ([
        { value: "location", label: t({ de: "Ort", en: "Location" }), icon: MapPin },
        { value: "item", label: t({ de: "Gegenstand", en: "Item" }), icon: Box },
        { value: "concept", label: t({ de: "Konzept", en: "Concept" }), icon: Lightbulb },
        { value: "organization", label: t({ de: "Gruppe", en: "Group" }), icon: Users },
        { value: "magic_system", label: t({ de: "Magie", en: "Magic" }), icon: Zap },
        { value: "technology", label: t({ de: "Tech", en: "Technology" }), icon: Cpu },
    ]), [t]);

    const [name, setName] = useState(worldElement?.name || "");
    const [type, setType] = useState(worldElement?.type || "location");
    const [description, setDescription] = useState(worldElement?.description || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [error, setError] = useState<string | null>(null);

    const typeLabel = worldTypes.find((worldType) => worldType.value === type)?.label || type;

    // Filtered types for selection to ensure icon lookup works
    const SelectedIcon = worldTypes.find(t => t.value === type)?.icon || Globe;

    const handleSave = async () => {
        if (!name.trim()) {
            setError(t({ de: "Name ist erforderlich", en: "Name is required" }));
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
                throw new Error(t({ de: "Fehler beim Speichern", en: "Failed to save" }));
            }

            const savedWorldElement = await response.json();
            onSave?.(savedWorldElement);
        } catch (err) {
            setError(err instanceof Error ? err.message : t({ de: "Unbekannter Fehler", en: "Unknown error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerate = async () => {
        if (!aiPrompt.trim() && !name.trim()) {
            setError(t({ de: "Bitte gib einen Namen oder einen Prompt ein.", en: "Please enter a name or a prompt." }));
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const promptToSend = aiPrompt.trim() || t({
                de: "Erstelle eine Beschreibung für {{type}}: \"{{name}}\"",
                en: "Create a description for {{type}}: \"{{name}}\"",
            }, { type: typeLabel, name });

            const response = await fetch(`/api/books/${bookId}/world/ai`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: isEditing ? "enhance" : "generate",
                    worldElementId: worldElement?.id,
                    prompt: promptToSend,
                }),
            });

            if (!response.ok) throw new Error(t({ de: "KI-Generierung fehlgeschlagen", en: "AI generation failed" }));

            const data = await response.json();
            const generated = data.worldElement;

            if (generated) {
                if (generated.name) setName(generated.name);
                if (generated.type && worldTypes.some(t => t.value === generated.type)) setType(generated.type);
                if (generated.description) setDescription(generated.description);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t({ de: "Fehler bei der Generierung", en: "Error during generation" }));
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
                                {isEditing ? t({ de: "Element bearbeiten", en: "Edit element" }) : t({ de: "Neues Weltelement", en: "New world element" })}
                            </CardTitle>
                            <CardDescription>
                                {t({ de: "Erweitere deine Welt mit Orten, Gegenständen und mehr.", en: "Expand your world with locations, items, and more." })}
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
                                placeholder={t({
                                    de: "Beschreibe, was du erstellen möchtest (oder lass leer für den Namen)...",
                                    en: "Describe what you'd like to create (or leave empty to use the name)...",
                                })}
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
                            {isEditing
                                ? t({ de: "KI kann die Beschreibung verbessern.", en: "AI can improve the description." })
                                : t({ de: "KI kann Name und Beschreibung vorschlagen.", en: "AI can suggest name and description." })}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* Type Selection */}
                        <div className="grid grid-cols-3 gap-2">
                            {worldTypes.map((worldType) => {
                                const Icon = worldType.icon;
                                const isSelected = type === worldType.value;
                                return (
                                    <div
                                        key={worldType.value}
                                        onClick={() => setType(worldType.value)}
                                        className={cn(
                                            "cursor-pointer rounded-lg border p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200",
                                            isSelected
                                                ? "bg-primary/10 border-primary text-primary shadow-sm"
                                                : "bg-background hover:bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-xs font-medium">{worldType.label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t({ de: "Name", en: "Name" })}</label>
                            <div className="relative">
                                <SelectedIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t({ de: "Name des Elements", en: "Element name" })}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t({ de: "Beschreibung", en: "Description" })}</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t({ de: "Detaillierte Beschreibung...", en: "Detailed description..." })}
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
                            {t({ de: "Abbrechen", en: "Cancel" })}
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {t({ de: "Speichern", en: "Save" })}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
