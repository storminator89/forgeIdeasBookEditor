import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string; plotId: string }>;
};

// GET single plot point
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, plotId } = await params;

        const plotPoint = await prisma.plotPoint.findUnique({
            where: { id: plotId, bookId },
            include: {
                characters: {
                    include: {
                        character: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                                imageUrl: true,
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

        if (!plotPoint) {
            return NextResponse.json(
                { error: "Plot point not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(plotPoint);
    } catch (error) {
        console.error("Failed to fetch plot point:", error);
        return NextResponse.json(
            { error: "Failed to fetch plot point" },
            { status: 500 }
        );
    }
}

// PATCH update plot point
export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, plotId } = await params;
        const body = await request.json();
        const { title, description, type, characterIds } = body;

        // Update plot point
        const plotPoint = await prisma.plotPoint.update({
            where: { id: plotId, bookId },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(type !== undefined && { type }),
            },
        });

        // Update character associations if provided
        if (characterIds !== undefined) {
            // Delete existing associations
            await prisma.plotCharacter.deleteMany({
                where: { plotPointId: plotId },
            });
            // Create new associations
            if (Array.isArray(characterIds) && characterIds.length > 0) {
                await prisma.plotCharacter.createMany({
                    data: characterIds.map((characterId: string) => ({
                        plotPointId: plotId,
                        characterId,
                    })),
                });
            }
        }

        return NextResponse.json(plotPoint);
    } catch (error) {
        console.error("Failed to update plot point:", error);
        return NextResponse.json(
            { error: "Failed to update plot point" },
            { status: 500 }
        );
    }
}

// DELETE plot point
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, plotId } = await params;

        await prisma.plotPoint.delete({
            where: { id: plotId, bookId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete plot point:", error);
        return NextResponse.json(
            { error: "Failed to delete plot point" },
            { status: 500 }
        );
    }
}
