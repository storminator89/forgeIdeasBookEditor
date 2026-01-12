import { NextRequest, NextResponse } from "next/server";

// Types for wizard responses
type WizardQuestion = {
    id: string;
    question: string;
    type: "text" | "select";
    options?: string[];
};

type GeneratedCharacter = {
    name: string;
    role: "protagonist" | "antagonist" | "supporting" | "minor";
    description: string;
    personality: string;
    motivation: string;
    backstory: string;
};

type GeneratedPlotPoint = {
    title: string;
    type: "hook" | "rising_action" | "climax" | "falling_action" | "resolution";
    description: string;
    orderIndex: number;
};

type GeneratedWorldElement = {
    name: string;
    type: "location" | "item" | "concept" | "organization";
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

// Generate follow-up questions based on user's story idea
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, storyIdea, genre, answers, apiEndpoint, apiKey, model } = body;

        if (!apiEndpoint || !apiKey) {
            return NextResponse.json(
                { error: "API-Konfiguration fehlt. Bitte konfiguriere deine KI-Einstellungen." },
                { status: 400 }
            );
        }

        if (action === "questions") {
            // Generate follow-up questions
            const questions = await generateQuestions(storyIdea, genre, apiEndpoint, apiKey, model);
            return NextResponse.json({ questions });
        }

        if (action === "generate") {
            // Generate full book structure
            const result = await generateBookStructure(
                storyIdea,
                genre,
                answers,
                apiEndpoint,
                apiKey,
                model
            );
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error) {
        console.error("Story wizard error:", error);
        return NextResponse.json(
            { error: "Fehler bei der KI-Generierung" },
            { status: 500 }
        );
    }
}

async function generateQuestions(
    storyIdea: string,
    genre: string,
    apiEndpoint: string,
    apiKey: string,
    model: string
): Promise<WizardQuestion[]> {
    const systemPrompt = `Du bist ein erfahrener Buchautor-Assistent. Basierend auf der Geschichtsidee des Nutzers, stelle 3 präzise Nachfragen, um die Geschichte besser zu verstehen.

Antworte NUR mit einem JSON-Array in diesem Format:
[
  {"id": "q1", "question": "Frage 1?", "type": "text"},
  {"id": "q2", "question": "Frage 2?", "type": "select", "options": ["Option A", "Option B", "Option C"]},
  {"id": "q3", "question": "Frage 3?", "type": "text"}
]

Stelle Fragen zu:
1. Zeitepoche/Setting
2. Hauptkonflikt oder Stimmung
3. Zielgruppe oder Erzählperspektive`;

    const userPrompt = `Geschichtsidee: "${storyIdea}"
Genre: ${genre || "Nicht angegeben"}

Generiere 3 Nachfragen.`;

    const response = await callAI(apiEndpoint, apiKey, model, systemPrompt, userPrompt);

    try {
        // Extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Could not parse questions");
    } catch {
        // Fallback questions if parsing fails
        return [
            { id: "q1", question: "In welcher Zeit oder Welt spielt deine Geschichte?", type: "text" },
            { id: "q2", question: "Was ist der Hauptkonflikt oder das zentrale Thema?", type: "text" },
            { id: "q3", question: "Welche Stimmung soll die Geschichte haben?", type: "select", options: ["Spannend/Thriller", "Romantisch", "Dunkel/Düster", "Humorvoll", "Episch/Heroisch"] },
        ];
    }
}

async function generateBookStructure(
    storyIdea: string,
    genre: string,
    answers: Record<string, string>,
    apiEndpoint: string,
    apiKey: string,
    model: string
): Promise<WizardResult> {
    const answersText = Object.entries(answers)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

    const systemPrompt = `Du bist ein erfahrener Buchautor und Geschichtenentwickler. Erstelle eine vollständige Buchstruktur basierend auf der Geschichtsidee.

Antworte NUR mit einem JSON-Objekt in diesem exakten Format:
{
  "book": {
    "title": "Buchtitel",
    "description": "Kurze Beschreibung der Geschichte (2-3 Sätze)",
    "genre": "Genre",
    "targetAudience": "Zielgruppe",
    "writingStyle": "Schreibstil"
  },
  "characters": [
    {
      "name": "Name",
      "role": "protagonist|antagonist|supporting|minor",
      "description": "Kurzbeschreibung",
      "personality": "Persönlichkeit",
      "motivation": "Was treibt den Charakter an?",
      "backstory": "Hintergrund"
    }
  ],
  "plotPoints": [
    {
      "title": "Titel",
      "type": "hook|rising_action|climax|falling_action|resolution",
      "description": "Was passiert?",
      "orderIndex": 0
    }
  ],
  "worldElements": [
    {
      "name": "Name",
      "type": "location|item|concept|organization",
      "description": "Beschreibung"
    }
  ],
  "chapterOutline": [
    {
      "title": "Kapiteltitel",
      "summary": "Kurze Zusammenfassung"
    }
  ]
}

WICHTIG:
- Erstelle 2-3 interessante Charaktere (mindestens 1 Protagonist)
- Erstelle 5-7 Handlungspunkte für einen klassischen Spannungsbogen
- Erstelle 3-5 relevante Weltelemente
- Erstelle 5-8 Kapitelvorschläge
- Alle Texte auf Deutsch`;

    const userPrompt = `Geschichtsidee: "${storyIdea}"
Genre: ${genre || "Fantasy"}

Zusätzliche Details vom Autor:
${answersText}

Generiere jetzt die vollständige Buchstruktur als JSON.`;

    const response = await callAI(apiEndpoint, apiKey, model, systemPrompt, userPrompt, 4096);

    try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Could not parse book structure");
    } catch (error) {
        console.error("Parse error:", error, "Response:", response);
        throw new Error("Fehler beim Parsen der KI-Antwort");
    }
}

async function callAI(
    apiEndpoint: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 2048
): Promise<string> {
    const response = await fetch(`${apiEndpoint}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model || "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
            max_tokens: maxTokens,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("AI API error:", error);
        throw new Error("KI-API Fehler");
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
}
