import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

type PlotPointData = {
    title: string;
    type: string;
    description: string;
};

// Robust JSON extraction (reused from character AI)
function extractJSON(text: string): Record<string, unknown> | null {
    let cleanedText = text;
    cleanedText = cleanedText.replace(/```(?:json)?[\s\n]*/gi, '');
    cleanedText = cleanedText.replace(/```[\s\n]*/g, '');

    const startIdx = cleanedText.indexOf('{');
    if (startIdx === -1) return null;

    let endIdx = cleanedText.lastIndexOf('}');
    if (endIdx === -1) endIdx = cleanedText.length;
    else endIdx++;

    const jsonStr = cleanedText.substring(startIdx, endIdx);

    try {
        return JSON.parse(jsonStr) as Record<string, unknown>;
    } catch (e) {
        // Simple repair attempts
        try {
            return JSON.parse(jsonStr + '}') as Record<string, unknown>;
        } catch {
            return null;
        }
    }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { action, prompt } = body;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Get settings
        const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
        if (!settings?.apiKey) {
            return NextResponse.json({ error: "Keine API-Konfiguration" }, { status: 400 });
        }

        const aiSettings = {
            apiEndpoint: settings.apiEndpoint,
            apiKey: settings.apiKey,
            model: settings.model,
        };

        // Get book context
        const book = await prisma.book.findUnique({
            where: { id: bookId },
            include: {
                characters: true,
                plotPoints: {
                    orderBy: { orderIndex: "asc" },
                },
            },
        });

        if (!book) {
            return NextResponse.json({ error: "Buch nicht gefunden" }, { status: 404 });
        }

        if (action === "generate") {
            const plotPoint = await generatePlotPoint(aiSettings, book, prompt);
            return NextResponse.json({ plotPoint });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });

    } catch (error) {
        console.error("AI plot error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unbekannter Fehler" },
            { status: 500 }
        );
    }
}

async function generatePlotPoint(
    settings: { apiEndpoint: string; apiKey: string; model: string },
    book: any,
    prompt: string
): Promise<PlotPointData> {
    const existingPlot = book.plotPoints
        .map((p: any) => `- [${p.type}] ${p.title}: ${p.description || ""}`)
        .join("\n");

    const characters = book.characters
        .map((c: any) => `${c.name} (${c.role})`)
        .join(", ");

    const systemPrompt = `Du bist ein erfahrener Buchautor und Plot-Stratege. Erstelle einen neuen Handlungspunkt (Plot Point) für das Buch.

BUCH-KONTEXT:
- Titel: ${book.title}
- Genre: ${book.genre || "Nicht angegeben"}
- Beschreibung: ${book.description || "Keine Beschreibung"}

EXISTIERENDE FIGUREN:
${characters || "Keine"}

BISHERIGER PLOT:
${existingPlot || "Noch keine Handlungspunkte"}

Antworte NUR mit einem JSON-Objekt:
{
  "title": "Prägnanter Titel",
  "type": "hook|rising_action|climax|falling_action|resolution|subplot|event",
  "description": "Detaillierte Beschreibung was passiert, wer involviert ist und welche Konsequenzen es hat."
}

Wähle einen passenden Typ (type).
Stelle sicher, dass der neue Punkt logisch in die Geschichte passt.
Sprache: Deutsch.`;

    const userPrompt = `Benutzer-Anweisung: "${prompt}"\nErstelle basierend darauf einen neuen Handlungspunkt.`;

    const response = await callAI(settings, systemPrompt, userPrompt);
    const parsed = extractJSON(response);

    if (parsed) {
        return parsed as unknown as PlotPointData;
    }
    throw new Error("Konnte Antwort nicht als JSON parsen");
}

async function callAI(
    settings: { apiEndpoint: string; apiKey: string; model: string },
    systemPrompt: string,
    userPrompt: string
): Promise<string> {
    const response = await fetch(`${settings.apiEndpoint}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
            model: settings.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
            max_tokens: 2000,
        }),
    });

    if (!response.ok) {
        throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}
