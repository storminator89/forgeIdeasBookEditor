import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

// GET single book with all details
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;

        const book = await prisma.book.findUnique({
            where: { id: bookId },
            include: {
                chapters: {
                    orderBy: { orderIndex: "asc" },
                    select: {
                        id: true,
                        title: true,
                        orderIndex: true,
                        status: true,
                        wordCount: true,
                        summary: true,
                    },
                },
                characters: {
                    orderBy: { name: "asc" },
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        description: true,
                        imageUrl: true,
                    },
                },
                plotPoints: {
                    orderBy: { orderIndex: "asc" },
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        orderIndex: true,
                    },
                },
                worldElements: {
                    orderBy: { name: "asc" },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
                aiSettings: true,
                _count: {
                    select: {
                        chapters: true,
                        characters: true,
                        plotPoints: true,
                        worldElements: true,
                    },
                },
            },
        });

        if (!book) {
            return NextResponse.json(
                { error: "Book not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(book);
    } catch (error) {
        console.error("Failed to fetch book:", error);
        return NextResponse.json(
            { error: "Failed to fetch book" },
            { status: 500 }
        );
    }
}

// PATCH update book
export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { title, author, description, genre, targetAudience, writingStyle, language, coverUrl, hideCoverText } = body;

        const book = await prisma.book.update({
            where: { id: bookId },
            data: {
                ...(title !== undefined && { title }),
                ...(author !== undefined && { author }),
                ...(description !== undefined && { description }),
                ...(genre !== undefined && { genre }),
                ...(targetAudience !== undefined && { targetAudience }),
                ...(writingStyle !== undefined && { writingStyle }),
                ...(language !== undefined && { language }),
                ...(coverUrl !== undefined && { coverUrl }),
                ...(hideCoverText !== undefined && { hideCoverText }),
            },
        });

        return NextResponse.json(book);
    } catch (error) {
        console.error("Failed to update book:", error);
        return NextResponse.json(
            { error: "Failed to update book" },
            { status: 500 }
        );
    }
}

// DELETE book
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;

        await prisma.book.delete({
            where: { id: bookId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete book:", error);
        return NextResponse.json(
            { error: "Failed to delete book" },
            { status: 500 }
        );
    }
}
