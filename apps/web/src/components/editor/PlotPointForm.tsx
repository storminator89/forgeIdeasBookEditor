"use client";

import { useState, useMemo } from "react";
import { Loader2, Save, X } from "lucide-react";

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

type PlotPointInput = Omit<PlotPoint, "id" | "orderIndex">;

interface PlotPointFormProps {
    bookId: string;
    plotPoint?: PlotPoint;
    onSave?: (plotPoint: PlotPoint) => void;
    onCancel?: () => void;
}

export default function PlotPointForm({
    bookId,
    plotPoint,
    onSave,
    onCancel,
}: PlotPointFormProps) {
    const { t } = useI18n();
    const isEditing = !!plotPoint;

    const plotTypes = useMemo(() => ([
        { value: "hook", label: t({ de: "Hook / Einstieg", en: "Hook / opening" }) },
        { value: "rising_action", label: t({ de: "Steigende Handlung", en: "Rising action" }) },
        { value: "climax", label: t({ de: "Höhepunkt", en: "Climax" }) },
        { value: "falling_action", label: t({ de: "Fallende Handlung", en: "Falling action" }) },
        { value: "resolution", label: t({ de: "Auflösung", en: "Resolution" }) },
        { value: "subplot", label: t({ de: "Nebenhandlung", en: "Subplot" }) },
        { value: "event", label: t({ de: "Ereignis", en: "Event" }) },
    ]), [t]);

    const [title, setTitle] = useState(plotPoint?.title || "");
    const [description, setDescription] = useState(plotPoint?.description || "");
    const [type, setType] = useState(plotPoint?.type || "event");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!title.trim()) {
            setError(t({ de: "Titel ist erforderlich", en: "Title is required" }));
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
                throw new Error(t({ de: "Fehler beim Speichern", en: "Failed to save" }));
            }

            const savedPlotPoint = await response.json();
            onSave?.(savedPlotPoint);
        } catch (err) {
            setError(err instanceof Error ? err.message : t({ de: "Unbekannter Fehler", en: "Unknown error" }));
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
                                {isEditing ? t({ de: "Handlungspunkt bearbeiten", en: "Edit plot point" }) : t({ de: "Neuer Handlungspunkt", en: "New plot point" })}
                            </CardTitle>
                            <CardDescription>
                                {isEditing
                                    ? t({ de: "Bearbeite die Details dieses Handlungspunkts.", en: "Edit the details of this plot point." })
                                    : t({ de: "Erstelle einen neuen Handlungspunkt für deine Geschichte.", en: "Create a new plot point for your story." })}
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
                        <label className="text-sm font-medium">{t({ de: "Titel *", en: "Title *" })}</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t({ de: "z.B. Der Held verlässt sein Dorf", en: "e.g. The hero leaves their village" })}
                        />
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t({ de: "Typ", en: "Type" })}</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                            {plotTypes.map((plotType) => (
                                <option key={plotType.value} value={plotType.value}>
                                    {plotType.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t({ de: "Beschreibung", en: "Description" })}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t({
                                de: "Was passiert in diesem Handlungspunkt? Welche Charaktere sind beteiligt?",
                                en: "What happens at this plot point? Which characters are involved?",
                            })}
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
