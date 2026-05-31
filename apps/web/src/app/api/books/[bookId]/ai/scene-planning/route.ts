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
        const { chapterId, sceneCount = 3 } = body;

        const aiSettings = await prisma.aISettings.findUnique({ where: { bookId } });
        if (!aiSettings?.apiKey) {
            return NextResponse.json({ error: "KI-API-Key nicht konfiguriert." }, { status: 400 });
        }

        const ctx = await fetchBookContext(bookId, chapterId);
        const genreInstructions = buildGenreInstructions(ctx.book.genre);
        const storyContext = formatContextForPrompt(ctx);

        const systemPrompt = `Du bist ein erfahrener Schriftsteller und Story-Strukturexperte. Du erstellst detaillierte Szenenpläne für Kapitel.

${genreInstructions}

Antworte AUSSCHLIESSLICH mit gültigem JSON (kein anderer Text, nur JSON):
{
  "scenes": [
    {
      "title": "Szenen-Titel",
      "type": "opening|rising|confrontation|resolution|transition|cliffhanger",
      "description": "Was in dieser Szene passiert",
      "characters": ["Charaktername1", "Charaktername2"],
      "emotion": "Emotionaler Ton der Szene",
      "goal": "Was diese Szene in der Geschichte erreichen soll",
      "estimatedLength": "short|medium|long"
    }
  ],
  "chapterArc": "Kurze Beschreibung des gesamten Kapitel-Bogens",
  "tensionCurve": "rising|falling|wave|constant"
}`;

        const userPrompt = `Vollständiger Kontext der Geschichte:\n${storyContext}\n\n---\n\nErstelle einen Szenenplan mit ${sceneCount} Szenen für dieses Kapitel.`;

        const response = await fetch(`${aiSettings.apiEndpoint}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${decryptIfNeeded(aiSettings.apiKey)}` },
            body: JSON.stringify({
                model: aiSettings.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: aiSettings.temperature,
                max_tokens: 4000,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Scene planning - AI API error:", errorData);
            return NextResponse.json({ error: "KI-Generierung fehlgeschlagen", details: errorData }, { status: response.status });
        }

        const data = await response.json();
        if (process.env.NODE_ENV === "development") console.log("Scene planning - AI response:", JSON.stringify(data, null, 2));

        const content = extractAIContent(data);
        if (!content) {
            console.error("Scene planning - No content in response:", JSON.stringify(data, null, 2));
            return NextResponse.json({ error: "Keine Antwort von KI erhalten", details: data }, { status: 500 });
        }

        const scenePlan = extractJSON(content);
        if (!scenePlan) {
            console.error("Scene planning - Could not parse JSON from:", content);
            return NextResponse.json({ error: "KI-Antwort konnte nicht verarbeitet werden", raw: content }, { status: 500 });
        }

        return NextResponse.json(scenePlan);
    } catch (error) {
        console.error("Scene planning error:", error);
        return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
    }
}
