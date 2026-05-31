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
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5">
                <Card className="md:col-span-3 relative overflow-hidden bg-card/60 dark:bg-card/35 backdrop-blur-md border border-border/40 shadow-md paper-texture">
                    {/* Candlelight pulsing ambience */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-tr from-primary/10 via-transparent to-primary/5" />
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/35 via-primary/80 to-primary/35 rounded-l-full" />
                    
                    <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-xl font-serif font-black text-foreground">{t({ de: "Handlungsübersicht", en: "Plot overview" })}</CardTitle>
                        <CardDescription className="text-xs font-serif text-muted-foreground">{t({ de: "Strukturiere deine Geschichte und verwalte wichtige Wendepunkte.", en: "Structure your story and manage key turning points." })}</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-0">
                        <div className="flex flex-wrap gap-3 mt-2">
                            <div className="flex items-center gap-2 text-xs font-serif text-muted-foreground bg-background/55 backdrop-blur px-3.5 py-1.5 rounded-full border border-border/40 shadow-sm">
                                <Star className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                <span className="font-sans font-black text-foreground">{plotPoints.filter(p => p.type === "climax").length}</span> {t({ de: "Höhepunkte", en: "Climaxes" })}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-serif text-muted-foreground bg-background/55 backdrop-blur px-3.5 py-1.5 rounded-full border border-border/40 shadow-sm">
                                <GitBranch className="h-3.5 w-3.5 text-primary" />
                                <span className="font-sans font-black text-foreground">{plotPoints.filter(p => p.type === "subplot").length}</span> {t({ de: "Nebenplots", en: "Subplots" })}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-serif text-muted-foreground bg-background/55 backdrop-blur px-3.5 py-1.5 rounded-full border border-border/40 shadow-sm">
                                <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="font-sans font-black text-foreground">{plotPoints.length}</span> {t({ de: "Ereignisse", en: "Events" })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col justify-center items-center p-6 border-dashed border-2 border-border/40 hover:border-primary/50 transition-all duration-300 cursor-pointer bg-card/25 hover:bg-card/45 rounded-xl group relative overflow-hidden shadow-sm hover:shadow-md" onClick={onCreate}>
                    <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-serif font-black text-xs uppercase tracking-wider text-foreground">{t({ de: "Neuer Punkt", en: "New point" })}</span>
                </Card>
            </div>

            {/* AI Assistant */}
            <PlotAIPanel bookId={bookId} onPlotPointCreated={onSave} />

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between sticky top-0 z-20 bg-background/95 backdrop-blur py-2.5">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                    {plotTypes.map((plotType) => {
                        const Icon = plotType.icon;
                        const isActive = activeFilter === plotType.value;
                        return (
                            <button
                                key={plotType.value}
                                onClick={() => setActiveFilter(plotType.value)}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-serif font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "bg-secondary/65 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/20"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {plotType.label}
                            </button>
                        );
                    })}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder={t({ de: "Suche...", en: "Search..." })}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9.5 bg-secondary/35 border-border/40 focus:border-primary/50 focus:bg-background/90 rounded-xl text-xs font-serif shadow-inner"
                    />
                </div>
            </div>

            {/* Grid */}
            <AnimatePresence mode="popLayout">
                {filteredPoints.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center justify-center py-16 text-center"
                    >
                        <div className="bg-secondary/50 p-6 rounded-full border border-border/30 mb-4 shadow-inner">
                            <Map className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-base font-serif font-black text-foreground">{t({ de: "Keine Punkte gefunden", en: "No points found" })}</h3>
                        <p className="text-muted-foreground text-xs font-serif italic max-w-xs mt-2 mb-6 leading-relaxed">
                            {t({
                                de: "Es gibt keine Handlungspunkte, die deiner Suche oder dem Filter entsprechen.",
                                en: "There are no plot points matching your search or filter.",
                            })}
                        </p>
                        {activeFilter !== "all" || searchQuery ? (
                            <Button variant="outline" className="rounded-xl h-10 text-xs font-serif uppercase tracking-wider border-border/50" onClick={() => { setActiveFilter("all"); setSearchQuery(""); }}>{t({ de: "Filter zurücksetzen", en: "Reset filters" })}</Button>
                        ) : (
                            <Button className="rounded-xl h-10 text-xs font-serif uppercase tracking-wider bg-primary" onClick={onCreate}>{t({ de: "Ersten Handlungspunkt erstellen", en: "Create the first plot point" })}</Button>
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
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group"
                                >
                                    <div
                                        onClick={() => onEdit(point)}
                                        className="relative h-full bg-card/45 hover:bg-card/85 backdrop-blur-md border border-border/40 hover:border-primary/50 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col group paper-texture"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-primary/50 transition-colors duration-300" />
                                        <div className="p-5 flex-1 flex flex-col pl-6">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="bg-secondary/75 border border-border/30 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-serif font-black uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 shadow-inner">
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
                                                    <DropdownMenuContent align="end" className="rounded-xl border border-border/40 shadow-xl">
                                                        <DropdownMenuItem className="text-xs font-serif" onClick={(e) => { e.stopPropagation(); onEdit(point); }}>
                                                            <Edit2 className="mr-2 h-3.5 w-3.5 text-primary" /> {t({ de: "Bearbeiten", en: "Edit" })}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-xs font-serif text-destructive focus:text-destructive"
                                                            onClick={(e) => { e.stopPropagation(); onDelete(point.id); }}
                                                        >
                                                            <Trash2 className="mr-2 h-3.5 w-3.5" /> {t({ de: "Löschen", en: "Delete" })}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <h3 className="text-base font-bold font-serif mb-2 text-foreground group-hover:text-primary transition-colors">{point.title}</h3>
                                            <p className="text-xs font-serif text-muted-foreground line-clamp-4 leading-relaxed italic">
                                                {point.description || <span className="opacity-40">{t({ de: "Keine Beschreibung...", en: "No description..." })}</span>}
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
