import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string; chapterId: string }>;
};

// GET single chapter with full content
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, chapterId } = await params;

        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId, bookId },
            include: {
                imagePlaceholders: {
                    orderBy: { position: "asc" },
                },
                chapterCharacters: {
                    include: {
                        character: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                                description: true,
                                personality: true,
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
                                description: true,
                            },
                        },
                    },
                },
            },
        });

        if (!chapter) {
            return NextResponse.json(
                { error: "Chapter not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(chapter);
    } catch (error) {
        console.error("Failed to fetch chapter:", error);
        return NextResponse.json(
            { error: "Failed to fetch chapter" },
            { status: 500 }
        );
    }
}

// PATCH update chapter
export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, chapterId } = await params;
        const body = await request.json();
        const { title, content, summary, notes, status, characterIds, plotPointIds } = body;

        // Calculate word count if content is provided
        let wordCount: number | undefined;
        if (content !== undefined) {
            // Strip HTML tags and count words
            const textContent = content.replace(/<[^>]*>/g, " ");
            wordCount = textContent.split(/\s+/).filter((word: string) => word.length > 0).length;
        }

        // Update chapter
        const chapter = await prisma.chapter.update({
            where: { id: chapterId, bookId },
            data: {
                ...(title !== undefined && { title }),
                ...(content !== undefined && { content }),
                ...(summary !== undefined && { summary }),
                ...(notes !== undefined && { notes }),
                ...(status !== undefined && { status }),
                ...(wordCount !== undefined && { wordCount }),
            },
        });

        // Update character associations if provided
        if (characterIds !== undefined) {
            // Delete existing associations
            await prisma.chapterCharacter.deleteMany({
                where: { chapterId },
            });
            // Create new associations
            if (Array.isArray(characterIds) && characterIds.length > 0) {
                await prisma.chapterCharacter.createMany({
                    data: characterIds.map((characterId: string) => ({
                        chapterId,
                        characterId,
                    })),
                });
            }
        }

        // Update plot point associations if provided
        if (plotPointIds !== undefined) {
            // Delete existing associations
            await prisma.chapterPlotPoint.deleteMany({
                where: { chapterId },
            });
            // Create new associations
            if (Array.isArray(plotPointIds) && plotPointIds.length > 0) {
                await prisma.chapterPlotPoint.createMany({
                    data: plotPointIds.map((plotPointId: string) => ({
                        chapterId,
                        plotPointId,
                    })),
                });
            }
        }

        return NextResponse.json(chapter);
    } catch (error) {
        console.error("Failed to update chapter:", error);
        return NextResponse.json(
            { error: "Failed to update chapter" },
            { status: 500 }
        );
    }
}

// DELETE chapter
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, chapterId } = await params;

        await prisma.chapter.delete({
            where: { id: chapterId, bookId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete chapter:", error);
        return NextResponse.json(
            { error: "Failed to delete chapter" },
            { status: 500 }
        );
    }
}
