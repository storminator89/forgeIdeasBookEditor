"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
    Loader2,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    Check,
    BookOpen,
    Users,
    Map,
    Globe,
    Edit3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

type WizardQuestion = {
    id: string;
    question: string;
    type: "text" | "select";
    options?: string[];
};

type GeneratedCharacter = {
    name: string;
    role: string;
    description: string;
    personality: string;
    motivation: string;
    backstory: string;
};

type GeneratedPlotPoint = {
    title: string;
    type: string;
    description: string;
    orderIndex: number;
};

type GeneratedWorldElement = {
    name: string;
    type: string;
    description: string;
};

type WizardResult = {
    book: {
        title: string;
        description: string;
        genre: string;
        targetAudience: string;
        writingStyle: string;
    };
    characters: GeneratedCharacter[];
    plotPoints: GeneratedPlotPoint[];
    worldElements: GeneratedWorldElement[];
    chapterOutline: Array<{
        title: string;
        summary: string;
    }>;
};

interface StoryWizardProps {
    apiEndpoint: string;
    apiKey: string;
    model: string;
    onCancel: () => void;
}

const GENRES = [
    "Fantasy",
    "Science-Fiction",
    "Thriller",
    "Krimi",
    "Romanze",
    "Horror",
    "Drama",
    "Abenteuer",
    "Historisch",
    "Mystery",
];

type WizardStep = "idea" | "questions" | "generating" | "review";

// Atmospheric loader phrases
const LOADING_PHRASES = [
    "Spinning core plot threads...",
    "Sculpting character personas and motivations...",
    "Forging world geography and ancient lore...",
    "Ink flowing onto drafting sheets...",
    "Binding chapters and outlining acts...",
    "Weaving character relationship webs..."
];

