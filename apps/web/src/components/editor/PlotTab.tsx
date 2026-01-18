"use client";

import { useState, useMemo } from "react";
import {
    Map,
    Anchor,
    ArrowUpCircle,
    Star,
    ArrowDownCircle,
    CheckCircle2,
    GitBranch,
    Calendar,
    Plus,
    Search,
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
import { useI18n } from "@/components/locale-provider";

import PlotAIPanel from "./PlotAIPanel";

// Types
type PlotPoint = {
    id: string;
    title: string;
    description: string | null;
    type: string;
    orderIndex: number;
};

type PlotTabProps = {
    bookId: string;
    plotPoints: PlotPoint[];
    onEdit: (plotPoint: PlotPoint) => void;
    onDelete: (id: string) => void;
    onCreate: () => void;
    onSave: (plotPoint: PlotPoint) => void;
};

export default function PlotTab({
    bookId,
    plotPoints,
    onEdit,
    onDelete,
    onCreate,
    onSave
}: PlotTabProps) {
    const { t } = useI18n();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");

    const plotTypes = useMemo(() => ([
        { value: "all", label: t({ de: "Alle", en: "All" }), icon: Map },
        { value: "hook", label: t({ de: "Hook", en: "Hook" }), icon: Anchor },
        { value: "rising_action", label: t({ de: "Steigend", en: "Rising" }), icon: ArrowUpCircle },
        { value: "climax", label: t({ de: "Höhepunkt", en: "Climax" }), icon: Star },
        { value: "falling_action", label: t({ de: "Fallend", en: "Falling" }), icon: ArrowDownCircle },
        { value: "resolution", label: t({ de: "Auflösung", en: "Resolution" }), icon: CheckCircle2 },
        { value: "subplot", label: t({ de: "Nebenplot", en: "Subplot" }), icon: GitBranch },
        { value: "event", label: t({ de: "Ereignis", en: "Event" }), icon: Calendar },
    ]), [t]);

    const filteredPoints = plotPoints.filter(point => {
        const matchesSearch = point.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (point.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        const matchesFilter = activeFilter === "all" || point.type === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const getTypeIcon = (type: string) => {
        const found = plotTypes.find((plotType) => plotType.value === type);
        return found ? found.icon : Map;
    };

    const getTypeLabel = (type: string) => {
        const found = plotTypes.find((plotType) => plotType.value === type);
        return found ? found.label : type;
    };

    return (
        <div className="space-y-6">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="md:col-span-3 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-background border-amber-500/20 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                    <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-xl font-serif">{t({ de: "Handlungsübersicht", en: "Plot overview" })}</CardTitle>
                        <CardDescription>{t({ de: "Strukturiere deine Geschichte und verwalte wichtige Wendepunkte.", en: "Structure your story and manage key turning points." })}</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-0">
                        <div className="flex gap-4 mt-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
                                <Star className="h-4 w-4 text-amber-500" />
                                <span className="font-medium text-foreground">{plotPoints.filter(p => p.type === "climax").length}</span> {t({ de: "Höhepunkte", en: "Climaxes" })}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
                                <GitBranch className="h-4 w-4 text-blue-500" />
                                <span className="font-medium text-foreground">{plotPoints.filter(p => p.type === "subplot").length}</span> {t({ de: "Nebenplots", en: "Subplots" })}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
                                <Calendar className="h-4 w-4 text-emerald-500" />
                                <span className="font-medium text-foreground">{plotPoints.length}</span> {t({ de: "Ereignisse", en: "Events" })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col justify-center items-center p-6 border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer bg-secondary/20 hover:bg-secondary/40 group" onClick={onCreate}>
                    <div className="rounded-full bg-primary/10 p-3 mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-medium text-sm">{t({ de: "Neuer Punkt", en: "New point" })}</span>
                </Card>
            </div>

            {/* AI Assistant */}
            <PlotAIPanel bookId={bookId} onPlotPointCreated={onSave} />

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between sticky top-0 z-20 bg-background/95 backdrop-blur py-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                    {plotTypes.map((plotType) => {
                        const Icon = plotType.icon;
                        const isActive = activeFilter === plotType.value;
                        return (
                            <button
                                key={plotType.value}
                                onClick={() => setActiveFilter(plotType.value)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {plotType.label}
                            </button>
                        );
                    })}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t({ de: "Suche...", en: "Search..." })}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                    />
                </div>
            </div>

            {/* Grid */}
            <AnimatePresence mode="popLayout">
                {filteredPoints.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center justify-center py-16 text-center"
                    >
                        <div className="bg-secondary/50 p-6 rounded-full mb-4">
                            <Map className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-medium">{t({ de: "Keine Punkte gefunden", en: "No points found" })}</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mt-2 mb-6">
                            {t({
                                de: "Es gibt keine Handlungspunkte, die deiner Suche oder dem Filter entsprechen.",
                                en: "There are no plot points matching your search or filter.",
                            })}
                        </p>
                        {activeFilter !== "all" || searchQuery ? (
                            <Button variant="outline" onClick={() => { setActiveFilter("all"); setSearchQuery(""); }}>{t({ de: "Filter zurücksetzen", en: "Reset filters" })}</Button>
                        ) : (
                            <Button onClick={onCreate}>{t({ de: "Ersten Handlungspunkt erstellen", en: "Create the first plot point" })}</Button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {filteredPoints.map((point) => {
                            const TypeIcon = getTypeIcon(point.type);
                            return (
                                <motion.div
                                    key={point.id}
                                    layoutId={point.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group"
                                >
                                    <div
                                        onClick={() => onEdit(point)}
                                        className="relative h-full bg-card/40 hover:bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/50 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col"
                                    >
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="bg-secondary/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5 shadow-sm">
                                                    <TypeIcon className="h-3 w-3 text-primary" />
                                                    {getTypeLabel(point.type)}
                                                </div>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        render={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full hover:bg-background/80"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        }
                                                    >
                                                        <MoreVertical className="h-3.5 w-3.5" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(point); }}>
                                                            <Edit2 className="mr-2 h-4 w-4" /> {t({ de: "Bearbeiten", en: "Edit" })}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={(e) => { e.stopPropagation(); onDelete(point.id); }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> {t({ de: "Löschen", en: "Delete" })}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <h3 className="text-lg font-bold font-serif mb-2 group-hover:text-primary transition-colors">{point.title}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                                                {point.description || <span className="italic opacity-50">{t({ de: "Keine Beschreibung...", en: "No description..." })}</span>}
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
