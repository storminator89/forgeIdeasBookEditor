import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

interface ConsistencyIssue {
    id: string;
    type: "character" | "timeline" | "object" | "location" | "plot" | "other";
    severity: "warning" | "error";
    title: string;
    description: string;
    chapters: number[];
    suggestion: string;
}

interface ConsistencyCheckResponse {
    issues: ConsistencyIssue[];
    summary: string;
    checkedAt: string;
}

// Build the consistency check prompt
function buildConsistencyPrompt(bookData: {
    title: string;
    chapters: Array<{
        orderIndex: number;
        title: string;
        content: string;
        summary: string | null;
    }>;
    characters: Array<{
        name: string;
        role: string;
        description: string | null;
    }>;
    plotPoints: Array<{
        title: string;
        type: string;
        description: string | null;
    }>;
    worldElements: Array<{
        name: string;
        type: string;
        description: string | null;
    }>;
}): string {
    let prompt = `Du bist ein Lektor-Assistent, der Bücher auf Konsistenzfehler und Widersprüche prüft.

## Deine Aufgabe:
Analysiere das folgende Buch und finde alle Inkonsistenzen, Widersprüche und Logikfehler.

## Achte besonders auf:
1. **Charakter-Widersprüche**: Charaktere, die in einem Kapitel sterben/verschwinden, aber später wieder auftauchen
2. **Timeline-Probleme**: Ereignisse in falscher chronologischer Reihenfolge
3. **Objekt-Widersprüche**: Gegenstände, die mehrfach gefunden/eingeführt werden oder plötzlich verschwinden
4. **Orts-Inkonsistenzen**: Charaktere an unmöglichen Orten oder plötzliche Ortswechsel ohne Übergang
5. **Plot-Löcher**: Ungelöste Handlungsstränge, fehlende Erklärungen
6. **Charakter-Inkonsistenzen**: Persönlichkeitswechsel ohne Erklärung, widersprüchliche Eigenschaften

## Antwortformat:
Gib deine Antwort als valides JSON in folgendem Format zurück:
\`\`\`json
{
  "issues": [
    {
      "id": "eindeutige-id",
      "type": "character|timeline|object|location|plot|other",
      "severity": "warning|error",
      "title": "Kurzer Titel des Problems",
      "description": "Detaillierte Beschreibung des Widerspruchs",
      "chapters": [1, 5],
      "suggestion": "Vorschlag zur Behebung"
    }
  ],
  "summary": "Zusammenfassung der Analyse"
}
\`\`\`

Wenn keine Probleme gefunden werden, gib ein leeres issues-Array zurück.
Sei gründlich aber fokussiere dich auf echte Widersprüche, nicht auf stilistische Anmerkungen.

---

## Buchinformationen

Titel: ${bookData.title}

### Charaktere:
${bookData.characters.map(c => `- ${c.name} (${c.role}): ${c.description || "Keine Beschreibung"}`).join("\n")}

### Handlungspunkte:
${bookData.plotPoints.map(p => `- ${p.title} (${p.type}): ${p.description || "Keine Beschreibung"}`).join("\n")}

### Weltelemente:
${bookData.worldElements.map(w => `- ${w.name} (${w.type}): ${w.description || "Keine Beschreibung"}`).join("\n")}

### Kapitel-Inhalte:
`;

    // Add chapter contents
    for (const chapter of bookData.chapters) {
        // Strip HTML tags for analysis
        const plainContent = chapter.content
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        prompt += `\n#### Kapitel ${chapter.orderIndex + 1}: ${chapter.title}`;
        if (chapter.summary) {
            prompt += `\nZusammenfassung: ${chapter.summary}`;
        }
        if (plainContent) {
            // Limit content length to avoid token limits
            const truncatedContent = plainContent.length > 3000
                ? plainContent.substring(0, 3000) + "..."
                : plainContent;
            prompt += `\nInhalt: ${truncatedContent}`;
        }
        prompt += "\n";
    }

    return prompt;
}

