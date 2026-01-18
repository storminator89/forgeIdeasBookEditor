"use client";

import { useState, useRef } from "react";
import { Loader2, Sparkles, Wand2, Check, X, UserPlus, Upload, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Character = {
    id: string;
    name: string;
    role: string;
    description: string | null;
    personality: string | null;
    backstory: string | null;
    appearance: string | null;
    motivation: string | null;
    arc: string | null;
    notes: string | null;
    imageUrl: string | null;
};

type GeneratedCharacter = {
    name: string;
    role: string;
    description: string;
    personality: string;
    backstory: string;
    appearance: string;
    motivation: string;
    arc: string;
    notes: string;
    imageUrl?: string;
};

interface CharacterAIPanelProps {
    bookId: string;
    onCharacterCreated: (character: Character) => void;
    onCharacterUpdated: (character: Character) => void;
}

export default function CharacterAIPanel({
    bookId,
    onCharacterCreated,
    onCharacterUpdated,
}: CharacterAIPanelProps) {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<GeneratedCharacter | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("Bitte gib eine Beschreibung ein");
            return;
        }

        setIsLoading(true);
        setError(null);
        setPreview(null);

        try {
            const response = await fetch(`/api/books/${bookId}/characters/ai`, {
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
            setPreview(data.character);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unbekannter Fehler");
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !preview) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload fehlgeschlagen");
            }

            const data = await response.json();
            setPreview({ ...preview, imageUrl: data.url });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload-Fehler");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!preview) return;

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/books/${bookId}/characters`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(preview),
            });

            if (!response.ok) {
                throw new Error("Fehler beim Speichern");
            }

            const savedCharacter = await response.json();
            onCharacterCreated(savedCharacter);
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

    const updatePreview = (field: keyof GeneratedCharacter, value: string) => {
        if (preview) {
            setPreview({ ...preview, [field]: value });
        }
    };

    return (
        <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    KI-Charakter-Assistent
                </CardTitle>
                <CardDescription>
                    Beschreibe, welchen Charakter du brauchst - die KI erstellt ihn passend zu deinem Buch.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!preview ? (
                    <>
                        <div className="flex gap-2">
                            <Input
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="z.B. 'Erstelle einen mysteriösen Antagonisten' oder 'Füge eine weise Mentorin hinzu'"
                                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                                disabled={isLoading}
                            />
                            <Button onClick={handleGenerate} disabled={isLoading || !prompt.trim()}>
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <UserPlus className="h-4 w-4" />
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
                        {/* Editable Preview */}
                        <div className="p-4 rounded-lg border bg-card space-y-3">
                            {/* Image Upload */}
                            <div className="flex items-start gap-4">
                                <div
                                    className="relative h-20 w-20 rounded-full bg-gradient-to-br from-chart-1 to-chart-3 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {preview.imageUrl ? (
                                        <img
                                            src={preview.imageUrl}
                                            alt={preview.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : isUploading ? (
                                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                                    ) : (
                                        <div className="text-center">
                                            <ImageIcon className="h-6 w-6 text-white mx-auto" />
                                            <span className="text-[10px] text-white/80">Foto</span>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </div>

                                <div className="flex-1 space-y-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">Name</label>
                                        <Input
                                            value={preview.name}
                                            onChange={(e) => updatePreview("name", e.target.value)}
                                            className="h-8"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Rolle</label>
                                        <select
                                            value={preview.role}
                                            onChange={(e) => updatePreview("role", e.target.value)}
                                            className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
                                        >
                                            <option value="protagonist">Protagonist</option>
                                            <option value="antagonist">Antagonist</option>
                                            <option value="supporting">Nebenrolle</option>
                                            <option value="minor">Kleine Rolle</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Other editable fields */}
                            <div className="space-y-2 text-sm">
                                <div>
                                    <label className="text-xs text-muted-foreground">Beschreibung</label>
                                    <textarea
                                        value={preview.description}
                                        onChange={(e) => updatePreview("description", e.target.value)}
                                        className="w-full min-h-[60px] px-2 py-1 rounded-md border border-input bg-background text-sm resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">Persönlichkeit</label>
                                    <textarea
                                        value={preview.personality}
                                        onChange={(e) => updatePreview("personality", e.target.value)}
                                        className="w-full min-h-[40px] px-2 py-1 rounded-md border border-input bg-background text-sm resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">Motivation</label>
                                    <textarea
                                        value={preview.motivation}
                                        onChange={(e) => updatePreview("motivation", e.target.value)}
                                        className="w-full min-h-[40px] px-2 py-1 rounded-md border border-input bg-background text-sm resize-none"
                                    />
                                </div>
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

// Component for enhancing existing characters
interface CharacterEnhanceButtonProps {
    bookId: string;
    character: Character;
    onUpdate: (character: Character) => void;
}

export function CharacterEnhanceButton({
    bookId,
    character,
    onUpdate,
}: CharacterEnhanceButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<GeneratedCharacter | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleEnhance = async () => {
        if (!prompt.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/books/${bookId}/characters/ai`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "enhance",
                    characterId: character.id,
                    prompt,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Fehler bei der Verbesserung");
            }

            const data = await response.json();
            setPreview(data.character);
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
            const response = await fetch(`/api/books/${bookId}/characters/${character.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(preview),
            });

            if (!response.ok) {
                throw new Error("Fehler beim Speichern");
            }

            const updatedCharacter = await response.json();
            onUpdate(updatedCharacter);
            setIsOpen(false);
            setPreview(null);
            setPrompt("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Fehler beim Speichern");
        } finally {
            setIsSaving(false);
        }
    };

    const updatePreview = (field: keyof GeneratedCharacter, value: string) => {
        if (preview) {
            setPreview({ ...preview, [field]: value });
        }
    };

    if (!isOpen) {
        return (
            <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(true);
                }}
                className="h-8 gap-1.5"
            >
                <Wand2 className="h-3.5 w-3.5" />
                Mit KI bearbeiten
            </Button>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
                setIsOpen(false);
                setPreview(null);
                setPrompt("");
                setError(null);
            }}
        >
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-violet-500" />
                        {character.name} verbessern
                    </CardTitle>
                    <CardDescription>
                        Beschreibe, wie der Charakter verändert werden soll.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!preview ? (
                        <>
                            <Input
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="z.B. 'Mach ihn mysteriöser' oder 'Füge eine tragische Hintergrundgeschichte hinzu'"
                                onKeyDown={(e) => e.key === "Enter" && handleEnhance()}
                                disabled={isLoading}
                                autoFocus
                            />

                            {error && (
                                <div className="p-2 rounded bg-destructive/10 text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                                    Abbrechen
                                </Button>
                                <Button onClick={handleEnhance} disabled={isLoading || !prompt.trim()} className="flex-1">
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4 mr-2" />
                                    )}
                                    Generieren
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Editable Preview */}
                            <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">Name</label>
                                        <Input
                                            value={preview.name}
                                            onChange={(e) => updatePreview("name", e.target.value)}
                                            className="h-8"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Rolle</label>
                                        <select
                                            value={preview.role}
                                            onChange={(e) => updatePreview("role", e.target.value)}
                                            className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
                                        >
                                            <option value="protagonist">Protagonist</option>
                                            <option value="antagonist">Antagonist</option>
                                            <option value="supporting">Nebenrolle</option>
                                            <option value="minor">Kleine Rolle</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div>
                                        <label className="text-xs text-muted-foreground">Beschreibung</label>
                                        <textarea
                                            value={preview.description}
                                            onChange={(e) => updatePreview("description", e.target.value)}
                                            className="w-full min-h-[60px] px-2 py-1 rounded-md border border-input bg-background text-sm resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Persönlichkeit</label>
                                        <textarea
                                            value={preview.personality}
                                            onChange={(e) => updatePreview("personality", e.target.value)}
                                            className="w-full min-h-[40px] px-2 py-1 rounded-md border border-input bg-background text-sm resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Motivation</label>
                                        <textarea
                                            value={preview.motivation}
                                            onChange={(e) => updatePreview("motivation", e.target.value)}
                                            className="w-full min-h-[40px] px-2 py-1 rounded-md border border-input bg-background text-sm resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Hintergrund</label>
                                        <textarea
                                            value={preview.backstory}
                                            onChange={(e) => updatePreview("backstory", e.target.value)}
                                            className="w-full min-h-[60px] px-2 py-1 rounded-md border border-input bg-background text-sm resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-2 rounded bg-destructive/10 text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setPreview(null)} disabled={isSaving} className="flex-1">
                                    Zurück
                                </Button>
                                <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                    )}
                                    Übernehmen
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
