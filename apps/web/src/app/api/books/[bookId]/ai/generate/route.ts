import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

interface AIContext {
    book: {
        title: string;
        genre: string | null;
        writingStyle: string | null;
        targetAudience: string | null;
        language: string;
    };
    characters: Array<{
        name: string;
        role: string;
        description: string | null;
        personality: string | null;
    }>;
    previousChapters: Array<{
        title: string;
        summary: string | null;
        orderIndex: number;
    }>;
    currentChapter: {
        title: string;
        content: string;
        summary: string | null;
        orderIndex: number;
    } | null;
    plotPoints: Array<{
        title: string;
        description: string | null;
        type: string;
    }>;
    worldElements: Array<{
        name: string;
        type: string;
        description: string | null;
    }>;
}

// Aggregate context for AI generation
async function aggregateContext(
    bookId: string,
    chapterId?: string,
    selectedCharacterIds?: string[],
    selectedPlotPointIds?: string[],
    selectedWorldElementIds?: string[]
): Promise<AIContext> {
    const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: {
            title: true,
            genre: true,
            writingStyle: true,
            targetAudience: true,
            language: true,
        },
    });

    if (!book) {
        throw new Error("Book not found");
    }

    // Get characters (all or selected)
    const characters = await prisma.character.findMany({
        where: {
            bookId,
            ...(selectedCharacterIds && selectedCharacterIds.length > 0 && {
                id: { in: selectedCharacterIds },
            }),
        },
        select: {
            name: true,
            role: true,
            description: true,
            personality: true,
        },
    });

    // Get previous chapters if current chapter is specified
    let previousChapters: AIContext["previousChapters"] = [];
    let currentChapter: AIContext["currentChapter"] = null;

    if (chapterId) {
        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            select: {
                title: true,
                content: true,
                summary: true,
                orderIndex: true,
            },
        });

        if (chapter) {
            currentChapter = chapter;
            previousChapters = await prisma.chapter.findMany({
                where: {
                    bookId,
                    orderIndex: { lt: chapter.orderIndex },
                },
                orderBy: { orderIndex: "asc" },
                select: {
                    title: true,
                    summary: true,
                    orderIndex: true,
                },
            });
        }
    }

    // Get plot points (all or selected)
    const plotPoints = await prisma.plotPoint.findMany({
        where: {
            bookId,
            ...(selectedPlotPointIds && selectedPlotPointIds.length > 0 && {
                id: { in: selectedPlotPointIds },
            }),
        },
        orderBy: { orderIndex: "asc" },
        select: {
            title: true,
            description: true,
            type: true,
        },
    });

    // Get world elements (all or selected)
    const worldElements = await prisma.worldElement.findMany({
        where: {
            bookId,
            ...(selectedWorldElementIds && selectedWorldElementIds.length > 0 && {
                id: { in: selectedWorldElementIds },
            }),
        },
        select: {
            name: true,
            type: true,
            description: true,
        },
    });

    return {
        book,
        characters,
        previousChapters,
        currentChapter,
        plotPoints,
        worldElements,
    };
}