// Parse AI response to extract JSON
function parseAIResponse(response: string): ConsistencyCheckResponse {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
        response.match(/\{[\s\S]*"issues"[\s\S]*\}/);

    let jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;

    try {
        const parsed = JSON.parse(jsonStr);

        // Validate and normalize the response
        const issues: ConsistencyIssue[] = (parsed.issues || []).map((issue: any, index: number) => ({
            id: issue.id || `issue-${index + 1}`,
            type: ["character", "timeline", "object", "location", "plot", "other"].includes(issue.type)
                ? issue.type
                : "other",
            severity: issue.severity === "error" ? "error" : "warning",
            title: String(issue.title || "Unbekanntes Problem"),
            description: String(issue.description || ""),
            chapters: Array.isArray(issue.chapters) ? issue.chapters.map(Number) : [],
            suggestion: String(issue.suggestion || ""),
        }));

        return {
            issues,
            summary: String(parsed.summary || `${issues.length} Problem(e) gefunden.`),
            checkedAt: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to parse AI response:", error, "\nResponse:", response);

        // Return a fallback response
        return {
            issues: [],
            summary: "Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.",
            checkedAt: new Date().toISOString(),
        };
    }
}

// POST - Run consistency check
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;

        // Get AI settings
        const aiSettings = await prisma.aISettings.findUnique({
            where: { bookId },
        });

        if (!aiSettings?.apiKey) {
            return NextResponse.json(
                { error: "KI-API-Key nicht konfiguriert. Bitte zuerst AI-Einstellungen einrichten." },
                { status: 400 }
            );
        }

        // Get book with all related data
        const book = await prisma.book.findUnique({
            where: { id: bookId },
            include: {
                chapters: {
                    orderBy: { orderIndex: "asc" },
                    select: {
                        orderIndex: true,
                        title: true,
                        content: true,
                        summary: true,
                    },
                },
                characters: {
                    select: {
                        name: true,
                        role: true,
                        description: true,
                    },
                },
                plotPoints: {
                    orderBy: { orderIndex: "asc" },
                    select: {
                        title: true,
                        type: true,
                        description: true,
                    },
                },
                worldElements: {
                    select: {
                        name: true,
                        type: true,
                        description: true,
                    },
                },
            },
        });

        if (!book) {
            return NextResponse.json(
                { error: "Buch nicht gefunden" },
                { status: 404 }
            );
        }

        if (book.chapters.length === 0) {
            return NextResponse.json({
                issues: [],
                summary: "Keine Kapitel zum Prüfen vorhanden.",
                checkedAt: new Date().toISOString(),
            });
        }

        // Build the prompt
        const prompt = buildConsistencyPrompt({
            title: book.title,
            chapters: book.chapters,
            characters: book.characters,
            plotPoints: book.plotPoints,
            worldElements: book.worldElements,
        });

        // Call AI API
        const response = await fetch(`${aiSettings.apiEndpoint}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${aiSettings.apiKey}`,
            },
            body: JSON.stringify({
                model: aiSettings.model,
                messages: [
                    {
                        role: "system",
                        content: "Du bist ein präziser Lektor-Assistent. Antworte nur mit validem JSON.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.3, // Lower temperature for more consistent analysis
                max_tokens: 4000,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("AI API error:", errorData);
            return NextResponse.json(
                { error: "KI-Analyse fehlgeschlagen", details: errorData },
                { status: response.status }
            );
        }

        const data = await response.json();
        const aiResponseText = data.choices?.[0]?.message?.content || "";

        if (!aiResponseText) {
            return NextResponse.json(
                { error: "Keine Antwort von der KI erhalten" },
                { status: 500 }
            );
        }

        // Parse the response
        const result = parseAIResponse(aiResponseText);

        return NextResponse.json(result);
    } catch (error) {
        console.error("Consistency check failed:", error);
        return NextResponse.json(
            { error: "Konsistenzprüfung fehlgeschlagen" },
            { status: 500 }
        );
    }
}
