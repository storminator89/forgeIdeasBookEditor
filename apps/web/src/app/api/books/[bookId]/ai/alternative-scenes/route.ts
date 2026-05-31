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
        const { chapterId, sceneDescription, variantCount = 2 } = body;

        if (!sceneDescription) {
            return NextResponse.json({ error: "Szenen-Beschreibung ist erforderlich" }, { status: 400 });
        }

        const aiSettings = await prisma.aISettings.findUnique({ where: { bookId } });
        if (!aiSettings?.apiKey) {
            return NextResponse.json({ error: "KI-API-Key nicht konfiguriert." }, { status: 400 });
        }

        const ctx = await fetchBookContext(bookId, chapterId);
        const genreInstructions = buildGenreInstructions(ctx.book.genre);
        const storyContext = formatContextForPrompt(ctx);

        const systemPrompt = `Du bist ein kreativer Schriftsteller, der alternative Versionen von Schlüsselszenen entwickelt.
${genreInstructions}

Erstelle ${variantCount} verschiedene Varianten der beschriebenen Szene. Jede Variante soll:
- Einen anderen emotionalen Ansatz verfolgen
- Unterschiedliche Konsequenzen für die Charaktere haben
- Dennoch zur bestehenden Handlung passen

Antworte AUSSCHLIESSLICH mit gültigem JSON (kein anderer Text, nur JSON):
{
  "variants": [
    {
      "title": "Varianten-Titel",
      "approach": "Kurze Beschreibung des Ansatzes",
      "content": "Der vollständige Szenen-Text in HTML (TipTap-kompatibel: <p>, <strong>, <em> Tags)",
      "tone": "Emotionaler Ton",
      "consequences": "Mögliche Konsequenzen für die Handlung",
      "pros": ["Vorteil 1", "Vorteil 2"],
      "cons": ["Nachteil 1"]
    }
  ]
}`;

        const userPrompt = `Vollständiger Kontext der Geschichte:\n${storyContext}\n\n---\n\nErstelle ${variantCount} alternative Versionen dieser Szene:\n\n${sceneDescription}`;

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
                max_tokens: 8000,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Alternative scenes - AI API error:", errorData);
            return NextResponse.json({ error: "KI-Generierung fehlgeschlagen" }, { status: response.status });
        }

        const data = await response.json();
        if (process.env.NODE_ENV === "development") console.log("Alternative scenes - AI response:", JSON.stringify(data, null, 2));

        const content = extractAIContent(data);
        if (!content) {
            console.error("Alternative scenes - No content in response:", JSON.stringify(data, null, 2));
            return NextResponse.json({ error: "Keine Antwort von KI erhalten", details: data }, { status: 500 });
        }

        const result = extractJSON(content);
        if (!result) {
            console.error("Alternative scenes - Could not parse JSON from:", content);
            return NextResponse.json({ error: "KI-Antwort konnte nicht verarbeitet werden", raw: content }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Alternative scenes error:", error);
        return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
    }
}
