import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

// GET all world elements for a book
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");

        const worldElements = await prisma.worldElement.findMany({
            where: {
                bookId,
                ...(type && { type }),
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json(worldElements);
    } catch (error) {
        console.error("Failed to fetch world elements:", error);
        return NextResponse.json(
            { error: "Failed to fetch world elements" },
            { status: 500 }
        );
    }
}

// POST create new world element
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { name, type, description, imageUrl } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        const worldElement = await prisma.worldElement.create({
            data: {
                bookId,
                name,
                type: type || "location",
                description,
                imageUrl,
            },
        });

        return NextResponse.json(worldElement, { status: 201 });
    } catch (error) {
        console.error("Failed to create world element:", error);
        return NextResponse.json(
            { error: "Failed to create world element" },
            { status: 500 }
        );
    }
}
