"use client";

import { useState } from "react";
import {
    Globe,
    MapPin,
    Box,
    Lightbulb,
    Users,
    Zap,
    Cpu,
    Plus,
    Search,
    Filter,
    Trash2,
    Edit2,
    MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Types (should ideally be shared)
type WorldElement = {
    id: string;
    name: string;
    type: string;
    description: string | null;
    imageUrl: string | null;
};

type WorldTabProps = {
    worldElements: WorldElement[];
    onEdit: (element: WorldElement) => void;
    onDelete: (id: string) => void;
    onCreate: () => void;
};

const WORLD_TYPES = [
    { value: "all", label: "Alle", icon: Globe },
    { value: "location", label: "Orte", icon: MapPin },
    { value: "item", label: "Gegenstände", icon: Box },
    { value: "concept", label: "Konzepte", icon: Lightbulb },
    { value: "organization", label: "Gruppen", icon: Users },
    { value: "magic_system", label: "Magie", icon: Zap },
    { value: "technology", label: "Technik", icon: Cpu },
];

export default function WorldTab({
    worldElements,
    onEdit,
    onDelete,
    onCreate
}: WorldTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");

    const filteredElements = worldElements.filter(element => {
        const matchesSearch = element.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (element.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        const matchesFilter = activeFilter === "all" || element.type === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const getTypeIcon = (type: string) => {
        const found = WORLD_TYPES.find(t => t.value === type);
        return found ? found.icon : Globe;
    };

    const getTypeLabel = (type: string) => {
        const found = WORLD_TYPES.find(t => t.value === type);
        return found ? found.label : type;
    };

    return (
        <div className="space-y-6">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="md:col-span-3 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-background border-indigo-500/20 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                    <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-xl font-serif">World Building Dashboard</CardTitle>
                        <CardDescription>Verwalte die Lore, Orte und Gegenstände deiner Welt.</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-0">
                        <div className="flex gap-4 mt-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
                                <MapPin className="h-4 w-4 text-emerald-500" />
                                <span className="font-medium text-foreground">{worldElements.filter(e => e.type === "location").length}</span> Orte
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
                                <Users className="h-4 w-4 text-blue-500" />
                                <span className="font-medium text-foreground">{worldElements.filter(e => e.type === "organization").length}</span> Gruppen
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
                                <Zap className="h-4 w-4 text-amber-500" />
                                <span className="font-medium text-foreground">{worldElements.filter(e => e.type === "magic_system").length}</span> Magie
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col justify-center items-center p-6 border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer bg-secondary/20 hover:bg-secondary/40 group" onClick={onCreate}>
                    <div className="rounded-full bg-primary/10 p-3 mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-medium text-sm">Neues Element</span>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between sticky top-0 z-20 bg-background/95 backdrop-blur py-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                    {WORLD_TYPES.map(type => {
                        const Icon = type.icon;
                        const isActive = activeFilter === type.value;
                        return (
                            <button
                                key={type.value}
                                onClick={() => setActiveFilter(type.value)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {type.label}
                            </button>
                        );
                    })}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Suche..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                    />
                </div>
            </div>

            {/* Grid */}
            <AnimatePresence mode="popLayout">
                {filteredElements.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center justify-center py-16 text-center"
                    >
                        <div className="bg-secondary/50 p-6 rounded-full mb-4">
                            <Globe className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-medium">Keine Elemente gefunden</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mt-2 mb-6">
                            Es gibt keine Weltelemente, die deiner Suche oder dem Filter entsprechen.
                        </p>
                        {activeFilter !== "all" || searchQuery ? (
                            <Button variant="outline" onClick={() => { setActiveFilter("all"); setSearchQuery(""); }}>Filter zurücksetzen</Button>
                        ) : (
                            <Button onClick={onCreate}>Erstes Element erstellen</Button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {filteredElements.map((element) => {
                            const TypeIcon = getTypeIcon(element.type);
                            return (
                                <motion.div
                                    key={element.id}
                                    layoutId={element.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group"
                                >
                                    <div
                                        onClick={() => onEdit(element)}
                                        className="relative h-full bg-card/40 hover:bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/50 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col"
                                    >
                                        {/* Image Header */}
                                        <div className="h-32 bg-secondary/50 relative overflow-hidden group-hover:h-40 transition-all duration-500 ease-in-out">
                                            {element.imageUrl ? (
                                                <img
                                                    src={element.imageUrl}
                                                    alt={element.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <TypeIcon className="h-12 w-12 text-muted-foreground/10 group-hover:text-primary/20 transition-colors" />
                                                </div>
                                            )}

                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />

                                            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                                                <div className="bg-background/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5 shadow-sm">
                                                    <TypeIcon className="h-3 w-3" />
                                                    {getTypeLabel(element.type)}
                                                </div>
                                            </div>

                                            {/* Action Menu (Top Right) */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        render={
                                                            <Button
                                                                variant="secondary"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full shadow-md bg-background/80 backdrop-blur"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        }
                                                    >
                                                        <MoreVertical className="h-3.5 w-3.5" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(element); }}>
                                                            <Edit2 className="mr-2 h-4 w-4" /> Bearbeiten
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Löschen
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col">
                                            <h3 className="text-lg font-bold font-serif mb-2 group-hover:text-primary transition-colors">{element.name}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                                {element.description || <span className="italic opacity-50">Keine Beschreibung...</span>}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
