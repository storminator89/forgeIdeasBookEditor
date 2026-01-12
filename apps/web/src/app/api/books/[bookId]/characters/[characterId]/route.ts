import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string; characterId: string }>;
};

// GET single character with full details
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, characterId } = await params;

        const character = await prisma.character.findUnique({
            where: { id: characterId, bookId },
            include: {
                relationsFrom: {
                    include: {
                        relatedCharacter: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
                relationsTo: {
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
                chapterCharacters: {
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
                plotInvolvements: {
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
            },
        });

        if (!character) {
            return NextResponse.json(
                { error: "Character not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(character);
    } catch (error) {
        console.error("Failed to fetch character:", error);
        return NextResponse.json(
            { error: "Failed to fetch character" },
            { status: 500 }
        );
    }
}

// PATCH update character
export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, characterId } = await params;
        const body = await request.json();
        const {
            name,
            role,
            description,
            backstory,
            personality,
            appearance,
            motivation,
            arc,
            notes,
            imageUrl,
            relations,
        } = body;

        // Update character
        const character = await prisma.character.update({
            where: { id: characterId, bookId },
            data: {
                ...(name !== undefined && { name }),
                ...(role !== undefined && { role }),
                ...(description !== undefined && { description }),
                ...(backstory !== undefined && { backstory }),
                ...(personality !== undefined && { personality }),
                ...(appearance !== undefined && { appearance }),
                ...(motivation !== undefined && { motivation }),
                ...(arc !== undefined && { arc }),
                ...(notes !== undefined && { notes }),
                ...(imageUrl !== undefined && { imageUrl }),
            },
        });

        // Update relations if provided
        if (relations !== undefined && Array.isArray(relations)) {
            // Delete existing outgoing relations
            await prisma.characterRelation.deleteMany({
                where: { characterId },
            });
            // Create new relations
            if (relations.length > 0) {
                await prisma.characterRelation.createMany({
                    data: relations.map((rel: { relatedCharacterId: string; relationType: string; description?: string }) => ({
                        characterId,
                        relatedCharacterId: rel.relatedCharacterId,
                        relationType: rel.relationType,
                        description: rel.description,
                    })),
                });
            }
        }

        return NextResponse.json(character);
    } catch (error) {
        console.error("Failed to update character:", error);
        return NextResponse.json(
            { error: "Failed to update character" },
            { status: 500 }
        );
    }
}

// DELETE character
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, characterId } = await params;

        await prisma.character.delete({
            where: { id: characterId, bookId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete character:", error);
        return NextResponse.json(
            { error: "Failed to delete character" },
            { status: 500 }
        );
    }
}
