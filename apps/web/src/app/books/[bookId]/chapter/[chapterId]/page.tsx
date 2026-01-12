import { notFound } from "next/navigation";
import prisma from "@bucherstellung/db";

import ChapterEditorView from "@/components/editor/ChapterEditorView";

type PageProps = {
    params: Promise<{ bookId: string; chapterId: string }>;
};

export default async function ChapterEditorPage({ params }: PageProps) {
    const { bookId, chapterId } = await params;

    const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId, bookId },
        include: {
            book: {
                select: {
                    id: true,
                    title: true,
                    genre: true,
                    writingStyle: true,
                    targetAudience: true,
                    language: true,
                    aiSettings: true,
                },
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
                        },
                    },
                },
            },
        },
    });

    if (!chapter) {
        notFound();
    }

    // Get all characters, plot points, world elements for selection
    const [allCharacters, allPlotPoints, allWorldElements, chapters] = await Promise.all([
        prisma.character.findMany({
            where: { bookId },
            orderBy: { name: "asc" },
            select: { id: true, name: true, role: true },
        }),
        prisma.plotPoint.findMany({
            where: { bookId },
            orderBy: { orderIndex: "asc" },
            select: { id: true, title: true, type: true },
        }),
        prisma.worldElement.findMany({
            where: { bookId },
            orderBy: { name: "asc" },
            select: { id: true, name: true, type: true },
        }),
        prisma.chapter.findMany({
            where: { bookId },
            orderBy: { orderIndex: "asc" },
            select: { id: true, title: true, orderIndex: true },
        }),
    ]);

    return (
        <ChapterEditorView
            chapter={chapter}
            allCharacters={allCharacters}
            allPlotPoints={allPlotPoints}
            allWorldElements={allWorldElements}
            chapters={chapters}
        />
    );
}
