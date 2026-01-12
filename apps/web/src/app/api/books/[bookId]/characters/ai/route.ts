import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

type CharacterData = {
    name: string;
    role: string;
    description: string;
    personality: string;
    backstory: string;
    appearance: string;
    motivation: string;
    arc: string;
    notes: string;
};

// Manual field extraction as last resort fallback
function extractFieldsManually(text: string): Record<string, unknown> | null {
    console.log("Attempting manual field extraction...");
    const fields = ['name', 'role', 'description', 'personality', 'backstory', 'appearance', 'motivation', 'arc', 'notes'];
    const result: Record<string, string> = {};

    for (const field of fields) {
        // Match "field": "value" pattern, handling multiline values
        const pattern = new RegExp(`"${field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 'i');
        const match = text.match(pattern);
        if (match) {
            result[field] = match[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        }
    }

    // Need at least name to be valid
    if (result.name) {
        console.log("Manual extraction found fields:", Object.keys(result));
        // Validate role
        if (result.role) {
            const validRoles = ['protagonist', 'antagonist', 'supporting', 'minor'];
            const roleValue = result.role.split('|')[0].trim().toLowerCase();
            result.role = validRoles.includes(roleValue) ? roleValue : 'supporting';
        } else {
            result.role = 'supporting';
        }
        return result;
    }

    console.error("Manual extraction failed - no name field found");
    return null;
}

// Robust JSON extraction that handles nested objects and common AI response issues
function extractJSON(text: string): Record<string, unknown> | null {
    console.log("=== extractJSON called ===");
    console.log("Response length:", text.length);
    console.log("Full response:", text);

    // First, strip markdown code blocks if present
    let cleanedText = text;
    // Remove ```json ... ``` or ``` ... ``` blocks
    cleanedText = cleanedText.replace(/```(?:json)?[\s\n]*/gi, '');
    cleanedText = cleanedText.replace(/```[\s\n]*/g, '');
    // Remove markdown bold/italic formatting from values: **text** -> text, *text* -> text
    cleanedText = cleanedText.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleanedText = cleanedText.replace(/\*([^*]+)\*/g, '$1');

    // Find the first { and try to match balanced braces
    const startIdx = cleanedText.indexOf('{');
    if (startIdx === -1) {
        console.error("No opening brace found");
        return extractFieldsManually(text);
    }

    let depth = 0;
    let endIdx = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = startIdx; i < cleanedText.length; i++) {
        const char = cleanedText[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === '\\' && inString) {
            escapeNext = true;
            continue;
        }

        if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
        }

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

    if (endIdx === -1) {
        // JSON is truncated - try to repair it
        console.warn("JSON appears truncated, attempting repair...");
        let truncatedJson = cleanedText.substring(startIdx);

        // Find the last complete key-value pair
        // Look for the last complete string value (ending with ")
        const lastCompleteQuote = truncatedJson.lastIndexOf('",');
        if (lastCompleteQuote > 0) {
            truncatedJson = truncatedJson.substring(0, lastCompleteQuote + 1);
        } else {
            // Try to find last complete value without trailing comma
            const lastQuote = truncatedJson.lastIndexOf('"');
            if (lastQuote > 0) {
                // Check if this quote ends a value (preceded by content, not a key)
                const beforeQuote = truncatedJson.substring(0, lastQuote);
                const colonPos = beforeQuote.lastIndexOf(':');
                const commaPos = beforeQuote.lastIndexOf(',');
                if (colonPos > commaPos) {
                    // This quote ends a value
                    truncatedJson = truncatedJson.substring(0, lastQuote + 1);
                }
            }
        }

        // Remove any trailing incomplete content and add closing brace
        truncatedJson = truncatedJson.replace(/,\s*$/, ''); // Remove trailing comma
        truncatedJson = truncatedJson.replace(/,\s*"[^"]*$/, ''); // Remove incomplete key
        truncatedJson = truncatedJson + '}';

        // Clean and try to parse
        truncatedJson = truncatedJson.replace(/,\s*([\}\]])/g, '$1');
        truncatedJson = truncatedJson.replace(/[\x00-\x1f]/g, (char) => {
            if (char === '\n') return '\\n';
            if (char === '\r') return '\\r';
            if (char === '\t') return '\\t';
            return '';
        });

        try {
            const parsed = JSON.parse(truncatedJson) as Record<string, unknown>;
            console.log("Successfully repaired truncated JSON");
            // Validate and fix role if needed
            if (parsed.role && typeof parsed.role === 'string') {
                const validRoles = ['protagonist', 'antagonist', 'supporting', 'minor'];
                const roleValue = parsed.role.split('|')[0].trim().toLowerCase();
                if (validRoles.includes(roleValue)) {
                    parsed.role = roleValue;
                } else {
                    parsed.role = 'supporting';
                }
            }
            return parsed;
        } catch (e) {
            console.error("Failed to repair truncated JSON:", e);
            console.error("Attempted JSON:", truncatedJson.substring(0, 500));
            // Last resort: try manual extraction
            return extractFieldsManually(text);
        }
    }

    let jsonStr = cleanedText.substring(startIdx, endIdx + 1);

    // Clean common issues in AI responses
    // Remove trailing commas before } or ]
    jsonStr = jsonStr.replace(/,\s*([\}\]])/g, '$1');
    // Replace control characters in strings
    jsonStr = jsonStr.replace(/[\x00-\x1f]/g, (char) => {
        if (char === '\n') return '\\n';
        if (char === '\r') return '\\r';
        if (char === '\t') return '\\t';
        return '';
    });

    try {
        const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
        // Validate and fix role if needed
        if (parsed.role && typeof parsed.role === 'string') {
            const validRoles = ['protagonist', 'antagonist', 'supporting', 'minor'];
            // If role contains | (like "protagonist|supporting"), take the first one
            const roleValue = parsed.role.split('|')[0].trim().toLowerCase();
            if (validRoles.includes(roleValue)) {
                parsed.role = roleValue;
            } else {
                parsed.role = 'supporting'; // default
            }
        }
        return parsed;
    } catch (e) {
        console.error("JSON parse failed, trying cleanup...", e);
        // Try one more cleanup: remove any incomplete strings at the end
        const cleanJson = jsonStr.replace(/,\s*"[^"]*$/, '');
        try {
            return JSON.parse(cleanJson) as Record<string, unknown>;
        } catch {
            // Last resort: manual extraction
            return extractFieldsManually(text);
        }
    }
}

// POST - AI actions for characters
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { action, characterId, prompt } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        // Get global settings for API access
        const settings = await prisma.globalSettings.findUnique({
            where: { id: "default" },
        });

        if (!settings?.apiKey) {
            return NextResponse.json(
                { error: "Keine API-Konfiguration. Bitte konfiguriere die Einstellungen." },
                { status: 400 }
            );
        }

        // Cast settings with apiKey as non-null (we checked above)
        const aiSettings = {
            apiEndpoint: settings.apiEndpoint,
            apiKey: settings.apiKey,
            model: settings.model,
        };

        // Get book info and all existing characters for context
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
            return NextResponse.json(
                { error: "Buch nicht gefunden" },
                { status: 404 }
            );
        }

        if (action === "enhance") {
            // Enhance existing character
            if (!characterId) {
                return NextResponse.json(
                    { error: "characterId is required for enhance" },
                    { status: 400 }
                );
            }

            const character = book.characters.find((c) => c.id === characterId);
            if (!character) {
                return NextResponse.json(
                    { error: "Charakter nicht gefunden" },
                    { status: 404 }
                );
            }

            const result = await enhanceCharacter(
                aiSettings,
                book,
                character,
                prompt
            );

            return NextResponse.json(result);
        }

        if (action === "generate") {
            // Generate new character
            const result = await generateCharacter(aiSettings, book, prompt);
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error) {
        console.error("AI character error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
        return NextResponse.json(
            { error: `Fehler bei der KI-Generierung: ${errorMessage}` },
            { status: 500 }
        );
    }
}

async function enhanceCharacter(
    settings: { apiEndpoint: string; apiKey: string; model: string },
    book: { title: string; genre: string | null; description: string | null; characters: Array<{ id: string; name: string; role: string; description: string | null; personality: string | null; backstory: string | null; motivation: string | null }> },
    character: { id: string; name: string; role: string; description: string | null; personality: string | null; backstory: string | null; appearance: string | null; motivation: string | null; arc: string | null; notes: string | null },
    prompt: string
): Promise<{ character: CharacterData }> {
    const otherCharacters = book.characters
        .filter((c) => c.id !== character.id)
        .map((c) => `- ${c.name} (${c.role}): ${c.description || "Keine Beschreibung"}`)
        .join("\n");

    const systemPrompt = `Du bist ein erfahrener Buchautor. Verbessere den folgenden Charakter basierend auf dem Benutzer-Prompt.

BUCH-KONTEXT:
- Titel: ${book.title}
- Genre: ${book.genre || "Nicht angegeben"}
- Beschreibung: ${book.description || "Keine Beschreibung"}

ANDERE CHARAKTERE IM BUCH:
${otherCharacters || "Keine anderen Charaktere"}

AKTUELLER CHARAKTER:
- Name: ${character.name}
- Rolle: ${character.role}
- Beschreibung: ${character.description || ""}
- Persönlichkeit: ${character.personality || ""}
- Hintergrund: ${character.backstory || ""}
- Aussehen: ${character.appearance || ""}
- Motivation: ${character.motivation || ""}
- Charakterbogen: ${character.arc || ""}
- Notizen: ${character.notes || ""}

Antworte NUR mit einem JSON-Objekt:
{
  "name": "Name (kann gleich bleiben)",
  "role": "protagonist|antagonist|supporting|minor",
  "description": "Kurze Beschreibung",
  "personality": "Persönlichkeitsmerkmale",
  "backstory": "Hintergrundgeschichte",
  "appearance": "Aussehen",
  "motivation": "Antrieb/Ziele",
  "arc": "Charakterentwicklung",
  "notes": "Zusätzliche Notizen"
}`;

    const userPrompt = `Benutzer-Anweisung: "${prompt}"

Verbessere den Charakter entsprechend dieser Anweisung. Behalte nicht relevante Felder bei, passe aber alles an, was zur Anweisung passt.`;

    const response = await callAI(settings, systemPrompt, userPrompt);
    console.log("AI enhance response:", response.substring(0, 500));

    const parsed = extractJSON(response);
    if (parsed) {
        return { character: parsed as unknown as CharacterData };
    }
    throw new Error(`Kein gültiges JSON in Antwort gefunden. Antwort: ${response.substring(0, 300)}`);
}

async function generateCharacter(
    settings: { apiEndpoint: string; apiKey: string; model: string },
    book: { title: string; genre: string | null; description: string | null; characters: Array<{ name: string; role: string; description: string | null; personality: string | null; backstory: string | null; motivation: string | null }> },
    prompt: string
): Promise<{ character: CharacterData }> {
    const existingCharacters = book.characters
        .map((c) => `- ${c.name} (${c.role}): ${c.description || "Keine Beschreibung"}, Motivation: ${c.motivation || "Unbekannt"}`)
        .join("\n");

    const systemPrompt = `Du bist ein erfahrener Buchautor. Erstelle einen neuen Charakter für das Buch.

BUCH-KONTEXT:
- Titel: ${book.title}
- Genre: ${book.genre || "Nicht angegeben"}
- Beschreibung: ${book.description || "Keine Beschreibung"}

EXISTIERENDE CHARAKTERE:
${existingCharacters || "Noch keine Charaktere"}

WICHTIG:
- Der neue Charakter MUSS zu den existierenden Charakteren passen
- Erstelle interessante Beziehungen/Kontraste
- Alle Texte auf Deutsch

Antworte NUR mit einem JSON-Objekt:
{
  "name": "Passender Name",
  "role": "protagonist|antagonist|supporting|minor",
  "description": "Kurze Beschreibung",
  "personality": "Persönlichkeitsmerkmale",
  "backstory": "Hintergrundgeschichte",
  "appearance": "Aussehen",
  "motivation": "Antrieb/Ziele",
  "arc": "Charakterentwicklung",
  "notes": "Beziehungen zu anderen Charakteren"
}`;

    const userPrompt = `Benutzer-Anweisung: "${prompt}"

Erstelle einen neuen Charakter basierend auf dieser Anweisung.`;

    const response = await callAI(settings, systemPrompt, userPrompt);
    console.log("AI generate response:", response.substring(0, 500));

    const parsed = extractJSON(response);
    if (parsed) {
        return { character: parsed as unknown as CharacterData };
    }
    throw new Error(`Kein gültiges JSON in Antwort gefunden. Antwort: ${response.substring(0, 300)}`);
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
            max_tokens: 4096,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("AI API error:", response.status, errorText);
        throw new Error(`KI-API Fehler (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
        console.error("No content in AI response:", JSON.stringify(data).substring(0, 500));
        throw new Error("Leere Antwort von der KI-API");
    }
    return content;
}
