import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

interface SearchResult {
    type: "chapter" | "character" | "plotpoint" | "worldelement";
    id: string;
    title: string;
    matchField: string;
    context: string;
    orderIndex?: number;
}

// POST - Search within a book
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { query } = body;

        if (!query || query.trim().length < 2) {
            return NextResponse.json({ results: [] });
        }

        const searchTerm = query.trim().toLowerCase();
        const results: SearchResult[] = [];

        // Helper function to extract context around match
        const extractContext = (text: string, searchTerm: string, maxLength: number = 100): string => {
            if (!text) return "";

            // Strip HTML tags for searching
            const plainText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
            const lowerText = plainText.toLowerCase();
            const matchIndex = lowerText.indexOf(searchTerm.toLowerCase());

            if (matchIndex === -1) return plainText.substring(0, maxLength) + "...";

            // Get context around the match
            const start = Math.max(0, matchIndex - 40);
            const end = Math.min(plainText.length, matchIndex + searchTerm.length + 60);

            let context = "";
            if (start > 0) context += "...";
            context += plainText.substring(start, end);
            if (end < plainText.length) context += "...";

            return context;
        };

        // Search in chapters
        const chapters = await prisma.chapter.findMany({
            where: { bookId },
            select: {
                id: true,
                title: true,
                content: true,
                summary: true,
                notes: true,
                orderIndex: true,
            },
        });

        for (const chapter of chapters) {
            const plainContent = chapter.content?.replace(/<[^>]*>/g, " ") || "";
            const plainSummary = chapter.summary?.replace(/<[^>]*>/g, " ") || "";

            // Search in title
            if (chapter.title?.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: "chapter",
                    id: chapter.id,
                    title: chapter.title,
                    matchField: "Titel",
                    context: chapter.title,
                    orderIndex: chapter.orderIndex,
                });
            }
            // Search in content
            else if (plainContent.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: "chapter",
                    id: chapter.id,
                    title: chapter.title,
                    matchField: "Inhalt",
                    context: extractContext(chapter.content || "", searchTerm),
                    orderIndex: chapter.orderIndex,
                });
            }
            // Search in summary
            else if (plainSummary.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: "chapter",
                    id: chapter.id,
                    title: chapter.title,
                    matchField: "Zusammenfassung",
                    context: extractContext(chapter.summary || "", searchTerm),
                    orderIndex: chapter.orderIndex,
                });
            }
            // Search in notes
            else if (chapter.notes?.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: "chapter",
                    id: chapter.id,
                    title: chapter.title,
                    matchField: "Notizen",
                    context: extractContext(chapter.notes || "", searchTerm),
                    orderIndex: chapter.orderIndex,
                });
            }
        }

        // Search in characters
        const characters = await prisma.character.findMany({
            where: { bookId },
            select: {
                id: true,
                name: true,
                role: true,
                description: true,
                backstory: true,
            },
        });

        for (const character of characters) {
            if (character.name?.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: "character",
                    id: character.id,
                    title: character.name,
                    matchField: "Name",
                    context: `${character.role || ""} - ${character.description?.substring(0, 80) || ""}`,
                });
            } else if (character.description?.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: "character",
                    id: character.id,
                    title: character.name,
                    matchField: "Beschreibung",
                    context: extractContext(character.description, searchTerm),
                });
            } else if (character.backstory?.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: "character",
                    id: character.id,
                    title: character.name,
                    matchField: "Hintergrund",
                    context: extractContext(character.backstory, searchTerm),
                });
            }
        }

        // Search in plot points
        const plotPoints = await prisma.plotPoint.findMany({
            where: { bookId },
            select: {
                id: true,
                title: true,
                description: true,
                type: true,
                orderIndex: true,
            },
        });

        for (const plotPoint of plotPoints) {
            if (plotPoint.title?.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: "plotpoint",
                    id: plotPoint.id,
                    title: plotPoint.title,
                    matchField: "Titel",
                    context: plotPoint.description?.substring(0, 100) || "",
                    orderIndex: plotPoint.orderIndex,
                });
            } else if (plotPoint.description?.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: "plotpoint",
                    id: plotPoint.id,
                    title: plotPoint.title,
                    matchField: "Beschreibung",
                    context: extractContext(plotPoint.description, searchTerm),
                    orderIndex: plotPoint.orderIndex,
                });
            }
        }

        // Search in world elements
        const worldElements = await prisma.worldElement.findMany({
            where: { bookId },
            select: {
                id: true,
                name: true,
                type: true,
                description: true,
            },
        });

        for (const element of worldElements) {
            if (element.name?.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: "worldelement",
                    id: element.id,
                    title: element.name,
                    matchField: "Name",
                    context: `${element.type} - ${element.description?.substring(0, 80) || ""}`,
                });
            } else if (element.description?.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: "worldelement",
                    id: element.id,
                    title: element.name,
                    matchField: "Beschreibung",
                    context: extractContext(element.description, searchTerm),
                });
            }
        }

        // Sort results: chapters first by order, then characters, then rest
        results.sort((a, b) => {
            const typeOrder = { chapter: 0, character: 1, plotpoint: 2, worldelement: 3 };
            if (typeOrder[a.type] !== typeOrder[b.type]) {
                return typeOrder[a.type] - typeOrder[b.type];
            }
            if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
                return a.orderIndex - b.orderIndex;
            }
            return 0;
        });

        // Limit results
        const limitedResults = results.slice(0, 50);

        return NextResponse.json({
            results: limitedResults,
            total: results.length,
            query: searchTerm,
        });

    } catch (error) {
        console.error("Search failed:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
