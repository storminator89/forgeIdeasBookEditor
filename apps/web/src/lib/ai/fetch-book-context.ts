import prisma from "@bucherstellung/db";

export interface BookContext {
    book: {
        title: string;
        genre: string | null;
        writingStyle: string | null;
        targetAudience: string | null;
        language: string;
    };
    characters: Array<{
        name: string;
        role: string;
        description: string | null;
        personality: string | null;
    }>;
    plotPoints: Array<{
        title: string;
        description: string | null;
        type: string;
    }>;
    worldElements: Array<{
        name: string;
        type: string;
        description: string | null;
    }>;
    previousChapters: Array<{
        title: string;
        content: string;
        summary: string | null;
        orderIndex: number;
    }>;
    currentChapter: {
        title: string;
        content: string;
        summary: string | null;
        orderIndex: number;
    } | null;
    nextChapters: Array<{
        title: string;
        summary: string | null;
        orderIndex: number;
    }>;
    totalChapterCount: number;
}

/**
 * Fetches the full book context for AI generation.
 * All AI routes should use this to ensure consistent, complete context.
 */
export async function fetchBookContext(
    bookId: string,
    chapterId?: string
): Promise<BookContext> {
    const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: {
            title: true,
            genre: true,
            writingStyle: true,
            targetAudience: true,
            language: true,
        },
    });

    if (!book) {
        throw new Error("Book not found");
    }

    // Fetch all context in parallel
    const [characters, plotPoints, worldElements, totalChapterCount] = await Promise.all([
        prisma.character.findMany({
            where: { bookId },
            select: { name: true, role: true, description: true, personality: true },
        }),
        prisma.plotPoint.findMany({
            where: { bookId },
            orderBy: { orderIndex: "asc" },
            select: { title: true, description: true, type: true },
        }),
        prisma.worldElement.findMany({
            where: { bookId },
            select: { name: true, type: true, description: true },
        }),
        prisma.chapter.count({ where: { bookId } }),
    ]);

    let previousChapters: BookContext["previousChapters"] = [];
    let currentChapter: BookContext["currentChapter"] = null;
    let nextChapters: BookContext["nextChapters"] = [];

    if (!chapterId) {
        // No specific chapter - load ALL chapters as context (for what-if, etc.)
        previousChapters = await prisma.chapter.findMany({
            where: { bookId },
            orderBy: { orderIndex: "asc" },
            select: { title: true, content: true, summary: true, orderIndex: true },
        });
    } else if (chapterId) {
        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            select: { title: true, content: true, summary: true, orderIndex: true },
        });

        if (chapter) {
            currentChapter = chapter;

            previousChapters = await prisma.chapter.findMany({
                where: { bookId, orderIndex: { lt: chapter.orderIndex } },
                orderBy: { orderIndex: "asc" },
                select: { title: true, content: true, summary: true, orderIndex: true },
            });

            nextChapters = await prisma.chapter.findMany({
                where: { bookId, orderIndex: { gt: chapter.orderIndex } },
                orderBy: { orderIndex: "asc" },
                select: { title: true, summary: true, orderIndex: true },
            });
        }
    }

    return {
        book,
        characters,
        plotPoints,
        worldElements,
        previousChapters,
        currentChapter,
        nextChapters,
        totalChapterCount,
    };
}

/**
 * Builds a formatted context string from BookContext for inclusion in AI prompts.
 * This ensures all routes have consistent, complete context.
 */
export function formatContextForPrompt(ctx: BookContext, options?: {
    includePreviousChapterContent?: boolean;
    maxPreviousContentChars?: number;
}): string {
    const {
        includePreviousChapterContent = true,
        maxPreviousContentChars = 200000,
    } = options || {};

    const parts: string[] = [];

    // Book info
    parts.push(`BUCH: "${ctx.book.title}"`);
    if (ctx.book.genre) parts.push(`Genre: ${ctx.book.genre}`);
    if (ctx.book.writingStyle) parts.push(`Schreibstil: ${ctx.book.writingStyle}`);
    if (ctx.book.targetAudience) parts.push(`Zielgruppe: ${ctx.book.targetAudience}`);

    // Characters
    if (ctx.characters.length > 0) {
        parts.push(`\nCHARAKTERE:`);
        for (const c of ctx.characters) {
            let line = `- ${c.name} (${c.role})`;
            if (c.description) line += `: ${c.description}`;
            if (c.personality) line += ` [Persönlichkeit: ${c.personality}]`;
            parts.push(line);
        }
    }

    // Plot points
    if (ctx.plotPoints.length > 0) {
        parts.push(`\nHANDLUNGSSTRANG:`);
        for (const pp of ctx.plotPoints) {
            let line = `- ${pp.title} (${pp.type})`;
            if (pp.description) line += `: ${pp.description}`;
            parts.push(line);
        }
    }

    // World elements
    if (ctx.worldElements.length > 0) {
        parts.push(`\nWELT-ELEMENTE:`);
        for (const we of ctx.worldElements) {
            let line = `- ${we.name} (${we.type})`;
            if (we.description) line += `: ${we.description}`;
            parts.push(line);
        }
    }

    // Previous chapters (or all chapters if no current chapter)
    const chaptersLabel = ctx.currentChapter
        ? `\nVORHERIGE KAPITEL (${ctx.previousChapters.length}):`
        : `\nALLE KAPITEL (${ctx.previousChapters.length}):`;
    if (ctx.previousChapters.length > 0) {
        parts.push(chaptersLabel);
        let totalChars = 0;
        for (const ch of ctx.previousChapters) {
            let entry = `\nKapitel ${ch.orderIndex + 1}: "${ch.title}"`;
            if (ch.summary) {
                entry += `\nZusammenfassung: ${ch.summary}`;
            }
            if (includePreviousChapterContent && ch.content) {
                const plainText = ch.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                if (totalChars + plainText.length <= maxPreviousContentChars) {
                    entry += `\nInhalt: ${plainText}`;
                    totalChars += plainText.length;
                } else if (totalChars < maxPreviousContentChars) {
                    // Partial content for the last chapter
                    const remaining = maxPreviousContentChars - totalChars;
                    entry += `\nInhalt: ${plainText.slice(0, remaining)}...`;
                    totalChars = maxPreviousContentChars;
                }
            }
            parts.push(entry);
        }
    }

    // Current chapter
    if (ctx.currentChapter) {
        parts.push(`\nAKTUELLES KAPITEL: "${ctx.currentChapter.title}" (Kapitel ${ctx.currentChapter.orderIndex + 1})`);
        if (ctx.currentChapter.summary) {
            parts.push(`Geplante Zusammenfassung: ${ctx.currentChapter.summary}`);
        }
    }

    // Next chapters
    if (ctx.nextChapters.length > 0) {
        parts.push(`\NÄCHSTE KAPITEL:`);
        for (const ch of ctx.nextChapters) {
            let entry = `- Kapitel ${ch.orderIndex + 1}: "${ch.title}"`;
            if (ch.summary) entry += ` - ${ch.summary}`;
            parts.push(entry);
        }
    }

    return parts.join("\n");
}
