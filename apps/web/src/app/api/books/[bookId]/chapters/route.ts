import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

// GET all chapters for a book
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;

        const chapters = await prisma.chapter.findMany({
            where: { bookId },
            orderBy: { orderIndex: "asc" },
            include: {
                chapterCharacters: {
                    include: {
                        character: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                            },
                        },
                    },
                },
                chapterPlotPoints: {
                    include: {
                        plotPoint: {
                            select: {
                                id: true,
                                title: true,
                                type: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        imagePlaceholders: true,
                    },
                },
            },
        });

        return NextResponse.json(chapters);
    } catch (error) {
        console.error("Failed to fetch chapters:", error);
        return NextResponse.json(
            { error: "Failed to fetch chapters" },
            { status: 500 }
        );
    }
}

// POST create new chapter
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { title, content, summary, notes } = body;

        // Get the highest order index
        const lastChapter = await prisma.chapter.findFirst({
            where: { bookId },
            orderBy: { orderIndex: "desc" },
            select: { orderIndex: true },
        });

        const orderIndex = (lastChapter?.orderIndex ?? -1) + 1;

        const chapter = await prisma.chapter.create({
            data: {
                bookId,
                title: title || `Kapitel ${orderIndex + 1}`,
                content: content || "",
                summary,
                notes,
                orderIndex,
            },
        });

        return NextResponse.json(chapter, { status: 201 });
    } catch (error) {
        console.error("Failed to create chapter:", error);
        return NextResponse.json(
            { error: "Failed to create chapter" },
            { status: 500 }
        );
    }
}

// PATCH reorder chapters
export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { chapterIds } = body as { chapterIds: string[] };

        if (!Array.isArray(chapterIds)) {
            return NextResponse.json(
                { error: "chapterIds must be an array" },
                { status: 400 }
            );
        }

        // Update order indexes in a transaction
        await prisma.$transaction(
            chapterIds.map((id, index) =>
                prisma.chapter.update({
                    where: { id, bookId },
                    data: { orderIndex: index },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to reorder chapters:", error);
        return NextResponse.json(
            { error: "Failed to reorder chapters" },
            { status: 500 }
        );
    }
}