// Build system prompt from context
function buildSystemPrompt(context: AIContext, customSystemPrompt?: string): string {
    let prompt = `Du bist ein kreativer Schriftsteller, der bei der Erstellung eines Buches hilft. 
Gib deine Antwort in sauberem HTML-Format zurück, das direkt in einen Rich-Text-Editor (TipTap) eingefügt werden kann. 
Verwende ausschließlich folgende Tags: <p>, <strong>, <em>, <h1>, <h2>, <h3>, <ul>, <ol>, <li>, <blockquote>. 
Jeder Absatz MUSS in ein <p>-Tag eingeschlossen sein. Verwende KEINE Markdown-Syntax wie ** oder #.`;

    if (customSystemPrompt) {
        prompt += `\n\nZusätzliche Anweisungen:\n${customSystemPrompt}`;
    }

    prompt += `\n\n## Buchinformationen
Titel: ${context.book.title}`;

    if (context.book.genre) prompt += `\nGenre: ${context.book.genre}`;
    if (context.book.writingStyle) prompt += `\nSchreibstil: ${context.book.writingStyle}`;
    if (context.book.targetAudience) prompt += `\nZielgruppe: ${context.book.targetAudience}`;
    prompt += `\nSprache: ${context.book.language === "de" ? "Deutsch" : context.book.language}`;

    if (context.characters.length > 0) {
        prompt += `\n\n## Charaktere`;
        for (const char of context.characters) {
            prompt += `\n### ${char.name} (${char.role})`;
            if (char.description) prompt += `\nBeschreibung: ${char.description}`;
            if (char.personality) prompt += `\nPersönlichkeit: ${char.personality}`;
        }
    }

    if (context.plotPoints.length > 0) {
        prompt += `\n\n## Handlungspunkte`;
        for (const pp of context.plotPoints) {
            prompt += `\n- ${pp.title} (${pp.type})`;
            if (pp.description) prompt += `: ${pp.description}`;
        }
    }

    if (context.worldElements.length > 0) {
        prompt += `\n\n## Weltelemente`;
        for (const we of context.worldElements) {
            prompt += `\n- ${we.name} (${we.type})`;
            if (we.description) prompt += `: ${we.description}`;
        }
    }

    if (context.previousChapters.length > 0) {
        prompt += `\n\n## Vorherige Kapitel`;
        for (const ch of context.previousChapters) {
            prompt += `\n### Kapitel ${ch.orderIndex + 1}: ${ch.title}`;
            if (ch.summary) prompt += `\nZusammenfassung: ${ch.summary}`;
        }
    }

    return prompt;
}

