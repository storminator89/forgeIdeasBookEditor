import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";
import { buildGenreInstructions } from "@/lib/ai/genre-prompts";
import { decryptIfNeeded } from "@/lib/crypto";
import { fetchBookContext, formatContextForPrompt } from "@/lib/ai/fetch-book-context";
import { extractAIContent, extractJSON } from "@/lib/ai/extract-content";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { chapterId, scenario, explorationDepth = "medium" } = body;

        if (!scenario) {
            return NextResponse.json({ error: "Szenario ist erforderlich" }, { status: 400 });
        }

        const aiSettings = await prisma.aISettings.findUnique({ where: { bookId } });
        if (!aiSettings?.apiKey) {
            return NextResponse.json({ error: "KI-API-Key nicht konfiguriert." }, { status: 400 });
        }

        // What-if gets full context without chapterId to include ALL chapters
        const ctx = await fetchBookContext(bookId);
        const genreInstructions = buildGenreInstructions(ctx.book.genre);
        const storyContext = formatContextForPrompt(ctx);

        const depthInstructions: Record<string, string> = {
            short: "Kurze Analyse mit 2-3 möglichen Konsequenzen",
            medium: "Detaillierte Analyse mit 4-5 Konsequenzen und einem kurzen Szenario-Auszug",
            long: "Ausführliche Analyse mit detaillierten Konsequenzen, Charakterentwicklung und einem Szenario-Text in HTML",
        };

        const systemPrompt = `Du bist ein kreativer Story-Berater, der alternative Handlungsverläufe erkundet.
${genreInstructions}

Analysiere das "Was wäre wenn"-Szenario und zeige die Konsequenzen für die Geschichte auf.
${depthInstructions[explorationDepth] || depthInstructions.medium}

Antworte AUSSCHLIESSLICH mit gültigem JSON (kein anderer Text, nur JSON):
{
  "scenario": "Bestätigung des Szenarios",
  "immediateEffects": ["Sofortige Auswirkung 1", "Auswirkung 2"],
  "characterImpact": [
    {
      "character": "Charaktername",
      "impact": "Wie sich der Charakter verändert"
    }
  ],
  "plotConsequences": [
    {
      "event": "Was passiert als Konsequenz",
      "probability": "high|medium|low"
    }
  ],
  "newConflicts": ["Neuer Konflikt 1", "Neuer Konflikt 2"],
  "storyDirection": "Wohin sich die Geschichte mit diesem Szenario entwickeln würde",
  "recommendation": "Empfehlung: Ist dieses Szenario eine gute Alternative?"
}`;

        const userPrompt = `Vollständiger Kontext der Geschichte:\n${storyContext}\n\n---\n\nErkunde folgendes "Was wäre wenn"-Szenario:\n\n${scenario}`;

        const response = await fetch(`${aiSettings.apiEndpoint}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${decryptIfNeeded(aiSettings.apiKey)}` },
            body: JSON.stringify({
                model: aiSettings.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: Math.min(aiSettings.temperature + 0.2, 1.0),
                max_tokens: explorationDepth === "long" ? 8000 : 4000,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("What-if - AI API error:", errorData);
            return NextResponse.json({ error: "KI-Generierung fehlgeschlagen" }, { status: response.status });
        }

        const data = await response.json();
        if (process.env.NODE_ENV === "development") console.log("What-if - AI response:", JSON.stringify(data, null, 2));

        const content = extractAIContent(data);
        if (!content) {
            console.error("What-if - No content in response:", JSON.stringify(data, null, 2));
            return NextResponse.json({ error: "Keine Antwort von KI erhalten", details: data }, { status: 500 });
        }

        const result = extractJSON(content);
        if (!result) {
            console.error("What-if - Could not parse JSON from:", content);
            return NextResponse.json({ error: "KI-Antwort konnte nicht verarbeitet werden", raw: content }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("What-if exploration error:", error);
        return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
    }
}
