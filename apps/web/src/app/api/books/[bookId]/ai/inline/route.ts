import prisma from "@bucherstellung/db";
import { NextRequest } from "next/server";
import { buildGenreInstructions } from "@/lib/ai/genre-prompts";
import { decryptIfNeeded } from "@/lib/crypto";
import { fetchBookContext, formatContextForPrompt } from "@/lib/ai/fetch-book-context";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

// Action-specific prompts
const ACTION_PROMPTS: Record<string, (text: string, context: string) => string> = {
    rewrite: (text, context) => `Du bist ein kreativer Schriftsteller. Schreibe den folgenden Text um, behalte aber die Bedeutung bei. Mache ihn ausdrucksstärker und stilistisch besser.

Kontext der Geschichte:
${context.slice(0, 50000)}

Ursprünglicher Text:
"${text}"

WICHTIG:
- Behalte die Bedeutung bei
- Verbessere den Stil und die Ausdruckskraft
- Passe den Tonfall an die Geschichte an
- Antworte NUR mit dem neuen Text, ohne Erklärungen`,

    expand: (text, context) => `Du bist ein kreativer Schriftsteller. Mache den folgenden Text ausführlicher und detaillierter. Füge Beschreibungen, Emotionen und Atmosphäre hinzu.

Kontext der Geschichte:
${context.slice(0, 50000)}

Ursprünglicher Text:
"${text}"

WICHTIG:
- Füge sensorische Details hinzu (Sehen, Hören, Fühlen, Riechen)
- Erweitere Emotionen und Gedanken der Charaktere
- Beschreibe die Umgebung atmosphärisch
- Behalte den ursprünglichen Text bei und erweitere ihn
- Antworte NUR mit dem erweiterten Text, ohne Erklärungen`,

    shorten: (text, context) => `Du bist ein präziser Schriftsteller. Kürze den folgenden Text, behalte aber die Kernaussagen bei. Mache ihn kompakter und direkter.

Kontext der Geschichte:
${context.slice(0, 50000)}

Ursprünglicher Text:
"${text}"

WICHTIG:
- Entferne redundante Informationen
- Behalte die wichtigsten Handlungselemente bei
- Mache den Text prägnanter
- Antworte NUR mit dem gekürzten Text, ohne Erklärungen`,

    continue: (text, context) => `Du bist ein kreativer Schriftsteller. Schreibe die Geschichte nahtlos weiter. Der folgende Text ist der aktuelle Stand der Geschichte.

Aktueller Text:
"${text}"

Kontext der Geschichte:
${context.slice(0, 50000)}

WICHTIG:
- Schreibe nahtlos weiter, ohne den letzten Satz zu wiederholen
- Behalte den Stil und Tonfall bei
- Entwickle die Handlung natürlich weiter
- Antworte NUR mit dem neuen Text, ohne Erklärungen`,

    improve_dialog: (text, context) => `Du bist ein Dialog-Experte und professioneller Schriftsteller. Verbessere den folgenden Dialog, damit er natürlicher, lebendiger und charakteristischer klingt.

Kontext der Geschichte:
${context.slice(0, 50000)}

Ursprünglicher Text mit Dialog:
"${text}"

WICHTIG:
- Jede Figur muss eine unverwechselbare Stimme haben
- Nutze Subtext - was Charaktere SAGEN und was sie MEINEN kann unterschiedlich sein
- Füge Handlungen, Gesten und Reaktionen zwischen den Dialogzeilen ein
- Vermeide übermäßige Dialog-Tags (sagte, fragte) - nutze Handlungsbeschreibungen
- Der Dialog soll realistisch und flüssig klingen
- Behalte die inhaltliche Bedeutung bei
- Antworte NUR mit dem verbesserten Text, ohne Erklärungen`,
};

// POST - Inline AI operations
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { action, text, context } = body;

        // Validate action
        if (!action || !ACTION_PROMPTS[action]) {
            return new Response(
                JSON.stringify({ error: "Ungültige Aktion. Erlaubt: rewrite, expand, shorten, continue, improve_dialog" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // For continue action, text is optional; all others require text
        if (action !== "continue" && !text) {
            return new Response(
                JSON.stringify({ error: "Text ist erforderlich für diese Aktion" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Get AI settings
        const aiSettings = await prisma.aISettings.findUnique({
            where: { bookId },
        });

        if (!aiSettings?.apiKey) {
            return new Response(
                JSON.stringify({ error: "KI-API-Key nicht konfiguriert. Bitte zuerst AI-Einstellungen einrichten." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Get full book context from server
        const ctx = await fetchBookContext(bookId);
        const genreInstructions = buildGenreInstructions(ctx.book.genre);
        const fullStoryContext = formatContextForPrompt(ctx, {
            includePreviousChapterContent: false, // Summaries only for inline operations
        });

        // Build system prompt with full context
        const systemPrompt = `Du bist ein professioneller Schriftsteller und Lektor.${genreInstructions}`;

        // Merge server context with client-provided context (which contains current chapter content)
        const mergedContext = fullStoryContext + (context ? `\n\nAKTUELLER KAPITELINHALT:\n${context}` : "");

        // Build user prompt based on action
        const userPrompt = ACTION_PROMPTS[action](text || "", mergedContext);

        // Call AI API with streaming
        const requestBody = {
            model: aiSettings.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: aiSettings.temperature,
            max_tokens: action === "continue" ? 4000 : 2000,
            stream: true,
        };

        const response = await fetch(`${aiSettings.apiEndpoint}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${decryptIfNeeded(aiSettings.apiKey)}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("AI API error:", errorData);
            return new Response(
                JSON.stringify({ error: "KI-Generierung fehlgeschlagen", details: errorData }),
                { status: response.status, headers: { "Content-Type": "application/json" } }
            );
        }

        // Process streaming response
        if (!response.body) {
            return new Response(
                JSON.stringify({ error: "Kein Stream erhalten" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                let buffer = "";

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            const trimmedLine = line.trim();
                            if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

                            const data = trimmedLine.slice(6);
                            if (data === "[DONE]") {
                                // Stream complete - clean up text
                                let cleanText = fullText;
                                // Remove thinking tags
                                cleanText = cleanText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
                                // Remove markdown code fences
                                cleanText = cleanText.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
                                controller.enqueue(
                                    encoder.encode(`event: done\ndata: ${JSON.stringify({ text: cleanText })}\n\n`)
                                );
                                controller.close();
                                return;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                const choice = parsed.choices?.[0];
                                // Only send actual content tokens to the client - skip reasoning/thinking tokens
                                const token = choice?.delta?.content || "";
                                if (token) {
                                    fullText += token;
                                    controller.enqueue(
                                        encoder.encode(`event: token\ndata: ${JSON.stringify({ token })}\n\n`)
                                    );
                                }
                            } catch {
                                // Skip malformed JSON chunks
                            }
                        }
                    }

                    // If we exit the loop without [DONE], send what we have
                    if (fullText) {
                        controller.enqueue(
                            encoder.encode(`event: done\ndata: ${JSON.stringify({ text: fullText })}\n\n`)
                        );
                    }
                    controller.close();
                } catch (error) {
                    console.error("Stream processing error:", error);
                    controller.enqueue(
                        encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "Stream-Verarbeitung fehlgeschlagen" })}\n\n`)
                    );
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error) {
        console.error("Inline AI error:", error);
        return new Response(
            JSON.stringify({ error: "Interner Serverfehler" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
