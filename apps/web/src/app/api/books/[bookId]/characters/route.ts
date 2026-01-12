import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

// GET all characters for a book
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;

        const characters = await prisma.character.findMany({
            where: { bookId },
            orderBy: { name: "asc" },
            include: {
                relationsFrom: {
                    include: {
                        relatedCharacter: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
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
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        chapterCharacters: true,
                    },
                },
            },
        });

        return NextResponse.json(characters);
    } catch (error) {
        console.error("Failed to fetch characters:", error);
        return NextResponse.json(
            { error: "Failed to fetch characters" },
            { status: 500 }
        );
    }
}

// POST create new character
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
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
        } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        const character = await prisma.character.create({
            data: {
                bookId,
                name,
                role: role || "supporting",
                description,
                backstory,
                personality,
                appearance,
                motivation,
                arc,
                notes,
                imageUrl,
            },
        });

        return NextResponse.json(character, { status: 201 });
    } catch (error) {
        console.error("Failed to create character:", error);
        return NextResponse.json(
            { error: "Failed to create character" },
            { status: 500 }
        );
    }
}
