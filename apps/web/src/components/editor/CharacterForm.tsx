"use client";

import { useState, useRef, useMemo } from "react";
import { Loader2, Save, X, Upload, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

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

type CharacterInput = Omit<Character, "id">;

interface CharacterFormProps {
    bookId: string;
    character?: Character;
    onSave?: (character: Character) => void;
    onCancel?: () => void;
}

export default function CharacterForm({
    bookId,
    character,
    onSave,
    onCancel,
}: CharacterFormProps) {
    const { t } = useI18n();
    const isEditing = !!character;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const roles = useMemo(() => ([
        { value: "protagonist", label: t({ de: "Protagonist", en: "Protagonist" }) },
        { value: "antagonist", label: t({ de: "Antagonist", en: "Antagonist" }) },
        { value: "supporting", label: t({ de: "Nebenrolle", en: "Supporting" }) },
        { value: "minor", label: t({ de: "Kleine Rolle", en: "Minor" }) },
    ]), [t]);

    const [name, setName] = useState(character?.name || "");
    const [role, setRole] = useState(character?.role || "supporting");
    const [description, setDescription] = useState(character?.description || "");
    const [personality, setPersonality] = useState(character?.personality || "");
    const [backstory, setBackstory] = useState(character?.backstory || "");
    const [appearance, setAppearance] = useState(character?.appearance || "");
    const [motivation, setMotivation] = useState(character?.motivation || "");
    const [arc, setArc] = useState(character?.arc || "");
    const [notes, setNotes] = useState(character?.notes || "");
    const [imageUrl, setImageUrl] = useState(character?.imageUrl || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(t({ de: "Upload fehlgeschlagen", en: "Upload failed" }));
            }

            const data = await response.json();
            setImageUrl(data.url);
        } catch (err) {
            setError(err instanceof Error ? err.message : t({ de: "Upload-Fehler", en: "Upload error" }));
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError(t({ de: "Name ist erforderlich", en: "Name is required" }));
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const body: CharacterInput = {
                name: name.trim(),
                role,
                description: description || null,
                personality: personality || null,
                backstory: backstory || null,
                appearance: appearance || null,
                motivation: motivation || null,
                arc: arc || null,
                notes: notes || null,
                imageUrl: imageUrl || null,
            };

            const url = isEditing
                ? `/api/books/${bookId}/characters/${character.id}`
                : `/api/books/${bookId}/characters`;

            const response = await fetch(url, {
                method: isEditing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(t({ de: "Fehler beim Speichern", en: "Failed to save" }));
            }

            const savedCharacter = await response.json();
            onSave?.(savedCharacter);
        } catch (err) {
            setError(err instanceof Error ? err.message : t({ de: "Unbekannter Fehler", en: "Unknown error" }));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center overflow-auto py-10">
            <Card className="w-full max-w-2xl mx-4">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                {isEditing ? t({ de: "Charakter bearbeiten", en: "Edit character" }) : t({ de: "Neuer Charakter", en: "New character" })}
                            </CardTitle>
                            <CardDescription>
                                {isEditing
                                    ? t({ de: "Bearbeite die Details dieses Charakters.", en: "Edit this character's details." })
                                    : t({ de: "Erstelle einen neuen Charakter für dein Buch.", en: "Create a new character for your book." })}
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onCancel}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Image Upload & Name/Role */}
                    <div className="flex gap-4">
                        {/* Image Upload */}
                        <div
                            className="relative h-24 w-24 rounded-full bg-gradient-to-br from-chart-1 to-chart-3 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden flex-shrink-0"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={name || t({ de: "Charakter", en: "Character" })}
                                    className="h-full w-full object-cover"
                                />
                            ) : isUploading ? (
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                            ) : (
                                <div className="text-center">
                                    <ImageIcon className="h-8 w-8 text-white mx-auto" />
                                    <span className="text-xs text-white/80">{t({ de: "Foto", en: "Photo" })}</span>
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

                        {/* Name & Role */}
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <label className="text-sm font-medium">{t({ de: "Name *", en: "Name *" })}</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t({ de: "z.B. Anna Schmidt", en: "e.g. Anna Schmidt" })}
                                />
                            </div>
                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <label className="text-sm font-medium">{t({ de: "Rolle", en: "Role" })}</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                >
                                    {roles.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {imageUrl && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setImageUrl("")}
                        >
                            {t({ de: "Bild entfernen", en: "Remove image" })}
                        </Button>
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t({ de: "Kurzbeschreibung", en: "Short description" })}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t({
                                de: "Wer ist dieser Charakter? Was ist seine/ihre Bedeutung in der Geschichte?",
                                en: "Who is this character? What is their role in the story?",
                            })}
                            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Personality */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t({ de: "Persönlichkeit", en: "Personality" })}</label>
                        <textarea
                            value={personality}
                            onChange={(e) => setPersonality(e.target.value)}
                            placeholder={t({
                                de: "Charakterzüge, Stärken, Schwächen, Gewohnheiten...",
                                en: "Traits, strengths, weaknesses, habits...",
                            })}
                            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Appearance */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t({ de: "Aussehen", en: "Appearance" })}</label>
                        <textarea
                            value={appearance}
                            onChange={(e) => setAppearance(e.target.value)}
                            placeholder={t({ de: "Physische Beschreibung, Kleidungsstil...", en: "Physical description, style..." })}
                            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Backstory */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t({ de: "Hintergrundgeschichte", en: "Backstory" })}</label>
                        <textarea
                            value={backstory}
                            onChange={(e) => setBackstory(e.target.value)}
                            placeholder={t({ de: "Vergangenheit, wichtige Ereignisse, Beziehungen...", en: "Past, key events, relationships..." })}
                            className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Motivation */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t({ de: "Motivation & Ziele", en: "Motivation & goals" })}</label>
                        <textarea
                            value={motivation}
                            onChange={(e) => setMotivation(e.target.value)}
                            placeholder={t({
                                de: "Was will dieser Charakter erreichen? Was treibt ihn/sie an?",
                                en: "What does this character want to achieve? What drives them?",
                            })}
                            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Character Arc */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t({ de: "Charakterentwicklung", en: "Character arc" })}</label>
                        <textarea
                            value={arc}
                            onChange={(e) => setArc(e.target.value)}
                            placeholder={t({ de: "Wie entwickelt sich der Charakter im Laufe der Geschichte?", en: "How does the character evolve over the story?" })}
                            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t({ de: "Notizen", en: "Notes" })}</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t({ de: "Private Notizen zu diesem Charakter...", en: "Private notes about this character..." })}
                            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={onCancel}>
                            {t({ de: "Abbrechen", en: "Cancel" })}
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {isEditing ? t({ de: "Speichern", en: "Save" }) : t({ de: "Erstellen", en: "Create" })}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
