export interface TextStatistics {
  wordCount: number;
  characterCount: number;
  readingTime: number;
  paragraphCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
}

// Shared by the server and editor so word totals use the same rules everywhere.
export function manuscriptText(html: string): string {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    hellip: "…",
    laquo: "«",
    raquo: "»",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”",
  };
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?\s*>|<\/(?:p|h[1-6]|div|li|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity.startsWith("#")) {
        const code = entity.toLowerCase().startsWith("#x")
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
        return code >= 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }
      return entities[entity.toLowerCase()] ?? match;
    })
    .trim();
}

export function getTextStatistics(html: string): TextStatistics {
  const text = manuscriptText(html);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const sentenceCount = text
    ? Math.max(
        1,
        text.split(/[.!?]+/).filter((sentence) => sentence.trim()).length,
      )
    : 0;
  return {
    wordCount,
    characterCount: text.length,
    readingTime: Math.ceil(wordCount / 225),
    paragraphCount: text
      ? Math.max(
          1,
          text.split(/\n+/).filter((paragraph) => paragraph.trim()).length,
        )
      : 0,
    sentenceCount,
    averageSentenceLength: sentenceCount
      ? Math.round(wordCount / sentenceCount)
      : 0,
  };
}
