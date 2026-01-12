import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

// GET all books
export async function GET() {
  try {
    const books = await prisma.book.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            chapters: true,
            characters: true,
          },
        },
      },
    });
    return NextResponse.json(books);
  } catch (error) {
    console.error("Failed to fetch books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}

// POST create new book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, genre, targetAudience, writingStyle, language } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const book = await prisma.book.create({
      data: {
        title,
        description,
        genre,
        targetAudience,
        writingStyle,
        language: language || "de",
        // Create default AI settings
        aiSettings: {
          create: {},
        },
      },
      include: {
        aiSettings: true,
      },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error("Failed to create book:", error);
    return NextResponse.json(
      { error: "Failed to create book" },
      { status: 500 }
    );
  }
}
