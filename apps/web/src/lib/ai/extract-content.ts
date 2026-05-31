/**
 * Extract text content from an OpenAI-compatible chat completion response.
 * Handles standard content, reasoning model fields, and thinking tags.
 */
export function extractAIContent(data: Record<string, unknown>): string | null {
    const choice = (data as any).choices?.[0];
    if (!choice) return null;

    // Standard content field
    if (typeof choice.message?.content === "string" && choice.message.content.length > 0) {
        let text = choice.message.content;
        // Remove thinking tags that some models leak
        text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
        return text || null;
    }

    // Reasoning model fields (o1 uses reasoning_content, qwen uses reasoning)
    if (typeof choice.message?.reasoning_content === "string" && choice.message.reasoning_content.length > 0) {
        return choice.message.reasoning_content;
    }
    if (typeof choice.message?.reasoning === "string" && choice.message.reasoning.length > 0) {
        return choice.message.reasoning;
    }

    // Fallback
    if (typeof choice.text === "string") {
        return choice.text;
    }

    return null;
}

/**
 * Extract JSON from an AI response that may contain markdown code fences or extra text.
 */
export function extractJSON<T>(content: string): T | null {
    // Try direct parse first
    try {
        return JSON.parse(content) as T;
    } catch {
        // Ignore
    }

    // Try extracting from markdown code fences
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        try {
            return JSON.parse(codeBlockMatch[1].trim()) as T;
        } catch {
            // Ignore
        }
    }

    // Try finding the first { ... } block
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]) as T;
        } catch {
            // Ignore
        }
    }

    return null;
}
