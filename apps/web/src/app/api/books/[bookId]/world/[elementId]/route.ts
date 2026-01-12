import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string; elementId: string }>;
};

// GET single world element
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, elementId } = await params;

        const worldElement = await prisma.worldElement.findUnique({
            where: { id: elementId, bookId },
        });

        if (!worldElement) {
            return NextResponse.json(
                { error: "World element not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(worldElement);
    } catch (error) {
        console.error("Failed to fetch world element:", error);
        return NextResponse.json(
            { error: "Failed to fetch world element" },
            { status: 500 }
        );
    }
}

// PATCH update world element
export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, elementId } = await params;
        const body = await request.json();
        const { name, type, description, imageUrl } = body;

        const worldElement = await prisma.worldElement.update({
            where: { id: elementId, bookId },
            data: {
                ...(name !== undefined && { name }),
                ...(type !== undefined && { type }),
                ...(description !== undefined && { description }),
                ...(imageUrl !== undefined && { imageUrl }),
            },
        });

        return NextResponse.json(worldElement);
    } catch (error) {
        console.error("Failed to update world element:", error);
        return NextResponse.json(
            { error: "Failed to update world element" },
            { status: 500 }
        );
    }
}

// DELETE world element
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId, elementId } = await params;

        await prisma.worldElement.delete({
            where: { id: elementId, bookId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete world element:", error);
        return NextResponse.json(
            { error: "Failed to delete world element" },
            { status: 500 }
        );
    }
}
