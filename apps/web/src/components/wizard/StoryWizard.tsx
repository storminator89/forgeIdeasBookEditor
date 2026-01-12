"use client";

import { useState } from "react";
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function StoryWizard({
    apiEndpoint,
    apiKey,
    model,
    onCancel,
}: StoryWizardProps) {
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

            // Navigate to the new book
            router.push(`/books/${book.id}` as Route);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Fehler beim Erstellen");
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2">
                {["idea", "questions", "generating", "review"].map((s, i) => (
                    <div key={s} className="flex items-center">
                        <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${step === s
                                ? "bg-primary text-primary-foreground"
                                : ["idea", "questions", "generating", "review"].indexOf(step) > i
                                    ? "bg-green-500 text-white"
                                    : "bg-muted text-muted-foreground"
                                }`}
                        >
                            {["idea", "questions", "generating", "review"].indexOf(step) > i ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                i + 1
                            )}
                        </div>
                        {i < 3 && <div className="w-8 h-0.5 bg-muted" />}
                    </div>
                ))}
            </div>

            {/* Step 1: Story Idea */}
            {step === "idea" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            Deine Geschichtsidee
                        </CardTitle>
                        <CardDescription>
                            Beschreibe deine Buchidee in ein paar Sätzen. Die KI wird dir
                            helfen, sie zu entwickeln.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Geschichtsidee *</label>
                            <textarea
                                value={storyIdea}
                                onChange={(e) => setStoryIdea(e.target.value)}
                                placeholder="z.B. Eine junge Magierin entdeckt, dass sie die letzte Hüterin eines uralten Geheimnisses ist, das die Welt vor dem Untergang bewahren kann..."
                                className="w-full min-h-[150px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Genre</label>
                            <select
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            >
                                {GENRES.map((g) => (
                                    <option key={g} value={g}>
                                        {g}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={onCancel}>
                                Abbrechen
                            </Button>
                            <Button onClick={handleSubmitIdea} disabled={isLoading}>
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <ChevronRight className="mr-2 h-4 w-4" />
                                )}
                                Weiter
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Follow-up Questions */}
            {step === "questions" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Noch ein paar Fragen...</CardTitle>
                        <CardDescription>
                            Beantworte diese Fragen, damit die KI deine Geschichte besser
                            verstehen kann.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {questions.map((q) => (
                            <div key={q.id} className="space-y-2">
                                <label className="text-sm font-medium">{q.question}</label>
                                {q.type === "select" && q.options ? (
                                    <select
                                        value={answers[q.id] || q.options[0]}
                                        onChange={(e) =>
                                            setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                                        }
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
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
                                        placeholder="Deine Antwort..."
                                    />
                                )}
                            </div>
                        ))}

                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep("idea")}>
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Zurück
                            </Button>
                            <Button onClick={handleSubmitAnswers}>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Geschichte generieren
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Generating */}
            {step === "generating" && (
                <Card>
                    <CardContent className="flex flex-col items-center py-16">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <h3 className="text-xl font-semibold mb-2">KI arbeitet...</h3>
                        <p className="text-muted-foreground text-center max-w-md">
                            Die KI entwickelt gerade Charaktere, Handlungspunkte und
                            Weltelemente für deine Geschichte. Das kann einen Moment dauern.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Review */}
            {step === "review" && result && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                {result.book.title}
                            </CardTitle>
                            <CardDescription>{result.book.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-4 text-sm">
                            <span className="px-2 py-1 bg-secondary rounded">
                                {result.book.genre}
                            </span>
                            {result.book.targetAudience && (
                                <span className="px-2 py-1 bg-secondary rounded">
                                    {result.book.targetAudience}
                                </span>
                            )}
                        </CardContent>
                    </Card>

                    {/* Characters */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="h-5 w-5" />
                                Charaktere ({result.characters.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {result.characters.map((char, i) => (
                                <div key={i} className="p-3 border rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold">{char.name}</span>
                                        <span className="text-xs px-2 py-0.5 bg-primary/10 rounded capitalize">
                                            {char.role}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {char.description}
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Plot Points */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Map className="h-5 w-5" />
                                Handlung ({result.plotPoints.length} Punkte)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {result.plotPoints.map((point, i) => (
                                <div key={i} className="flex items-start gap-3 p-2">
                                    <div className="h-6 w-6 rounded-full bg-chart-3/20 flex items-center justify-center text-xs font-bold text-chart-3">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{point.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {point.description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* World Elements */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Globe className="h-5 w-5" />
                                Weltelemente ({result.worldElements.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            {result.worldElements.map((elem, i) => (
                                <div key={i} className="p-2 border rounded">
                                    <span className="font-medium text-sm">{elem.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                        ({elem.type})
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Chapters */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Edit3 className="h-5 w-5" />
                                Kapitelübersicht ({result.chapterOutline.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {result.chapterOutline.map((ch, i) => (
                                <div key={i} className="flex items-start gap-3 p-2">
                                    <div className="text-sm font-medium text-muted-foreground w-6">
                                        {i + 1}.
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{ch.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {ch.summary}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {error && (
                        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep("questions")}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Zurück bearbeiten
                        </Button>
                        <Button onClick={handleCreateBook} disabled={isCreating}>
                            {isCreating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="mr-2 h-4 w-4" />
                            )}
                            Buch erstellen
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
