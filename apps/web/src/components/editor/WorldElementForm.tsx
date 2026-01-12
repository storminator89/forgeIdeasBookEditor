"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    { value: "location", label: "Ort / Schauplatz" },
    { value: "item", label: "Gegenstand" },
    { value: "concept", label: "Konzept / Idee" },
    { value: "organization", label: "Organisation / Gruppe" },
    { value: "magic_system", label: "Magiesystem" },
    { value: "technology", label: "Technologie" },
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
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center overflow-auto py-10">
            <Card className="w-full max-w-lg mx-4">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                {isEditing ? "Weltelement bearbeiten" : "Neues Weltelement"}
                            </CardTitle>
                            <CardDescription>
                                {isEditing
                                    ? "Bearbeite die Details dieses Weltelements."
                                    : "Erstelle ein neues Element deiner Geschichte-Welt."}
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onCancel}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name *</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="z.B. Das Königreich Eldoria"
                        />
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Typ</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                            {WORLD_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Beschreibung</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Beschreibe dieses Element deiner Welt. Was macht es besonders?"
                            className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
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
                            Abbrechen
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {isEditing ? "Speichern" : "Erstellen"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
