import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

type WorldElementData = {
    name: string;
    type: string;
    description: string;
    usage?: string;
    history?: string;
};

// Manual field extraction as last resort fallback
function extractFieldsManually(text: string): Record<string, unknown> | null {
    const fields = ['name', 'type', 'description', 'usage', 'history'];
    const result: Record<string, string> = {};

    for (const field of fields) {
        // Match "field": "value" pattern, handling multiline values
        const pattern = new RegExp(`"${field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 'i');
        const match = text.match(pattern);
        if (match) {
            result[field] = match[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        }
    }

    if (result.name) {
        return result;
    }

    return null;
}

// Robust JSON extraction
function extractJSON(text: string): Record<string, unknown> | null {
    let cleanedText = text.replace(/```(?:json)?[\s\n]*/gi, '').replace(/```[\s\n]*/g, '');
    cleanedText = cleanedText.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

    const startIdx = cleanedText.indexOf('{');
    if (startIdx === -1) return extractFieldsManually(text);

    let depth = 0;
    let endIdx = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = startIdx; i < cleanedText.length; i++) {
        const char = cleanedText[i];
        if (escapeNext) { escapeNext = false; continue; }
        if (char === '\\' && inString) { escapeNext = true; continue; }
        if (char === '"' && !escapeNext) { inString = !inString; continue; }
        if (!inString) {
            if (char === '{') depth++;
            if (char === '}') {
                depth--;
                if (depth === 0) {
                    endIdx = i;
                    break;
                }
            }
        }
    }

    if (endIdx === -1) return extractFieldsManually(text);

    let jsonStr = cleanedText.substring(startIdx, endIdx + 1);
    jsonStr = jsonStr.replace(/,\s*([\}\]])/g, '$1');
    jsonStr = jsonStr.replace(/[\x00-\x1f]/g, (char) => {
        if (char === '\n') return '\\n';
        if (char === '\r') return '\\r';
        if (char === '\t') return '\\t';
        return '';
    });

    try {
        return JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
        return extractFieldsManually(text);
    }
}

// POST - AI actions for world elements
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { action, worldElementId, prompt } = body;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
        if (!settings?.apiKey) {
            return NextResponse.json({ error: "Keine API-Konfiguration." }, { status: 400 });
        }

        const aiSettings = {
            apiEndpoint: settings.apiEndpoint,
            apiKey: settings.apiKey,
            model: settings.model,
        };

        const book = await prisma.book.findUnique({
            where: { id: bookId },
            include: {
                worldElements: true,
            },
        });

        if (!book) {
            return NextResponse.json({ error: "Buch nicht gefunden" }, { status: 404 });
        }

        if (action === "enhance") {
            // Enhance existing world element
            if (!worldElementId) {
                return NextResponse.json({ error: "worldElementId required" }, { status: 400 });
            }
            const element = book.worldElements.find((e) => e.id === worldElementId);
            if (!element) {
                return NextResponse.json({ error: "Element nicht gefunden" }, { status: 404 });
            }
            const result = await enhanceWorldElement(aiSettings, book, element, prompt);
            return NextResponse.json(result);
        }

        if (action === "generate") {
            const result = await generateWorldElement(aiSettings, book, prompt);
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error) {
        console.error("AI world error:", error);
        return NextResponse.json(
            { error: "Fehler bei der KI-Generierung" },
            { status: 500 }
        );
    }
}

async function enhanceWorldElement(
    settings: { apiEndpoint: string; apiKey: string; model: string },
    book: { title: string; genre: string | null; description: string | null },
    element: { name: string; type: string; description: string | null },
    prompt: string
): Promise<{ worldElement: WorldElementData }> {
    const systemPrompt = `Du bist ein erfahrener Worldbuilder für Romane. Verbessere das folgende Weltelement.

BUCH-KONTEXT:
- Titel: ${book.title}
- Genre: ${book.genre || "Nicht angegeben"}
- Beschreibung: ${book.description || "Keine Beschreibung"}

ELEMENT:
- Name: ${element.name}
- Typ: ${element.type}
- Beschreibung: ${element.description || ""}

Antworte NUR mit einem JSON-Objekt:
{
  "name": "Name",
  "type": "location|item|concept|organization|magic_system|technology",
  "description": "Detaillierte Beschreibung",
  "usage": "Verwendung/Funktion in der Welt",
  "history": "Hintergrundgeschichte"
}`;

    const userPrompt = `Anweisung: "${prompt}"\nVerbessere das Element entsprechend der Anweisung.`;
    const response = await callAI(settings, systemPrompt, userPrompt);
    const parsed = extractJSON(response);

    if (parsed) return { worldElement: parsed as unknown as WorldElementData };
    throw new Error("Kein gültiges JSON gefunden.");
}

async function generateWorldElement(
    settings: { apiEndpoint: string; apiKey: string; model: string },
    book: { title: string; genre: string | null; description: string | null; worldElements: Array<{ name: string; type: string }> },
    prompt: string
): Promise<{ worldElement: WorldElementData }> {
    const existingElements = book.worldElements.map(e => `- ${e.name} (${e.type})`).join("\n");

    const systemPrompt = `Du bist ein erfahrener Worldbuilder. Erstelle ein neues Element für die Welt des Buches.

BUCH-KONTEXT:
- Titel: ${book.title}
- Genre: ${book.genre || "Nicht angegeben"}

EXISTIERENDE ELEMENTE:
${existingElements || "Keine"}

Antworte NUR mit einem JSON-Objekt:
{
  "name": "Kreativer Name",
  "type": "location|item|concept|organization|magic_system|technology",
  "description": "Atmosphärische Beschreibung",
  "usage": "Verwendung/Funktion",
  "history": "Kurzer Hintergrund"
}`;

    const userPrompt = `Anweisung: "${prompt}"\nErstelle ein neues Element.`;
    const response = await callAI(settings, systemPrompt, userPrompt);
    const parsed = extractJSON(response);

    if (parsed) return { worldElement: parsed as unknown as WorldElementData };
    throw new Error("Kein gültiges JSON gefunden.");
}

async function callAI(settings: { apiEndpoint: string; apiKey: string; model: string }, systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch(`${settings.apiEndpoint}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify({
            model: settings.model,
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            temperature: 0.8,
            max_tokens: 2048,
        }),
    });

    if (!response.ok) throw new Error("KI-API Fehler");
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}