export default function StoryWizard({
    apiEndpoint,
    apiKey,
    model,
    onCancel,
}: StoryWizardProps) {
    const { t } = useI18n();
    const router = useRouter();
    const [step, setStep] = useState<WizardStep>("idea");
    const [storyIdea, setStoryIdea] = useState("");
    const [genre, setGenre] = useState("Fantasy");
    const [questions, setQuestions] = useState<WizardQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [result, setResult] = useState<WizardResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Rotating loading message index
    const [phraseIndex, setPhraseIndex] = useState(0);

    useEffect(() => {
        if (step !== "generating") return;
        const interval = setInterval(() => {
            setPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
        }, 3200);
        return () => clearInterval(interval);
    }, [step]);

    // Step 1: Submit story idea and get questions
    const handleSubmitIdea = async () => {
        if (!storyIdea.trim()) {
            setError("Bitte gib deine Geschichtsidee ein");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/ai/story-wizard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "questions",
                    storyIdea,
                    genre,
                    apiEndpoint,
                    apiKey,
                    model,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Fehler bei der Anfrage");
            }

            const data = await response.json();
            setQuestions(data.questions);
            // Initialize answers
            const initialAnswers: Record<string, string> = {};
            data.questions.forEach((q: WizardQuestion) => {
                initialAnswers[q.id] = q.options ? q.options[0] : "";
            });
            setAnswers(initialAnswers);
            setStep("questions");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unbekannter Fehler");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Submit answers and generate book structure
    const handleSubmitAnswers = async () => {
        setStep("generating");
        setError(null);

        try {
            const response = await fetch("/api/ai/story-wizard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "generate",
                    storyIdea,
                    genre,
                    answers,
                    apiEndpoint,
                    apiKey,
                    model,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Fehler bei der Generierung");
            }

            const data = await response.json();
            setResult(data);
            setStep("review");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unbekannter Fehler");
            setStep("questions");
        }
    };

    // Step 4: Create the book with all generated content
    const handleCreateBook = async () => {
        if (!result) return;

        setIsCreating(true);
        setError(null);

        try {
            // 1. Create the book
            const bookResponse = await fetch("/api/books", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: result.book.title,
                    description: result.book.description,
                    genre: result.book.genre,
                    targetAudience: result.book.targetAudience,
                    writingStyle: result.book.writingStyle,
                    language: "de",
                }),
            });

            if (!bookResponse.ok) {
                throw new Error("Fehler beim Erstellen des Buchs");
            }

            const book = await bookResponse.json();

            // 2. Create characters
            for (const character of result.characters) {
                await fetch(`/api/books/${book.id}/characters`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: character.name,
                        role: character.role,
                        description: character.description,
                        personality: character.personality,
                        motivation: character.motivation,
                        backstory: character.backstory,
                    }),
                });
            }

            // 3. Create plot points
            for (const plotPoint of result.plotPoints) {
                await fetch(`/api/books/${book.id}/plot`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: plotPoint.title,
                        type: plotPoint.type,
                        description: plotPoint.description,
                        orderIndex: plotPoint.orderIndex,
                    }),
                });
            }

            // 4. Create world elements
            for (const worldElement of result.worldElements) {
                await fetch(`/api/books/${book.id}/world`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: worldElement.name,
                        type: worldElement.type,
                        description: worldElement.description,
                    }),
                });
            }

            // 5. Create chapters
            for (let i = 0; i < result.chapterOutline.length; i++) {
                const chapter = result.chapterOutline[i];
                await fetch(`/api/books/${book.id}/chapters`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: chapter.title,
                        summary: chapter.summary,
                        orderIndex: i,
                    }),
                });
            }

            // 6. Copy AI settings to the new book
            await fetch(`/api/books/${book.id}/ai-settings`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apiEndpoint,
                    apiKey,
                    model,
                }),
            });

            router.push(`/books/${book.id}` as Route);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Fehler beim Erstellen");
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-10 max-w-4xl mx-auto py-4">
            
            {/* Step Indicators - Glowing wax seals */}
            <div className="flex items-center justify-center gap-2 select-none">
                {["idea", "questions", "generating", "review"].map((s, i) => {
                    const isCurrent = step === s;
                    const stepsArr = ["idea", "questions", "generating", "review"];
                    const isCompleted = stepsArr.indexOf(step) > i;

                    return (
                        <div key={s} className="flex items-center">
                            <div className="relative">
                                <motion.div
                                    animate={{ scale: isCurrent ? 1.1 : 1 }}
                                    className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold font-serif relative z-10 border transition-all duration-300 ${
                                        isCurrent
                                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                            : isCompleted
                                                ? "bg-accent text-foreground border-primary/30"
                                                : "bg-secondary text-muted-foreground border-border/60"
                                    }`}
                                >
                                    {isCompleted ? (
                                        <Check className="h-4.5 w-4.5 stroke-[3px]" />
                                    ) : (
                                        i + 1
                                    )}
                                </motion.div>
                                {isCurrent && (
                                    <div className="absolute inset-0 bg-primary/25 rounded-full blur-md animate-pulse z-0 pointer-events-none" />
                                )}
                            </div>
                            {i < 3 && (
                                <div className={`w-10 sm:w-16 h-0.5 transition-colors duration-500 ${
                                    stepsArr.indexOf(step) > i ? "bg-primary/50" : "bg-border/60"
                                }`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Slider Switcher */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                >
                    {/* Step 1: Story Idea */}
                    {step === "idea" && (
                        <Card className="paper-texture border border-border/40 shadow-xl overflow-hidden rounded-2xl">
                            <CardHeader className="pb-4 pt-8 px-8 border-b border-border/20">
                                <CardTitle className="flex items-center gap-3 font-serif font-black text-2xl text-foreground">
                                    <Sparkles className="h-6 w-6 text-chart-1 animate-pulse" />
                                    {t({ de: "Deine Geschichtsidee", en: "Your story idea" })}
                                </CardTitle>
                                <CardDescription className="font-serif text-muted-foreground text-sm leading-relaxed mt-1">
                                    {t({
                                        de: "Beschreibe dein Buchprojekt in wenigen Sätzen. Die KI wird daraus ein komplettes Universum strukturieren.",
                                        en: "Describe your book project in a few sentences. The AI will weave a complete universe from it.",
                                    })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 p-8">
                                <div className="space-y-2.5">
                                    <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                                        {t({ de: "Geschichtsidee *", en: "Story Idea *" })}
                                    </label>
                                    <textarea
                                        value={storyIdea}
                                        onChange={(e) => setStoryIdea(e.target.value)}
                                        placeholder={t({
                                            de: "z.B. Eine junge Magierin entdeckt, dass sie die letzte Hüterin eines uralten Geheimnisses ist, das die Welt vor dem Untergang bewahren kann...",
                                            en: "e.g. A young mage discovers she is the last keeper of an ancient secret that can save the world from ruin...",
                                        })}
                                        className="w-full min-h-[160px] px-4 py-3 rounded-xl border border-border/40 bg-background/50 text-sm font-serif leading-relaxed resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all shadow-inner"
                                    />
                                </div>

                                <div className="space-y-2.5">
                                    <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Genre</label>
                                    <select
                                        value={genre}
                                        onChange={(e) => setGenre(e.target.value)}
                                        className="w-full h-11.5 px-4 rounded-xl border border-border/40 bg-background/50 font-serif text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all shadow-inner"
                                    >
                                        {GENRES.map((g) => (
                                            <option key={g} value={g}>
                                                {g}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-3.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <div className="flex justify-between pt-4 border-t border-border/20">
                                    <Button variant="outline" onClick={onCancel} className="rounded-xl px-5 border-border/50 hover:bg-secondary/40">
                                        {t({ de: "Abbrechen", en: "Cancel" })}
                                    </Button>
                                    <Button onClick={handleSubmitIdea} disabled={isLoading} className="rounded-xl px-6 bg-primary text-primary-foreground font-semibold">
                                        {isLoading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <ChevronRight className="mr-2 h-4.5 w-4.5" />
                                        )}
                                        {t({ de: "Weiter", en: "Next" })}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 2: Follow-up Questions */}
                    {step === "questions" && (
                        <Card className="paper-texture border border-border/40 shadow-xl rounded-2xl">
                            <CardHeader className="pb-4 pt-8 px-8 border-b border-border/20">
                                <CardTitle className="font-serif font-black text-2xl text-foreground">
                                    {t({ de: "Noch ein paar Details...", en: "A few details..." })}
                                </CardTitle>
                                <CardDescription className="font-serif text-muted-foreground text-sm">
                                    {t({
                                        de: "Beantworte diese Fragen, damit die KI das Fundament optimal entwerfen kann.",
                                        en: "Answer these questions so the AI can shape the foundations perfectly.",
                                    })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 p-8">
                                {questions.map((q) => (
                                    <div key={q.id} className="space-y-2.5">
                                        <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">{q.question}</label>
                                        {q.type === "select" && q.options ? (
                                            <select
                                                value={answers[q.id] || q.options[0]}
                                                onChange={(e) =>
                                                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                                                }
                                                className="w-full h-11.5 px-4 rounded-xl border border-border/40 bg-background/50 font-serif text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all shadow-inner"
                                            >
                                                {q.options.map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <Input
                                                value={answers[q.id] || ""}
                                                onChange={(e) =>
                                                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                                                }
                                                placeholder={t({ de: "Deine Antwort...", en: "Your answer..." })}
                                                className="h-11.5 px-4 rounded-xl border-border/40 bg-background/50 font-serif text-sm focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/50 shadow-inner"
                                            />
                                        )}
                                    </div>
                                ))}

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-3.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <div className="flex justify-between pt-4 border-t border-border/20">
                                    <Button variant="outline" onClick={() => setStep("idea")} className="rounded-xl px-5 border-border/50 hover:bg-secondary/40">
                                        <ChevronLeft className="mr-2 h-4.5 w-4.5" />
                                        {t({ de: "Zurück", en: "Back" })}
                                    </Button>
                                    <Button onClick={handleSubmitAnswers} className="rounded-xl px-6 bg-primary text-primary-foreground font-semibold">
                                        <Sparkles className="mr-2 h-4 w-4 text-chart-1 animate-pulse" />
                                        {t({ de: "Universum erschaffen", en: "Create Universe" })}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 3: Generating - Cinematic typewriter typing effect */}
                    {step === "generating" && (
                        <Card className="paper-texture border border-border/40 shadow-xl rounded-2xl">
                            <CardContent className="flex flex-col items-center justify-center py-20 px-8 text-center relative overflow-hidden">
                                <div className="ambient-glow-amber -top-20 -left-20 opacity-15" />
                                
                                {/* Pulsing wax seal loading ring */}
                                <div className="relative mb-8">
                                    <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                                    </div>
                                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-lg pointer-events-none" />
                                </div>

                                <h3 className="text-2xl font-serif font-black mb-3 text-foreground tracking-tight">
                                    {t({ de: "Das Schreibzimmer wird vorbereitet...", en: "Preparing the study..." })}
                                </h3>
                                
                                {/* Typing rotating phrase snippet (WOW effect) */}
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={phraseIndex}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 0.75, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.6 }}
                                        className="text-muted-foreground font-serif text-sm max-w-sm italic min-h-[2.5em] leading-relaxed"
                                    >
                                        {LOADING_PHRASES[phraseIndex]}
                                    </motion.p>
                                </AnimatePresence>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 4: Review Dossiers */}
                    {step === "review" && result && (
                        <div className="space-y-8 pb-10">
                            {/* Summary Core book details */}
                            <Card className="paper-texture border border-border/40 shadow-lg rounded-2xl relative overflow-hidden">
                                <div className="book-binding-line" />
                                <CardHeader className="pb-4 pt-8 px-8 pl-12 border-b border-border/20">
                                    <div className="flex items-center gap-3.5 mb-2.5">
                                        <span className="px-3 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase bg-primary/5 border border-primary/10 text-primary">
                                            {result.book.genre}
                                        </span>
                                        {result.book.targetAudience && (
                                            <span className="px-3 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase bg-secondary border border-border/40 text-muted-foreground">
                                                {result.book.targetAudience}
                                            </span>
                                        )}
                                    </div>
                                    <CardTitle className="font-serif font-black text-3xl leading-tight text-foreground">
                                        {result.book.title}
                                    </CardTitle>
                                    <CardDescription className="font-serif text-muted-foreground text-sm mt-1">
                                        {result.book.description}
                                    </CardDescription>
                                </CardHeader>
                            </Card>

                            {/* Dossier Tabs: Grid representation */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Characters Dossier */}
                                <Card className="glass-card border-border/40 shadow-md rounded-2xl flex flex-col justify-between overflow-hidden">
                                    <CardHeader className="pb-4 border-b border-border/20 bg-secondary/15 flex flex-row items-center gap-2.5">
                                        <Users className="h-5 w-5 text-primary" />
                                        <CardTitle className="font-serif font-bold text-lg text-foreground m-0">
                                            {t({ de: "Charaktere", en: "Characters" })} ({result.characters.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-3.5 max-h-[360px] overflow-y-auto">
                                        {result.characters.map((char, i) => (
                                            <div key={i} className="p-3.5 bg-background/55 border border-border/30 rounded-xl hover:border-primary/15 transition-all duration-300">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="font-bold text-sm text-foreground">{char.name}</span>
                                                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-primary/5 text-primary uppercase tracking-wider">
                                                        {char.role}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-serif text-muted-foreground leading-relaxed">
                                                    {char.description}
                                                </p>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Plot Dossier */}
                                <Card className="glass-card border-border/40 shadow-md rounded-2xl flex flex-col justify-between overflow-hidden">
                                    <CardHeader className="pb-4 border-b border-border/20 bg-secondary/15 flex flex-row items-center gap-2.5">
                                        <Map className="h-5 w-5 text-primary" />
                                        <CardTitle className="font-serif font-bold text-lg text-foreground m-0">
                                            {t({ de: "Handlung", en: "Plot Points" })} ({result.plotPoints.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-3 max-h-[360px] overflow-y-auto">
                                        {result.plotPoints.map((point, i) => (
                                            <div key={i} className="flex items-start gap-3.5 p-2 bg-background/35 rounded-xl border border-transparent hover:border-border/30 hover:bg-background/55 transition-all">
                                                <div className="h-6 w-6 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-foreground mb-0.5">{point.title}</div>
                                                    <div className="text-xs font-serif text-muted-foreground leading-relaxed">
                                                        {point.description}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* World Element Dossier */}
                                <Card className="glass-card border-border/40 shadow-md rounded-2xl flex flex-col justify-between overflow-hidden">
                                    <CardHeader className="pb-4 border-b border-border/20 bg-secondary/15 flex flex-row items-center gap-2.5">
                                        <Globe className="h-5 w-5 text-primary" />
                                        <CardTitle className="font-serif font-bold text-lg text-foreground m-0">
                                            {t({ de: "Welt", en: "World Elements" })} ({result.worldElements.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-3.5 max-h-[360px] overflow-y-auto">
                                        {result.worldElements.map((elem, i) => (
                                            <div key={i} className="p-3 bg-background/55 border border-border/30 rounded-xl flex items-center justify-between hover:border-primary/15 transition-all duration-300">
                                                <span className="font-bold text-sm text-foreground">{elem.name}</span>
                                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                    ({elem.type})
                                                </span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Chapter Outline Dossier */}
                                <Card className="glass-card border-border/40 shadow-md rounded-2xl flex flex-col justify-between overflow-hidden">
                                    <CardHeader className="pb-4 border-b border-border/20 bg-secondary/15 flex flex-row items-center gap-2.5">
                                        <Edit3 className="h-5 w-5 text-primary" />
                                        <CardTitle className="font-serif font-bold text-lg text-foreground m-0">
                                            {t({ de: "Kapitelübersicht", en: "Chapter Outline" })} ({result.chapterOutline.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-3 max-h-[360px] overflow-y-auto">
                                        {result.chapterOutline.map((ch, i) => (
                                            <div key={i} className="flex items-start gap-3 p-2 bg-background/35 rounded-xl border border-transparent hover:border-border/30 hover:bg-background/55 transition-all">
                                                <div className="text-sm font-black text-muted-foreground/70 w-5.5 mt-0.5 font-mono">
                                                    {String(i + 1).padStart(2, "0")}.
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-foreground mb-0.5">{ch.title}</div>
                                                    <div className="text-xs font-serif text-muted-foreground leading-relaxed">
                                                        {ch.summary}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-3.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {/* Buttons */}
                            <div className="flex justify-between pt-4 border-t border-border/20">
                                <Button variant="outline" onClick={() => setStep("questions")} className="rounded-xl px-5 border-border/50 hover:bg-secondary/40">
                                    <ChevronLeft className="mr-2 h-4.5 w-4.5" />
                                    {t({ de: "Zurück bearbeiten", en: "Back to Edit" })}
                                </Button>
                                <Button onClick={handleCreateBook} disabled={isCreating} className="rounded-xl px-6 bg-primary text-primary-foreground font-semibold">
                                    {isCreating ? (
                                        <Loader2 className="mr-2 h-4.5 w-4.5 animate-spin" />
                                    ) : (
                                        <Check className="mr-2 h-4.5 w-4.5 stroke-[3px]" />
                                    )}
                                    {t({ de: "Buch erstellen", en: "Create Book" })}
                                </Button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
