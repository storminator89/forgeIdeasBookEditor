"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";

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

type PlotPointInput = Omit<PlotPoint, "id" | "orderIndex">;

interface PlotPointFormProps {
    bookId: string;
    plotPoint?: PlotPoint;
    onSave?: (plotPoint: PlotPoint) => void;
    onCancel?: () => void;
}

const PLOT_TYPES = [
    { value: "hook", label: "Hook / Einstieg" },
    { value: "rising_action", label: "Steigende Handlung" },
    { value: "climax", label: "Höhepunkt" },
    { value: "falling_action", label: "Fallende Handlung" },
    { value: "resolution", label: "Auflösung" },
    { value: "subplot", label: "Nebenhandlung" },
    { value: "event", label: "Ereignis" },
];

export default function PlotPointForm({
    bookId,
    plotPoint,
    onSave,
    onCancel,
}: PlotPointFormProps) {
    const isEditing = !!plotPoint;

    const [title, setTitle] = useState(plotPoint?.title || "");
    const [description, setDescription] = useState(plotPoint?.description || "");
    const [type, setType] = useState(plotPoint?.type || "event");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!title.trim()) {
            setError("Titel ist erforderlich");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const body: PlotPointInput = {
                title: title.trim(),
                description: description || null,
                type,
            };

            const url = isEditing
                ? `/api/books/${bookId}/plot/${plotPoint.id}`
                : `/api/books/${bookId}/plot`;

            const response = await fetch(url, {
                method: isEditing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error("Fehler beim Speichern");
            }

            const savedPlotPoint = await response.json();
            onSave?.(savedPlotPoint);
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
                                {isEditing ? "Handlungspunkt bearbeiten" : "Neuer Handlungspunkt"}
                            </CardTitle>
                            <CardDescription>
                                {isEditing
                                    ? "Bearbeite die Details dieses Handlungspunkts."
                                    : "Erstelle einen neuen Handlungspunkt für deine Geschichte."}
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onCancel}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Titel *</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="z.B. Der Held verlässt sein Dorf"
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
                            {PLOT_TYPES.map((t) => (
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
                            placeholder="Was passiert in diesem Handlungspunkt? Welche Charaktere sind beteiligt?"
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
