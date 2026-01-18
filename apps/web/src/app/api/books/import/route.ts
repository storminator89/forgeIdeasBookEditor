import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

// Type for parsed chapter
interface ParsedChapter {
    title: string;
    content: string;
}

// Parse DOCX file
async function parseDocx(buffer: ArrayBuffer): Promise<{ html: string; text: string }> {
    // Convert ArrayBuffer to Buffer for Node.js
    const nodeBuffer = Buffer.from(buffer);
    const result = await mammoth.convertToHtml({ buffer: nodeBuffer });
    const textResult = await mammoth.extractRawText({ buffer: nodeBuffer });
    return {
        html: result.value,
        text: textResult.value,
    };
}

// Parse Markdown to HTML
function parseMarkdown(content: string): string {
    // Simple markdown to HTML conversion
    let html = content
        // Headers
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        // Bold
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.+?)__/g, "<strong>$1</strong>")
        // Italic
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/_(.+?)_/g, "<em>$1</em>")
        // Line breaks - convert double newlines to paragraphs
        .split(/\n\n+/)
        .filter(p => p.trim())
        .map(p => {
            // Don't wrap headers
            if (p.trim().startsWith("<h")) return p;
            return `<p>${p.replace(/\n/g, "<br>")}</p>`;
        })
        .join("\n");

    return html;
}

// Parse plain text to HTML
function parsePlainText(content: string): string {
    return content
        .split(/\n\n+/)
        .filter(p => p.trim())
        .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("\n");
}

// Split content into chapters based on headings
function splitIntoChapters(html: string, text: string): ParsedChapter[] {
    const chapters: ParsedChapter[] = [];

    // Try to split by h1 or h2 tags
    const chapterPattern = /<h[12][^>]*>(.*?)<\/h[12]>/gi;
    const matches = [...html.matchAll(chapterPattern)];

    if (matches.length > 0) {
        // Split by headings
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const title = match[1].replace(/<[^>]*>/g, "").trim();
            const startIndex = match.index! + match[0].length;
            const endIndex = i < matches.length - 1 ? matches[i + 1].index! : html.length;

            let content = html.substring(startIndex, endIndex).trim();

            // Skip chapters with very little content
            const textContent = content.replace(/<[^>]*>/g, "").trim();
            if (textContent.length > 50 || i === matches.length - 1) {
                chapters.push({
                    title: title || `Kapitel ${chapters.length + 1}`,
                    content,
                });
            }
        }

        // Check if there's content before the first heading
        if (matches.length > 0 && matches[0].index! > 100) {
            const preambleContent = html.substring(0, matches[0].index!).trim();
            if (preambleContent.replace(/<[^>]*>/g, "").trim().length > 50) {
                chapters.unshift({
                    title: "Einleitung",
                    content: preambleContent,
                });
            }
        }
    }

    // If no chapters found by headings, try to split by "Kapitel" or "Chapter" keywords
    if (chapters.length === 0) {
        const chapterKeywordPattern = /(?:^|\n)\s*(Kapitel|Chapter)\s*(\d+|[IVXLC]+)?[:\s.-]*(.*?)(?=\n|$)/gi;
        const keywordMatches = [...text.matchAll(chapterKeywordPattern)];

        if (keywordMatches.length > 1) {
            for (let i = 0; i < keywordMatches.length; i++) {
                const match = keywordMatches[i];
                const title = match[3]?.trim() || `Kapitel ${i + 1}`;
                const startPos = match.index! + match[0].length;
                const endPos = i < keywordMatches.length - 1 ? keywordMatches[i + 1].index! : text.length;

                let content = text.substring(startPos, endPos).trim();
                content = parsePlainText(content);

                chapters.push({ title, content });
            }
        }
    }

    // If still no chapters, create a single chapter with all content
    if (chapters.length === 0) {
        chapters.push({
            title: "Kapitel 1",
            content: html,
        });
    }

    return chapters;
}

// POST - Import book from file
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const title = formData.get("title") as string;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Get file type
        const fileName = file.name.toLowerCase();
        let html = "";
        let text = "";

        const buffer = await file.arrayBuffer();

        if (fileName.endsWith(".docx")) {
            const result = await parseDocx(buffer);
            html = result.html;
            text = result.text;
        } else if (fileName.endsWith(".md")) {
            const content = new TextDecoder().decode(buffer);
            text = content;
            html = parseMarkdown(content);
        } else if (fileName.endsWith(".txt")) {
            const content = new TextDecoder().decode(buffer);
            text = content;
            html = parsePlainText(content);
        } else {
            return NextResponse.json(
                { error: "Unsupported file format. Please use .docx, .md, or .txt" },
                { status: 400 }
            );
        }

        // Split into chapters
        const chapters = splitIntoChapters(html, text);

        // Determine book title
        const bookTitle = title?.trim() ||
            file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ") ||
            "Importiertes Buch";

        // Create book with chapters
        const book = await prisma.book.create({
            data: {
                title: bookTitle,
                language: "de",
                chapters: {
                    create: chapters.map((chapter, index) => ({
                        title: chapter.title,
                        content: chapter.content,
                        orderIndex: index,
                        wordCount: chapter.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length,
                        status: "draft",
                    })),
                },
                aiSettings: {
                    create: {},
                },
            },
            include: {
                chapters: true,
            },
        });

        return NextResponse.json({
            book,
            chaptersImported: chapters.length,
            message: `Erfolgreich ${chapters.length} Kapitel importiert.`,
        });

    } catch (error) {
        console.error("Import failed:", error);
        return NextResponse.json(
            { error: "Import fehlgeschlagen" },
            { status: 500 }
        );
    }
}
