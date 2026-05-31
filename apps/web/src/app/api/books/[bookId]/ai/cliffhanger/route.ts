import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";
import { buildGenreInstructions } from "@/lib/ai/genre-prompts";
import { fetchBookContext, formatContextForPrompt } from "@/lib/ai/fetch-book-context";
import { extractAIContent, extractJSON } from "@/lib/ai/extract-content";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { chapterId, currentContent, style = "suspense" } = body;

        const aiSettings = await prisma.aISettings.findUnique({ where: { bookId } });
        if (!aiSettings?.apiKey) {
            return NextResponse.json({ error: "KI-API-Key nicht konfiguriert." }, { status: 400 });
        }

        const ctx = await fetchBookContext(bookId, chapterId);
        const genreInstructions = buildGenreInstructions(ctx.book.genre);
        const storyContext = formatContextForPrompt(ctx);

        const styleDescriptions: Record<string, string> = {
            suspense: "Spannung und Ungewissheit - der Leser muss wissen, was als nächstes passiert",
            emotional: "Emotionaler Cliffhanger - berührende oder schockierende Enthüllung",
            mystery: "Geheimnisvolle Wendung - neue Fragen, die beantwortet werden müssen",
            action: "Action-geladener Cliffhanger - Gefahr oder Konfrontation steht bevor",
            revelation: "Enthüllung - ein langes Geheimnis wird enthüllt oder angedeutet",
        };

        const systemPrompt = `Du bist ein Meister des Cliffhanger-Schreibens. Du schreibst ${styleDescriptions[style] || styleDescriptions.suspense}.
${genreInstructions}

Erstelle 3 verschiedene Cliffhanger-Vorschläge für das Kapitelende.

Antworte AUSSCHLIESSLICH mit gültigem JSON (kein anderer Text, nur JSON):
{
  "cliffhangers": [
    {
      "title": "Kurzer Titel",
      "style": "suspense|emotional|mystery|action|revelation",
      "text": "Der vollständige Cliffhanger-Text in HTML (TipTap-kompatibel)",
      "setup": "Was der Cliffhanger aufbaut",
      "hook": "Warum der Leser weiterlesen muss",
      "intensity": "low|medium|high"
    }
  ]
}`;

        let userPrompt = `Vollständiger Kontext der Geschichte:\n${storyContext}\n\n---\n\nErstelle Cliffhanger-Vorschläge für das Ende dieses Kapitels.`;

        if (currentContent) {
            const plainText = currentContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
            const lastPart = plainText.slice(-1000);
            userPrompt += `\n\nAktueller Kapitelinhalt (Ende):\n${lastPart}`;
        }

        if (ctx.nextChapters.length > 0) {
            const next = ctx.nextChapters[0];
            userPrompt += `\n\nNächstes Kapitel: "${next.title}"`;
            if (next.summary) userPrompt += `\nGeplante Zusammenfassung: ${next.summary}`;
            userPrompt += `\n\nDer Cliffhanger sollte nahtlos zum nächsten Kapitel überleiten.`;
        }

        const response = await fetch(`${aiSettings.apiEndpoint}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiSettings.apiKey}` },
            body: JSON.stringify({
                model: aiSettings.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: Math.min(aiSettings.temperature + 0.1, 1.0),
                max_tokens: 4000,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Cliffhanger - AI API error:", errorData);
            return NextResponse.json({ error: "KI-Generierung fehlgeschlagen" }, { status: response.status });
        }

        const data = await response.json();
        if (process.env.NODE_ENV === "development") console.log("Cliffhanger - AI response:", JSON.stringify(data, null, 2));

        const content = extractAIContent(data);
        if (!content) {
            console.error("Cliffhanger - No content in response:", JSON.stringify(data, null, 2));
            return NextResponse.json({ error: "Keine Antwort von KI erhalten", details: data }, { status: 500 });
        }

        const result = extractJSON(content);
        if (!result) {
            console.error("Cliffhanger - Could not parse JSON from:", content);
            return NextResponse.json({ error: "KI-Antwort konnte nicht verarbeitet werden", raw: content }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Cliffhanger error:", error);
        return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
    }
}
