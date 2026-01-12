import { notFound } from "next/navigation";
import prisma from "@bucherstellung/db";

import BookEditorLayout from "@/components/editor/BookEditorLayout";

type PageProps = {
    params: Promise<{ bookId: string }>;
};

export default async function BookEditorPage({ params }: PageProps) {
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
                },
            },
            characters: {
                orderBy: { name: "asc" },
                select: {
                    id: true,
                    name: true,
                    role: true,
                    description: true,
                    personality: true,
                    backstory: true,
                    appearance: true,
                    motivation: true,
                    arc: true,
                    notes: true,
                    imageUrl: true,
                },
            },
            plotPoints: {
                orderBy: { orderIndex: "asc" },
                select: {
                    id: true,
                    title: true,
                    description: true,
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
                    description: true,
                    imageUrl: true,
                },
            },
            aiSettings: true,
        },
    });

    if (!book) {
        notFound();
    }

    return <BookEditorLayout book={book} />;
}
