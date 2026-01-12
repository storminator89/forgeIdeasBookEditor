import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

// GET all plot points for a book
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;

        const plotPoints = await prisma.plotPoint.findMany({
            where: { bookId },
            orderBy: { orderIndex: "asc" },
            include: {
                characters: {
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
                        chapter: {
                            select: {
                                id: true,
                                title: true,
                                orderIndex: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(plotPoints);
    } catch (error) {
        console.error("Failed to fetch plot points:", error);
        return NextResponse.json(
            { error: "Failed to fetch plot points" },
            { status: 500 }
        );
    }
}

// POST create new plot point
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { title, description, type, characterIds } = body;

        if (!title) {
            return NextResponse.json(
                { error: "Title is required" },
                { status: 400 }
            );
        }

        // Get the highest order index
        const lastPlotPoint = await prisma.plotPoint.findFirst({
            where: { bookId },
            orderBy: { orderIndex: "desc" },
            select: { orderIndex: true },
        });

        const orderIndex = (lastPlotPoint?.orderIndex ?? -1) + 1;

        const plotPoint = await prisma.plotPoint.create({
            data: {
                bookId,
                title,
                description,
                type: type || "event",
                orderIndex,
                ...(Array.isArray(characterIds) && characterIds.length > 0 && {
                    characters: {
                        create: characterIds.map((characterId: string) => ({
                            characterId,
                        })),
                    },
                }),
            },
            include: {
                characters: {
                    include: {
                        character: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(plotPoint, { status: 201 });
    } catch (error) {
        console.error("Failed to create plot point:", error);
        return NextResponse.json(
            { error: "Failed to create plot point" },
            { status: 500 }
        );
    }
}

// PATCH reorder plot points
export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { plotPointIds } = body as { plotPointIds: string[] };

        if (!Array.isArray(plotPointIds)) {
            return NextResponse.json(
                { error: "plotPointIds must be an array" },
                { status: 400 }
            );
        }

        // Update order indexes in a transaction
        await prisma.$transaction(
            plotPointIds.map((id, index) =>
                prisma.plotPoint.update({
                    where: { id, bookId },
                    data: { orderIndex: index },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to reorder plot points:", error);
        return NextResponse.json(
            { error: "Failed to reorder plot points" },
            { status: 500 }
        );
    }
}
