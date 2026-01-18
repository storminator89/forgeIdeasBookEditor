"use client";

import { useState } from "react";
import { X, Plus, Trash2, Users, Heart, Swords, UserPlus, Handshake, GraduationCap, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Character = {
    id: string;
    name: string;
    role: string;
    imageUrl: string | null;
};

type Relation = {
    id?: string;
    relatedCharacterId: string;
    relationType: string;
    description: string | null;
};

type CharacterWithRelations = Character & {
    relationsFrom: Array<{
        id: string;
        relationType: string;
        description: string | null;
        relatedCharacter: Character;
    }>;
};

type Props = {
    character: CharacterWithRelations;
    allCharacters: Character[];
    bookId: string;
    onSave: (updatedRelations: Relation[]) => void;
    onClose: () => void;
};

const RELATION_TYPES = [
    { value: "family", label: "Familie", icon: Users, color: "text-green-500", bgColor: "bg-green-500/10" },
    { value: "friend", label: "Freund", icon: Handshake, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { value: "enemy", label: "Feind", icon: Swords, color: "text-red-500", bgColor: "bg-red-500/10" },
    { value: "romantic", label: "Romantisch", icon: Heart, color: "text-pink-500", bgColor: "bg-pink-500/10" },
    { value: "colleague", label: "Kollege", icon: UserPlus, color: "text-gray-500", bgColor: "bg-gray-500/10" },
    { value: "rival", label: "Rivale", icon: Trophy, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    { value: "mentor", label: "Mentor", icon: GraduationCap, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
];

export function getRelationTypeInfo(type: string) {
    return RELATION_TYPES.find(t => t.value === type) || RELATION_TYPES[4]; // default to colleague
}

export default function CharacterRelationModal({
    character,
    allCharacters,
    bookId,
    onSave,
    onClose,
}: Props) {
    // Initialize relations from character
    const [relations, setRelations] = useState<Relation[]>(
        character.relationsFrom.map(r => ({
            id: r.id,
            relatedCharacterId: r.relatedCharacter.id,
            relationType: r.relationType,
            description: r.description,
        }))
    );
    const [isSaving, setIsSaving] = useState(false);

    // Available characters (exclude current character and already related)
    const relatedIds = new Set(relations.map(r => r.relatedCharacterId));
    const availableCharacters = allCharacters.filter(
        c => c.id !== character.id && !relatedIds.has(c.id)
    );

    const addRelation = (targetId: string) => {
        setRelations([
            ...relations,
            { relatedCharacterId: targetId, relationType: "friend", description: null }
        ]);
    };

    const updateRelationType = (index: number, type: string) => {
        const updated = [...relations];
        updated[index].relationType = type;
        setRelations(updated);
    };

    const updateRelationDescription = (index: number, description: string) => {
        const updated = [...relations];
        updated[index].description = description || null;
        setRelations(updated);
    };

    const removeRelation = (index: number) => {
        setRelations(relations.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/books/${bookId}/characters/${character.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ relations }),
            });

            if (response.ok) {
                onSave(relations);
                onClose();
            }
        } catch (error) {
            console.error("Error saving relations:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const getCharacterName = (id: string) => {
        return allCharacters.find(c => c.id === id)?.name || "Unbekannt";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-card border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-chart-1 to-chart-3 flex items-center justify-center text-white font-bold overflow-hidden">
                            {character.imageUrl ? (
                                <img
                                    src={character.imageUrl}
                                    alt={character.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                character.name.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">{character.name}</h2>
                            <p className="text-sm text-muted-foreground">Beziehungen verwalten</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    {/* Current Relations */}
                    {relations.length > 0 && (
                        <div className="space-y-3">
                            <Label className="text-base font-medium">Aktuelle Beziehungen</Label>
                            {relations.map((relation, index) => {
                                const typeInfo = getRelationTypeInfo(relation.relationType);
                                const TypeIcon = typeInfo.icon;
                                return (
                                    <Card key={index} className="border">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-4">
                                                {/* Target Character */}
                                                <div className="flex-1">
                                                    <p className="font-medium">{getCharacterName(relation.relatedCharacterId)}</p>
                                                </div>

                                                {/* Relation Type Selector */}
                                                <select
                                                    value={relation.relationType}
                                                    onChange={(e) => updateRelationType(index, e.target.value)}
                                                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                >
                                                    {RELATION_TYPES.map(type => (
                                                        <option key={type.value} value={type.value}>
                                                            {type.label}
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* Type Badge */}
                                                <div className={`p-2 rounded-full ${typeInfo.bgColor}`}>
                                                    <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                                                </div>

                                                {/* Remove Button */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => removeRelation(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* Description */}
                                            <Input
                                                value={relation.description || ""}
                                                onChange={(e) => updateRelationDescription(index, e.target.value)}
                                                placeholder="Beschreibung (optional)..."
                                                className="mt-3"
                                            />
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {/* Add New Relation */}
                    {availableCharacters.length > 0 && (
                        <div className="space-y-3">
                            <Label className="text-base font-medium">Neue Beziehung hinzufügen</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {availableCharacters.map(char => (
                                    <Button
                                        key={char.id}
                                        variant="outline"
                                        className="justify-start gap-2"
                                        onClick={() => addRelation(char.id)}
                                    >
                                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium overflow-hidden">
                                            {char.imageUrl ? (
                                                <img
                                                    src={char.imageUrl}
                                                    alt={char.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                char.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <span className="truncate">{char.name}</span>
                                        <Plus className="h-4 w-4 ml-auto" />
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {relations.length === 0 && availableCharacters.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Keine anderen Charaktere verfügbar.</p>
                            <p className="text-sm">Erstelle weitere Charaktere, um Beziehungen zu definieren.</p>
                        </div>
                    )}

                    {/* Legend */}
                    <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Beziehungstypen</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            {RELATION_TYPES.map(type => {
                                const Icon = type.icon;
                                return (
                                    <div key={type.value} className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-full ${type.bgColor}`}>
                                            <Icon className={`h-3 w-3 ${type.color}`} />
                                        </div>
                                        <span>{type.label}</span>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
                    <Button variant="outline" onClick={onClose}>
                        Abbrechen
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Speichern..." : "Speichern"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