// POST generate text with AI
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const {
            prompt,
            chapterId,
            characterIds,
            plotPointIds,
            worldElementIds,
            useSummaryAsPrompt,
            targetLength = "medium", // default
            maxTokens,
            temperature,
        } = body;

        // Get AI settings
        const aiSettings = await prisma.aISettings.findUnique({
            where: { bookId },
        });

        if (!aiSettings?.apiKey) {
            return NextResponse.json(
                { error: "AI API key not configured. Please set up AI settings first." },
                { status: 400 }
            );
        }

        // Aggregate context
        const context = await aggregateContext(
            bookId,
            chapterId,
            characterIds,
            plotPointIds,
            worldElementIds
        );

        // Determine length instruction and max tokens
        let lengthInstruction = "";

        // Reasoning models need significantly more tokens (often 2x-3x the content length)
        // We set high limits to ensure the model can finish its thought process and content.
        let calculatedMaxTokens = maxTokens ?? aiSettings.maxTokens;

        switch (targetLength) {
            case "short":
                lengthInstruction = "Fasse dich kurz und prägnant (ca. 400-600 Wörter).";
                if (calculatedMaxTokens < 4000) calculatedMaxTokens = 4000;
                break;
            case "medium":
                lengthInstruction = "Schreibe in angemessener Länge und Ausführlichkeit (ca. 800-1200 Wörter).";
                if (calculatedMaxTokens < 8000) calculatedMaxTokens = 8000;
                break;
            case "long":
                lengthInstruction = "Schreibe sehr detailliert, atmosphärisch und umfangreich (ca. 1500+ Wörter). Nutze Dialoge und innere Monologe ausführlich.";
                if (calculatedMaxTokens < 12000) calculatedMaxTokens = 12000;
                break;
        }

        // Build effective prompt - use chapter summary if requested and no prompt given
        let effectivePrompt = prompt;
        if (useSummaryAsPrompt && context.currentChapter?.summary) {
            const prefix = prompt?.trim() ? `${prompt}\n\nMiteinbezogene Zusammenfassung: ` : "Schreibe basierend auf dieser Zusammenfassung: ";
            effectivePrompt = `${prefix}${context.currentChapter.summary}`;
        } else if (!prompt?.trim()) {
            return NextResponse.json(
                { error: "Bitte gib einen Prompt ein oder füge eine Kapitelzusammenfassung hinzu." },
                { status: 400 }
            );
        }

        // Add length instruction to user prompt (it's often more effective in user prompt than system prompt for length)
        effectivePrompt += `\n\nLängen-Vorgabe: ${lengthInstruction}`;

        // Build system prompt
        const systemPrompt = buildSystemPrompt(context, aiSettings.systemPrompt || undefined);

        // Call OpenAI-compatible API
        const response = await fetch(`${aiSettings.apiEndpoint}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${aiSettings.apiKey}`,
            },
            body: JSON.stringify({
                model: aiSettings.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: effectivePrompt },
                ],
                temperature: temperature ?? aiSettings.temperature,
                max_tokens: calculatedMaxTokens,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("AI API error:", errorData);
            return NextResponse.json(
                { error: "AI generation failed", details: errorData },
                { status: response.status }
            );
        }

        const data = await response.json().catch(() => ({ error: "Invalid JSON response from AI API" }));

        if (process.env.NODE_ENV === "development") {
            console.log("AI API Full Response:", JSON.stringify(data, null, 2));
        }

        // Robust text extraction
        const choice = data.choices?.[0];
        let generatedText = "";

        // Check standard fields and provider-specific fields (like 'reasoning_content' from some local models)
        if (typeof choice?.message?.content === "string" && choice.message.content.length > 0) {
            generatedText = choice.message.content;

            // Sometimes local models leak reasoning in <thinking> tags within the content
            generatedText = generatedText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
        } else if (typeof choice?.message?.reasoning_content === "string") {
            // Only fallback to reasoning if regular content is missing and we have no other choice
            // But prefer not to use it if the user wants "final text only"
            // However, better some text than error. We'll try to use it if we hit a length limit.
            if (!generatedText) {
                generatedText = choice.message.reasoning_content;
            }
        } else if (typeof choice?.text === "string") {
            generatedText = choice.text;
        } else if (typeof choice?.message === "string") {
            generatedText = choice.message;
        }

        if (!generatedText || generatedText.trim().length === 0) {
            console.error("No usable text found in AI response. Data:", JSON.stringify(data, null, 2));

            // Check for specific error reasons in the response
            const finishReason = choice?.finish_reason;
            let errorMsg = data.error?.message || data.error || (finishReason ? `AI stopped without content: ${finishReason}` : "No text generated by AI model");

            if (data.choices && data.choices.length === 0) {
                errorMsg = "AI provider returned 0 choices. This might be due to content filtering.";
            }

            return NextResponse.json(
                { error: errorMsg, details: data },
                { status: 500 }
            );
        }

        // Clean up markdown code blocks if the AI included them despite instructions
        generatedText = generatedText.replace(/^```html\s*/i, "").replace(/```\s*$/, "").trim();

        // Fallback: If no HTML tags are found, convert plain text newlines to HTML
        if (!/<\/?[a-z][\s\S]*>/i.test(generatedText)) {
            generatedText = generatedText
                .split(/\n\n+/)
                .map((para: string) => `<p>${para.trim().replace(/\n/g, "<br>")}</p>`)
                .join("");
        }

        return NextResponse.json({
            text: generatedText,
            usage: data.usage,
        });
    } catch (error) {
        console.error("Failed to generate text:", error);
        return NextResponse.json(
            { error: "Failed to generate text" },
            { status: 500 }
        );
    }
}

// GET context preview (for debugging/displaying)
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const { searchParams } = new URL(request.url);
        const chapterId = searchParams.get("chapterId") || undefined;

        const context = await aggregateContext(bookId, chapterId);
        const aiSettings = await prisma.aISettings.findUnique({
            where: { bookId },
        });

        const systemPrompt = buildSystemPrompt(context, aiSettings?.systemPrompt || undefined);

        return NextResponse.json({
            context,
            systemPrompt,
        });
    } catch (error) {
        console.error("Failed to get context:", error);
        return NextResponse.json(
            { error: "Failed to get context" },
            { status: 500 }
        );
    }
}
