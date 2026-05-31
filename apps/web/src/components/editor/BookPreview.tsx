"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Loader2, Download, Book, FileText, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    PageBreak,
    ImageRun,
} from "docx";

interface Chapter {
    id: string;
    title: string;
    content: string;
    orderIndex: number;
}

interface BookPreviewProps {
    bookId: string;
    bookTitle: string;
    author?: string;
    language?: string;
    coverUrl?: string | null;
    hideCoverText?: boolean;
    chapters: Chapter[];
    className?: string;
    onClose?: () => void;
}

export default function BookPreview({
    bookId,
    bookTitle,
    author = "Autor",
    language = "de",
    coverUrl,
    hideCoverText = false,
    chapters,
    className,
    onClose,
}: BookPreviewProps) {
    const [currentPage, setCurrentPage] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [loadedContent, setLoadedContent] = useState<Record<string, string>>({});
    const [loadingChapterId, setLoadingChapterId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingEpub, setIsExportingEpub] = useState(false);
    const [isExportingDocx, setIsExportingDocx] = useState(false);
    const [viewMode, setViewMode] = useState<"single" | "book">("book");
    const bookRef = useRef<HTMLDivElement>(null);

    // Track which chapters we've already fetched to prevent re-fetching
    const fetchedChaptersRef = useRef<Set<string>>(new Set());

    // Automatically fall back to single page view on narrow screens
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setViewMode("single");
            } else {
                setViewMode("book");
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Helper function to split HTML content into pages
    const splitContentIntoPages = useCallback((html: string, charsPerPage: number = 1800): string[] => {
        if (!html || html.trim() === "") return [""];

        const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
        if (!tempDiv) {
            // Server-side fallback - split by paragraph tags
            const pages: string[] = [];
            const paragraphs = html.split('</p>').map(p => p.trim()).filter(Boolean).map(p => p + '</p>');

            let currentPage = "";
            let currentLength = 0;
            let pageHasImage = false;

            for (const para of paragraphs) {
                const textLength = para.replace(/<[^>]*>/g, '').length;
                const hasImg = para.includes('<img');

                let imgPenalty = 0;
                if (hasImg || pageHasImage) {
                    const isBlock = !para.includes('w-[30%]') && !para.includes('w-[45%]');
                    imgPenalty = isBlock ? 950 : 650;
                }
                const limit = Math.max(300, charsPerPage - imgPenalty);

                if (currentLength + textLength > limit && currentPage !== "") {
                    pages.push(currentPage);
                    currentPage = para;
                    currentLength = textLength;
                    pageHasImage = hasImg;
                } else {
                    currentPage += para;
                    currentLength += textLength;
                    if (hasImg) {
                        pageHasImage = true;
                    }
                }
            }

            if (currentPage) {
                pages.push(currentPage);
            }

            return pages.length > 0 ? pages : [""];
        }

        tempDiv.innerHTML = html;
        const children = Array.from(tempDiv.children);

        if (children.length === 0) {
            const text = tempDiv.textContent || "";
            if (text.length <= charsPerPage) {
                return [`<p>${text}</p>`];
            }
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
            const pages: string[] = [];
            let currentPage = "";

            for (const sentence of sentences) {
                if (currentPage.length + sentence.length > charsPerPage && currentPage) {
                    pages.push(`<p>${currentPage.trim()}</p>`);
                    currentPage = sentence;
                } else {
                    currentPage += sentence;
                }
            }
            if (currentPage) {
                pages.push(`<p>${currentPage.trim()}</p>`);
            }
            return pages.length > 0 ? pages : [""];
        }

        const pages: string[] = [];
        let currentPage = "";
        let currentLength = 0;
        let pageHasImage = false;

        for (const child of children) {
            const childHtml = (child as HTMLElement).outerHTML;
            const childText = (child as HTMLElement).textContent || "";
            const childLength = childText.length;

            const hasImg = child.tagName.toLowerCase() === "img" || child.querySelector("img") !== null;
            let imgPenalty = 0;
            if (hasImg || pageHasImage) {
                const imgEl = child.tagName.toLowerCase() === "img" ? child : child.querySelector("img");
                const isBlock = imgEl?.classList.contains("block") || imgEl?.classList.contains("mx-auto") || !imgEl?.className;
                imgPenalty = isBlock ? 950 : 650;
            }
            const limit = Math.max(300, charsPerPage - imgPenalty);

            if (currentLength + childLength > limit && currentPage !== "") {
                pages.push(currentPage);
                currentPage = "";
                currentLength = 0;
                pageHasImage = false;
            }

            currentPage += childHtml;
            currentLength += childLength;
            if (hasImg) {
                pageHasImage = true;
            }
        }

        if (currentPage) {
            pages.push(currentPage);
        }

        return pages.length > 0 ? pages : [""];
    }, []);

    // Create pages from chapters
    const allPages = useMemo(() => {
        const pages = chapters.flatMap((chapter, chapterIndex) => {
            // Chapter title page
            const titlePage = {
                type: "title" as const,
                chapterId: chapter.id,
                chapterNumber: chapterIndex + 1,
                title: chapter.title,
                content: "",
                contentPageIndex: 0,
                totalContentPages: 1,
            };

            // Split content into multiple pages
            const chapterContent = loadedContent[chapter.id] || chapter.content;
            const contentChunks = splitContentIntoPages(chapterContent, 1500);

            const contentPages = contentChunks.map((chunk, pageIndex) => ({
                type: "content" as const,
                chapterId: chapter.id,
                chapterNumber: chapterIndex + 1,
                title: chapter.title,
                content: chunk,
                contentPageIndex: pageIndex,
                totalContentPages: contentChunks.length,
            }));

            return [titlePage, ...contentPages];
        });

        return [
            {
                type: "cover" as const,
                chapterId: "",
                chapterNumber: 0,
                title: bookTitle,
                content: "",
                contentPageIndex: 0,
                totalContentPages: 1,
            },
            ...pages,
        ];
    }, [chapters, loadedContent, bookTitle, splitContentIntoPages]);

    const currentPageData = allPages[currentPage];

    // Left and Right page calculations for double page view
    const leftPageData = currentPageData;
    const rightPageData = (viewMode === "book" && currentPage + 1 < allPages.length) 
        ? allPages[currentPage + 1] 
        : null;

    // Navigation bounds
    const hasNext = viewMode === "single"
        ? currentPage < allPages.length - 1
        : (currentPage === 0 ? allPages.length > 1 : currentPage + 2 < allPages.length);

    const hasPrev = currentPage > 0;

    // Load chapter content when viewing
    useEffect(() => {
        const loadContentForId = async (id: string) => {
            if (!id || fetchedChaptersRef.current.has(id)) return;
            fetchedChaptersRef.current.add(id);
            setLoadingChapterId(id);

            try {
                const response = await fetch(`/api/books/${bookId}/chapters/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setLoadedContent((prev) => ({
                        ...prev,
                        [id]: data.content || "",
                    }));
                }
            } catch (error) {
                console.error("Error loading chapter content:", error);
                fetchedChaptersRef.current.delete(id);
            } finally {
                setLoadingChapterId(null);
            }
        };

        if (leftPageData?.chapterId) {
            loadContentForId(leftPageData.chapterId);
        }
        if (rightPageData?.chapterId) {
            loadContentForId(rightPageData.chapterId);
        }
    }, [currentPage, bookId, leftPageData?.chapterId, rightPageData?.chapterId, viewMode]);

    const goToNextPage = () => {
        if (!hasNext) return;
        if (viewMode === "single") {
            setCurrentPage(currentPage + 1);
        } else {
            if (currentPage === 0) {
                setCurrentPage(1);
            } else {
                setCurrentPage(currentPage + 2);
            }
        }
    };

    const goToPrevPage = () => {
        if (!hasPrev) return;
        if (viewMode === "single") {
            setCurrentPage(currentPage - 1);
        } else {
            if (currentPage === 1) {
                setCurrentPage(0);
            } else {
                setCurrentPage(Math.max(currentPage - 2, 1));
            }
        }
    };

    const isLoading = loadingChapterId === leftPageData?.chapterId || loadingChapterId === rightPageData?.chapterId;

    const escapeXml = (value: string) =>
        value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

    const slugify = (value: string) => {
        const slug = value.trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
        return slug || "book";
    };

    const resolveUrl = (src: string) => {
        try {
            return new URL(src, window.location.href).toString();
        } catch {
            return src;
        }
    };

    const getMediaType = (contentType: string | null, src: string) => {
        if (contentType && contentType.includes("/")) {
            return contentType.split(";")[0];
        }

        const lowered = src.toLowerCase().split("?")[0];
        if (lowered.endsWith(".png")) return "image/png";
        if (lowered.endsWith(".gif")) return "image/gif";
        if (lowered.endsWith(".webp")) return "image/webp";
        if (lowered.endsWith(".svg")) return "image/svg+xml";
        return "image/jpeg";
    };

    const getExtension = (mediaType: string, src: string) => {
        if (mediaType.includes("png")) return ".png";
        if (mediaType.includes("gif")) return ".gif";
        if (mediaType.includes("webp")) return ".webp";
        if (mediaType.includes("svg")) return ".svg";
        if (mediaType.includes("jpeg")) return ".jpg";
        if (mediaType.includes("jpg")) return ".jpg";

        const match = src.toLowerCase().split("?")[0].match(/\.[a-z0-9]+$/);
        return match ? match[0] : ".jpg";
    };

    // State-of-the-art PDF Export with Copyright, TOC, and Times-Roman Serif font
    const exportToPdf = async () => {
        if (chapters.length === 0) return;

        setIsExporting(true);

        try {
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

            // Helper to preload an image and get its dimensions
            const loadImage = (src: string): Promise<{ dataUrl: string; width: number; height: number } | null> => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                            ctx.drawImage(img, 0, 0);
                            try {
                                const dataUrl = canvas.toDataURL("image/jpeg");
                                resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
                                return;
                            } catch (e) {
                                console.error("Canvas export failed for PDF image preloading:", e);
                            }
                        }
                        resolve({ dataUrl: src, width: img.naturalWidth, height: img.naturalHeight });
                    };
                    img.onerror = () => {
                        resolve(null);
                    };
                    img.src = resolveUrl(src);
                });
            };

            // A4 page parameters with Golden Ratio margins
            const W = 210;
            const H = 297;
            const marginLeft = 30; // Bindungskante (Gutter margin)
            const marginRight = 25;
            const marginTop = 25;
            const marginBottom = 25;
            const contentW = W - marginLeft - marginRight;

            // Typography variables
            const bodySize = 10.5;
            const bodyLeading = 5.2; // space in mm
            const indentFirstLine = 0; // Remove indentations completely for clean modern block paragraphs!
            const paraSpacing = 2.5; // Small elegant vertical gap between paragraphs to distinguish them!

            // ── Fetch all chapter content ──
            const orderedChapters = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex);
            const chapterContents: { title: string; html: string }[] = [];

            for (const ch of orderedChapters) {
                let content = loadedContent[ch.id] || ch.content || "";
                if (!content.trim()) {
                    try {
                        const resp = await fetch(`/api/books/${bookId}/chapters/${ch.id}`);
                        if (resp.ok) {
                            const data = await resp.json();
                            content = data.content || "";
                        }
                    } catch { /* skip */ }
                }
                chapterContents.push({ title: ch.title, html: content });
            }

            // ── Fetch and Preload all images in the book ──
            const imageCache = new Map<string, { dataUrl: string; width: number; height: number }>();
            const allSrcs = new Set<string>();
            for (const ch of chapterContents) {
                const tmp = document.createElement("div");
                tmp.innerHTML = ch.html;
                const images = Array.from(tmp.querySelectorAll("img"));
                for (const img of images) {
                    const src = img.getAttribute("src");
                    if (src) allSrcs.add(src);
                }
            }

            await Promise.all(
                Array.from(allSrcs).map(async (src) => {
                    const data = await loadImage(src);
                    if (data) {
                        imageCache.set(src, data);
                    }
                })
            );

            // HTML parser elements
            type TextRunType = { text: string; bold?: boolean; italic?: boolean };
            type Block =
                | { type: "h1" | "h2" | "h3"; runs: TextRunType[] }
                | { type: "p"; runs: TextRunType[]; indent?: boolean }
                | { type: "quote"; runs: TextRunType[] }
                | { type: "li"; runs: TextRunType[]; ordered?: boolean; index?: number }
                | { type: "hr" }
                | { type: "img"; src: string };

            const parseRuns = (node: Node): TextRunType[] => {
                const runs: TextRunType[] = [];
                if (node.nodeType === Node.TEXT_NODE) {
                    const t = node.textContent || "";
                    if (t) runs.push({ text: t });
                    return runs;
                }
                if (node.nodeType !== Node.ELEMENT_NODE) return runs;
                const el = node as HTMLElement;
                const tag = el.tagName.toLowerCase();
                const childRuns = Array.from(el.childNodes).flatMap(parseRuns);

                if (tag === "strong" || tag === "b") return childRuns.map(r => ({ ...r, bold: true }));
                if (tag === "em" || tag === "i") return childRuns.map(r => ({ ...r, italic: true }));
                if (tag === "br") return [{ text: "\n" }];
                return childRuns;
            };

            const parseHtml = (html: string): Block[] => {
                if (!html.trim()) return [];
                const tmp = document.createElement("div");
                tmp.innerHTML = html;
                const blocks: Block[] = [];

                for (const child of Array.from(tmp.children)) {
                    const tag = child.tagName.toLowerCase();
                    const runs = parseRuns(child);

                    // Check if this element or any of its descendants is an image
                    const imgEl = tag === "img" ? child : child.querySelector("img");
                    if (imgEl) {
                        const src = imgEl.getAttribute("src") || "";
                        if (src) {
                            blocks.push({ type: "img", src });
                            continue;
                        }
                    }

                    if (tag === "h1") blocks.push({ type: "h1", runs });
                    else if (tag === "h2") blocks.push({ type: "h2", runs });
                    else if (tag === "h3") blocks.push({ type: "h3", runs });
                    else if (tag === "blockquote") blocks.push({ type: "quote", runs });
                    else if (tag === "ul") {
                        Array.from(child.querySelectorAll("li")).forEach(li => {
                            blocks.push({ type: "li", runs: parseRuns(li) });
                        });
                    }
                    else if (tag === "ol") {
                        Array.from(child.querySelectorAll("li")).forEach((li, i) => {
                            blocks.push({ type: "li", runs: parseRuns(li), ordered: true, index: i + 1 });
                        });
                    }
                    else if (tag === "hr") blocks.push({ type: "hr" });
                    else if (tag === "p" || tag === "div") blocks.push({ type: "p", runs, indent: true });
                    else {
                        if (runs.length) blocks.push({ type: "p", runs });
                    }
                }
                return blocks;
            };

            const mergeRuns = (runs: TextRunType[]): TextRunType[] => {
                const merged: TextRunType[] = [];
                for (const r of runs) {
                    const last = merged[merged.length - 1];
                    if (last && last.bold === r.bold && last.italic === r.italic) {
                        last.text += r.text;
                    } else {
                        merged.push({ ...r });
                    }
                }
                return merged;
            };

            // ── CHAPTER PAGE CALCULATOR (Dry Run Pass) ──
            // We pre-render the chapters in a temporary PDF to discover starting page numbers.
            const mockPdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            mockPdf.addPage(); // page 2
            mockPdf.addPage(); // page 3
            mockPdf.addPage(); // page 4
            const chapterStartPages: number[] = [];
            
            const renderChapters = async (targetPdf: typeof pdf, startPage: number, isDryRun: boolean) => {
                let y = marginTop;
                let pageNum = startPage;
                const openerPages = new Set<number>();

                const addPage = () => {
                    pageNum++;
                    targetPdf.addPage();
                    
                    if (!isDryRun) {
                        // Centered footer page number
                        targetPdf.setFont("times", "normal");
                        targetPdf.setFontSize(9);
                        targetPdf.setTextColor(140);
                        targetPdf.text(String(pageNum), W / 2, H - 12, { align: "center" });

                        // Running headers (alternating left/right)
                        // Suppressed on chapter start pages!
                        if (!openerPages.has(pageNum)) {
                            const isEven = pageNum % 2 === 0;
                            const headerText = isEven ? bookTitle : currentChapterTitle;
                            
                            targetPdf.setFont("times", "italic");
                            targetPdf.setFontSize(8.5);
                            targetPdf.setTextColor(140);
                            targetPdf.text(headerText, W / 2, marginTop - 10, { align: "center" });
                            
                            targetPdf.setDrawColor(225);
                            targetPdf.setLineWidth(0.25);
                            targetPdf.line(marginLeft, marginTop - 7, W - marginRight, marginTop - 7);
                        }
                        
                        // Reset text color to black for subsequent body text
                        targetPdf.setTextColor(0);
                    }
                    y = marginTop;
                };

                const needSpace = (mm: number) => {
                    if (y + mm > H - marginBottom) {
                        addPage();
                        return true;
                    }
                    return false;
                };

                const renderRuns = (
                    runs: TextRunType[], 
                    x: number, 
                    maxWidth: number, 
                    fontSize: number, 
                    lineH: number, 
                    firstLineIndent?: number,
                    isDropCapParagraph?: boolean
                ) => {
                    runs = mergeRuns(runs);
                    let lineStartX = x;
                    let textBuf = "";
                    let currentStyle = "normal"; // Local variable to track current run style
                    let lineCount = 0;

                    // 1. Pre-calculate drop cap dimensions and strip the first letter from runs
                    let capW = 0;
                    let firstLetter = "";
                    let processedRuns = runs.map(r => ({ ...r }));

                    if (isDropCapParagraph && processedRuns.length > 0) {
                        // Find the first non-empty text run and its first non-whitespace character
                        for (let i = 0; i < processedRuns.length; i++) {
                            const text = processedRuns[i].text;
                            const trimmedIdx = text.search(/\S/);
                            if (trimmedIdx !== -1) {
                                firstLetter = text.charAt(trimmedIdx);
                                processedRuns[i].text = text.slice(0, trimmedIdx) + text.slice(trimmedIdx + 1);
                                
                                if (!isDryRun) {
                                    targetPdf.setFont("times", "bold");
                                    targetPdf.setFontSize(22);
                                    capW = targetPdf.getTextWidth(firstLetter) + 1.5;
                                } else {
                                    // Times-Roman bold at 22pt capital letters are approx 5.5mm wide
                                    capW = 5.5;
                                }
                                break;
                            }
                        }
                    }

                    // 2. Draw the drop cap once at the starting position
                    if (capW > 0 && !isDryRun) {
                        targetPdf.setFont("times", "bold");
                        targetPdf.setFontSize(22);
                        targetPdf.setTextColor(180, 83, 9); // Gold/amber drop cap color
                        targetPdf.text(firstLetter, x, y + 4.5); // Drop cap baseline alignment
                        
                        targetPdf.setFont("times", "normal");
                        targetPdf.setFontSize(fontSize);
                        targetPdf.setTextColor(0);
                    }

                    // 3. Set up indentation for drop cap or first line indent
                    if (capW > 0) {
                        lineStartX = x + capW;
                    } else if (firstLineIndent) {
                        lineStartX = x + firstLineIndent;
                    }

                    const flushLine = () => {
                        if (!textBuf) return;
                        const pageChanged = needSpace(lineH);
                        if (!isDryRun) {
                            if (pageChanged) {
                                // Restore font and style if a page break happened
                                targetPdf.setFont("times", currentStyle);
                                targetPdf.setFontSize(fontSize);
                                targetPdf.setTextColor(0);
                            }
                            targetPdf.text(textBuf, lineStartX, y);
                        }
                        y += lineH;
                        textBuf = "";
                        lineCount++;
                        
                        // Set start X for the next line
                        if (capW > 0 && lineCount < 2) {
                            lineStartX = x + capW; // Indent the first 2 lines for the drop cap
                        } else {
                            lineStartX = x;
                        }
                    };

                    // Ensure color is reset to black at start of runs
                    if (!isDryRun) {
                        targetPdf.setTextColor(0);
                    }

                    for (const run of processedRuns) {
                        currentStyle = run.bold ? "bold" : run.italic ? "italic" : "normal"; // Track current style
                        if (!isDryRun) {
                            targetPdf.setFont("times", currentStyle);
                            targetPdf.setFontSize(fontSize);
                        }

                        const words = run.text.split(/(\s+)/);
                        for (const word of words) {
                            if (word === "\n") {
                                flushLine();
                                continue;
                            }
                            if (!word) continue;

                            const wordW = targetPdf.getTextWidth(word);
                            const currentLineIndent = lineStartX - x;
                            const available = maxWidth - currentLineIndent - (textBuf ? targetPdf.getTextWidth(textBuf) : 0);

                            if (wordW > available && textBuf) {
                                flushLine();
                            }

                            textBuf += word;
                        }
                    }
                    flushLine();
                };

                let currentChapterTitle = "";

                for (let ci = 0; ci < chapterContents.length; ci++) {
                    const ch = chapterContents[ci];
                    currentChapterTitle = ch.title;

                    // Start chapters on a fresh page (except the first)
                    if (ci > 0) {
                        addPage();
                    }
                    
                    chapterStartPages[ci] = pageNum;
                    
                    // Mark current page as chapter start to suppress running header
                    openerPages.add(pageNum);

                    // 1. Centered Chapter Header at 1/3 down the page
                    y = marginTop + 15;

                    if (!isDryRun) {
                        // Roman numerals
                        targetPdf.setFont("times", "bold");
                        targetPdf.setFontSize(10.5);
                        targetPdf.setTextColor(140);
                        targetPdf.text(`K A P I T E L   ${ci + 1}`, W / 2, y, { align: "center" });
                        y += 8;

                        // Gold ornament flourish (drawn as premium vector diamond rule to support standard PDF encoding)
                        targetPdf.setFillColor(180, 83, 9);
                        targetPdf.setDrawColor(180, 83, 9);
                        targetPdf.setLineWidth(0.3);
                        const cx = W / 2;
                        const cy = y;
                        const r = 0.85; // diamond radius
                        targetPdf.triangle(cx, cy - r, cx + r, cy, cx, cy + r, "F");
                        targetPdf.triangle(cx, cy - r, cx - r, cy, cx, cy + r, "F");
                        targetPdf.line(cx - 15, cy, cx - r - 1.5, cy);
                        targetPdf.line(cx + r + 1.5, cy, cx + 15, cy);
                        y += 8;

                        // Clean Chapter Title without "Kapitel X:" prefix if it exists
                        const cleanTitle = ch.title.replace(/^Kapitel\s+\d+:\s*/i, "").trim();
                        targetPdf.setFont("times", "bold");
                        targetPdf.setFontSize(18);
                        targetPdf.setTextColor(30);
                        const titleLines = targetPdf.splitTextToSize(cleanTitle, contentW - 20);
                        targetPdf.text(titleLines, W / 2, y, { align: "center" });
                        y += titleLines.length * 8 + 15; // Gap before text starts
                    } else {
                        const cleanTitle = ch.title.replace(/^Kapitel\s+\d+:\s*/i, "").trim();
                        const titleLines = targetPdf.splitTextToSize(cleanTitle, contentW - 20);
                        y += 8 + 10 + titleLines.length * 8 + 15;
                    }

                    // Reset color to black
                    if (!isDryRun) {
                        targetPdf.setTextColor(0);
                    }

                    // 2. Render Chapter Blocks on the same page!
                    const blocks = parseHtml(ch.html);
                    
                    // Skip the first block if it is a heading and matches the chapter title to avoid duplicate title rendering
                    let startBlockIdx = 0;
                    if (blocks.length > 0 && (blocks[0].type === "h1" || blocks[0].type === "h2" || blocks[0].type === "h3")) {
                        startBlockIdx = 1;
                    }

                    for (let bi = startBlockIdx; bi < blocks.length; bi++) {
                        const block = blocks[bi];

                        if (block.type === "img") {
                            const imgData = imageCache.get(block.src);
                            if (imgData) {
                                const aspect = imgData.width / imgData.height;
                                let imgW = contentW;
                                let imgH = imgW / aspect;

                                if (imgH > 75) {
                                    imgH = 75;
                                    imgW = imgH * aspect;
                                }

                                needSpace(imgH + 5);

                                if (!isDryRun) {
                                    const xOffset = marginLeft + (contentW - imgW) / 2;
                                    const ext = imgData.dataUrl.includes("image/png") ? "PNG" : "JPEG";
                                    try {
                                        targetPdf.addImage(imgData.dataUrl, ext, xOffset, y, imgW, imgH);
                                    } catch (e) {
                                        console.error("Failed to add image to PDF:", e);
                                    }
                                }
                                y += imgH + 5;
                            }
                            continue;
                        }

                        if (block.type === "hr") {
                            needSpace(10);
                            y += 3;
                            if (!isDryRun) {
                                targetPdf.setFillColor(180, 83, 9);
                                targetPdf.setDrawColor(180, 83, 9);
                                targetPdf.setLineWidth(0.3);
                                const cx = W / 2;
                                const cy = y;
                                const r = 0.85;
                                targetPdf.triangle(cx, cy - r, cx + r, cy, cx, cy + r, "F");
                                targetPdf.triangle(cx, cy - r, cx - r, cy, cx, cy + r, "F");
                                targetPdf.line(cx - 15, cy, cx - r - 1.5, cy);
                                targetPdf.line(cx + r + 1.5, cy, cx + 15, cy);
                            }
                            y += 7;
                            continue;
                        }

                        if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
                            const sizes = { h1: 15, h2: 13, h3: 11 };
                            const sz = sizes[block.type];
                            needSpace(sz / 2.2 + bodyLeading);
                            y += sz / 4;
                            if (!isDryRun) {
                                targetPdf.setFont("times", "bold");
                                targetPdf.setFontSize(sz);
                                targetPdf.setTextColor(30);
                            }
                            const text = block.runs.map(r => r.text).join("");
                            const splitLines = targetPdf.splitTextToSize(text, contentW);
                            for (const line of splitLines) {
                                needSpace(sz / 2.2);
                                if (!isDryRun) {
                                    targetPdf.text(line, marginLeft, y);
                                }
                                y += sz / 2.2;
                            }
                            if (!isDryRun) {
                                targetPdf.setTextColor(0);
                            }
                            y += 4;
                            continue;
                        }

                        if (block.type === "quote") {
                            const quoteX = marginLeft + 6;
                            const quoteW = contentW - 12;
                            needSpace(bodyLeading);
                            if (!isDryRun) {
                                targetPdf.setDrawColor(180, 83, 9);
                                targetPdf.setLineWidth(0.5);
                                targetPdf.line(marginLeft + 2, y - 3, marginLeft + 2, y + 5);
                            }
                            renderRuns(block.runs, quoteX, quoteW, bodySize - 1, bodyLeading);
                            y += 3;
                            continue;
                        }

                        if (block.type === "li") {
                            const bullet = block.ordered ? `${block.index}. ` : "•  ";
                            const liX = marginLeft + 6;
                            if (!isDryRun) {
                                targetPdf.setFont("times", "normal");
                                targetPdf.setFontSize(bodySize);
                                targetPdf.text(bullet, marginLeft, y);
                            }
                            renderRuns(block.runs, liX, contentW - 6, bodySize, bodyLeading);
                            y += 1;
                            continue;
                        }

                        // Paragraph rendering
                        const isFirstParagraph = bi === 0 && block.type === "p";
                        const doIndent = block.type === "p" && block.indent && !isFirstParagraph;
                        renderRuns(
                            block.runs, 
                            marginLeft, 
                            contentW, 
                            bodySize, 
                            bodyLeading, 
                            doIndent ? indentFirstLine : undefined,
                            isFirstParagraph
                        );
                        y += paraSpacing;
                    }
                }
                return pageNum;
            };

            // Run dry pass first to discover exact chapter pages starting at page 4
            await renderChapters(mockPdf, 4, true);

            // ── REAL PDF PASS ──
            let realPageNum = 1;
            
            const addRealPage = () => {
                if (realPageNum > 1) pdf.addPage();
                realPageNum++;
            };

            // 1. Cover Page
            addRealPage();
            
            let coverImgData: string | null = null;
            if (coverUrl) {
                try {
                    const resp = await fetch(coverUrl);
                    const blob = await resp.blob();
                    const reader = new FileReader();
                    coverImgData = await new Promise<string>((resolve, reject) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch { /* skip */ }
            }

            if (coverImgData) {
                try {
                    const img = new Image();
                    img.src = coverImgData;
                    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
                    const imgAspect = img.width / img.height;
                    const imgW = contentW;
                    const imgH = imgW / imgAspect;
                    const imgY = (H - imgH) / 2;
                    const ext = coverImgData.includes("image/png") ? "PNG" : "JPEG";
                    pdf.addImage(coverImgData, ext, marginLeft, imgY, imgW, imgH);

                    if (!hideCoverText) {
                        pdf.setDrawColor(255);
                        pdf.setFillColor(255, 255, 255);
                        pdf.rect(marginLeft, imgY + imgH - 30, imgW, 30, "F");
                        pdf.setFontSize(24);
                        pdf.setFont("times", "bold");
                        pdf.text(bookTitle, W / 2, imgY + imgH - 18, { align: "center" });
                        pdf.setFontSize(13);
                        pdf.setFont("times", "italic");
                        pdf.text(author, W / 2, imgY + imgH - 8, { align: "center" });
                    }
                } catch {
                    coverImgData = null;
                }
            }

            if (!coverImgData) {
                // Fine press clean layout text-only cover
                pdf.setFontSize(30);
                pdf.setFont("times", "bold");
                const titleLines = pdf.splitTextToSize(bookTitle, contentW - 20);
                const titleBlockH = titleLines.length * 12;
                const coverY = (H - titleBlockH) / 2 - 15;
                pdf.text(titleLines, W / 2, coverY, { align: "center" });

                pdf.setDrawColor(180, 83, 9); // Gold accent line
                pdf.setLineWidth(0.4);
                const lineY = coverY + titleBlockH + 6;
                pdf.line(W / 2 - 20, lineY, W / 2 + 20, lineY);

                pdf.setFontSize(14);
                pdf.setFont("times", "italic");
                pdf.setTextColor(80);
                pdf.text(author, W / 2, lineY + 12, { align: "center" });
                pdf.setTextColor(0);
            }

            // 2. Copyright / Imprint Page (Impressum) on page 2
            addRealPage();
            let copyrightY = H / 2 - 40;
            pdf.setFont("times", "bold");
            pdf.setFontSize(14);
            pdf.text(bookTitle, marginLeft, copyrightY);
            copyrightY += 10;
            
            pdf.setFont("times", "normal");
            pdf.setFontSize(9.5);
            pdf.setTextColor(80);
            const copyrightLines = [
                `© ${new Date().getFullYear()} ${author}. Alle Rechte vorbehalten.`,
                "",
                "Dieses Werk, einschließlich aller seiner Teile, ist urheberrechtlich geschützt.",
                "Jede Verwertung außerhalb der engen Grenzen des Urheberrechtsgesetzes ist",
                "ohne schriftliche Zustimmung des Autors unzulässig und strafbar.",
                "",
                "Erstellt und gesetzt in der AI-Bucherstellung App.",
                `Projekt-ID: ${bookId}`,
                `Sprache: ${language === "de" ? "Deutsch" : "Englisch"}`
            ];
            for (const line of copyrightLines) {
                pdf.text(line, marginLeft, copyrightY);
                copyrightY += 6;
            }
            pdf.setTextColor(0);

            // 3. Table of Contents Page (Inhaltsverzeichnis) on page 3
            addRealPage();
            let tocy = marginTop + 15;
            pdf.setFont("times", "bold");
            pdf.setFontSize(18);
            pdf.text("Inhaltsverzeichnis", W / 2, tocy, { align: "center" });
            tocy += 10;
            pdf.setDrawColor(180, 83, 9);
            pdf.setLineWidth(0.3);
            pdf.line(W / 2 - 15, tocy, W / 2 + 15, tocy);
            tocy += 18;

            pdf.setFont("times", "normal");
            pdf.setFontSize(10.5);
            pdf.setTextColor(0, 0, 0);
            
            for (let ci = 0; ci < chapterContents.length; ci++) {
                const ch = chapterContents[ci];
                const pageStr = String(chapterStartPages[ci] || 4);
                const titleText = `Kapitel ${ci + 1}: ${ch.title}`;
                
                const pageW = pdf.getTextWidth(pageStr);
                const titleW = pdf.getTextWidth(titleText);
                
                const dotsSpace = contentW - titleW - pageW - 4;
                let dots = "";
                if (dotsSpace > 0) {
                    const dotW = pdf.getTextWidth(".");
                    const numDots = Math.floor(dotsSpace / dotW);
                    dots = ".".repeat(numDots);
                }

                pdf.setTextColor(0, 0, 0);
                pdf.text(titleText, marginLeft, tocy);
                pdf.text(pageStr, W - marginRight - pageW, tocy);

                // Draw dots
                if (dots) {
                    pdf.setTextColor(150, 150, 150);
                    pdf.text(dots, marginLeft + titleW + 2, tocy);
                    pdf.setTextColor(0, 0, 0);
                }
                
                tocy += 8.5;
            }

            // 4. Render Chapters (Page 4 onwards)
            pdf.addPage(); // Push Chapter 1 opener page to page 4, resolving the Table of Contents overlap bug!
            await renderChapters(pdf, 4, false);

            // ── Add Clickable Table of Contents Links (After all pages are fully created) ──
            pdf.setPage(3); // Switch back to Page 3
            let toclinkY = marginTop + 15 + 10 + 18;
            for (let ci = 0; ci < chapterContents.length; ci++) {
                const targetPage = chapterStartPages[ci] || 4;
                pdf.link(marginLeft, toclinkY - 4.5, contentW, 6, { pageNumber: targetPage });
                toclinkY += 8.5;
            }

            // Save PDF
            const fileName = `${slugify(bookTitle)}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error("PDF export failed:", error);
        } finally {
            setIsExporting(false);
        }
    };

    // State-of-the-art EPUB Export
    const exportToEpub = async () => {
        if (isExporting || isExportingEpub || chapters.length === 0) return;

        setIsExportingEpub(true);

        try {
            const orderedChapters = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex);
            const chapterEntries = await Promise.all(
                orderedChapters.map(async (chapter) => {
                    if (Object.prototype.hasOwnProperty.call(loadedContent, chapter.id)) {
                        return { ...chapter, content: loadedContent[chapter.id] || "" };
                    }

                    if (chapter.content && chapter.content.trim()) {
                        return chapter;
                    }

                    try {
                        const response = await fetch(
                            `/api/books/${bookId}/chapters/${chapter.id}`
                        );
                        if (response.ok) {
                            const data = await response.json();
                            const content = data.content || "";
                            setLoadedContent((prev) => ({
                                ...prev,
                                [chapter.id]: content,
                            }));
                            return { ...chapter, content };
                        }
                    } catch (error) {
                        console.error("Failed to fetch chapter for EPUB:", error);
                    }

                    return { ...chapter, content: chapter.content || "" };
                })
            );

            type ImageAsset = { id: string; href: string; mediaType: string; data: ArrayBuffer };
            const imageAssets: ImageAsset[] = [];
            const imageBySrc = new Map<string, ImageAsset>();

            const registerImage = async (
                src: string,
                nameHint: string,
                idOverride?: string
            ): Promise<ImageAsset | null> => {
                if (!src || src.startsWith("data:")) return null;

                const resolved = resolveUrl(src);
                const existing = imageBySrc.get(resolved);
                if (existing) return existing;

                try {
                    const response = await fetch(resolved);
                    if (!response.ok) return null;

                    const blob = await response.blob();
                    const mediaType = getMediaType(
                        blob.type || response.headers.get("content-type"),
                        resolved
                    );
                    const extension = getExtension(mediaType, resolved);
                    const safeName = slugify(nameHint) || `image-${imageAssets.length + 1}`;
                    const href = `images/${safeName}${extension}`;
                    const data = await blob.arrayBuffer();
                    const asset = {
                        id: idOverride ?? `img-${imageAssets.length + 1}`,
                        href,
                        mediaType,
                        data,
                    };

                    imageAssets.push(asset);
                    imageBySrc.set(resolved, asset);
                    return asset;
                } catch (error) {
                    console.error("Failed to fetch image for EPUB:", error);
                    return null;
                }
            };

            const processHtml = async (html: string, chapterIndex: number) => {
                if (typeof DOMParser === "undefined") {
                    return html;
                }

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");
                const images = Array.from(doc.querySelectorAll("img"));

                for (let imgIndex = 0; imgIndex < images.length; imgIndex += 1) {
                    const img = images[imgIndex];
                    const src = img.getAttribute("src");
                    if (!src || src.startsWith("data:")) continue;

                    const asset = await registerImage(
                        src,
                        `chapter-${chapterIndex + 1}-img-${imgIndex + 1}`
                    );
                    if (asset) {
                        img.setAttribute("src", asset.href);
                    }
                }

                // Skip the first heading block in EPUB to avoid duplicate title rendering
                const firstHeading = doc.querySelector("h1, h2, h3");
                if (firstHeading && firstHeading === doc.body.firstElementChild) {
                    firstHeading.remove();
                }

                // Wrap first letter in a professional drop-cap span!
                const firstP = doc.querySelector("p");
                if (firstP && firstP.textContent) {
                    const text = firstP.innerHTML.trim();
                    if (text && !text.startsWith("<")) {
                        const firstChar = text.charAt(0);
                        const rest = text.slice(1);
                        firstP.innerHTML = `<span class="drop-cap">${firstChar}</span>${rest}`;
                    }
                }

                const voidElements = new Set([
                    "area",
                    "base",
                    "br",
                    "col",
                    "embed",
                    "hr",
                    "img",
                    "input",
                    "link",
                    "meta",
                    "param",
                    "source",
                    "track",
                    "wbr",
                ]);

                const serializeNode = (node: ChildNode): string => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        return escapeXml(node.nodeValue || "");
                    }

                    if (node.nodeType !== Node.ELEMENT_NODE) {
                        return "";
                    }

                    const element = node as Element;
                    const tagName = element.tagName.toLowerCase();
                    const attributes = Array.from(element.attributes)
                        .map((attr) => ` ${attr.name}="${escapeXml(attr.value)}"`)
                        .join("");

                    if (voidElements.has(tagName)) {
                        return `<${tagName}${attributes} />`;
                    }

                    const children = Array.from(element.childNodes)
                        .map(serializeNode)
                        .join("");

                    return `<${tagName}${attributes}>${children}</${tagName}>`;
                };

                return Array.from(doc.body.childNodes)
                    .map(serializeNode)
                    .join("");
            };

            const languageTag = (language || "de").trim() || "de";
            const titleText = (bookTitle || "Book").trim() || "Book";
            const authorText = (author || "").trim();

            const zip = new JSZip();
            zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

            const metaInf = zip.folder("META-INF");
            metaInf?.file(
                "container.xml",
                `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
            );

            const oebps = zip.folder("OEBPS");
            if (!oebps) {
                throw new Error("Failed to initialize EPUB folder.");
            }

            // High-fidelity serif ePUB stylesheet
            const epubStyles = `
body {
    font-family: "Georgia", "Times New Roman", serif;
    line-height: 1.65;
    margin: 0;
    padding: 2rem;
    color: #111111;
    background-color: #ffffff;
}

h1, h2, h3, h4 {
    font-weight: 700;
    margin: 1.8em 0 0.8em;
    font-family: "Georgia", serif;
    text-align: center;
}

p {
    margin: 0 0 0.85em; /* Spacious, elegant vertical margins for modern block paragraphs */
    text-indent: 0; /* Remove indents completely to match PDF block paragraphs */
    text-align: justify;
    line-height: 1.75;
}

p:first-of-type, h1 + p, h2 + p, h3 + p, blockquote + p {
    text-indent: 0;
}

.drop-cap {
    float: left;
    font-size: 3.2em;
    line-height: 0.82;
    padding-top: 4px;
    padding-right: 6px;
    font-weight: bold;
    color: #b45309;
}

img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1.5em auto;
}

blockquote {
    margin: 1.5em 2em;
    padding-left: 1.2em;
    border-left: 3px solid #b45309;
    color: #444444;
    font-style: italic;
}

hr {
    border: none;
    height: 1px;
    background: linear-gradient(to right, transparent, #b45309 30%, #b45309 70%, transparent);
    width: 35%;
    margin: 2.5em auto;
}

.cover {
    text-align: center;
    padding: 0;
}

.cover-image img {
    display: block;
    max-width: 100%;
    max-height: 90vh;
    margin: 0 auto;
}

.cover-text {
    margin-top: 3rem;
}

.cover-text h1 {
    margin: 0 0 0.5rem;
    font-size: 2.2em;
}

.cover-text p {
    margin: 0;
    text-indent: 0;
    font-style: italic;
}
`;

            oebps.file("styles.css", epubStyles);

            const coverAsset = coverUrl
                ? await registerImage(coverUrl, "cover", "cover-image")
                : null;

            const chapterFiles: { id: string; href: string; title: string }[] = [];

            for (let index = 0; index < chapterEntries.length; index += 1) {
                const chapter = chapterEntries[index];
                const chapterTitle = chapter.title?.trim() || `Kapitel ${index + 1}`;
                const bodyHtml = await processHtml(chapter.content || "", index);
                const chapterFile = `chapter-${index + 1}.xhtml`;
                const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${escapeXml(languageTag)}">
<head>
  <title>${escapeXml(chapterTitle)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section class="chapter">
    <h1>${escapeXml(chapterTitle)}</h1>
    ${bodyHtml}
  </section>
</body>
</html>`;

                oebps.file(chapterFile, chapterXhtml);
                chapterFiles.push({
                    id: `chapter-${index + 1}`,
                    href: chapterFile,
                    title: chapterTitle,
                });
            }

            const coverTextBlock = authorText
                ? `<div class="cover-text">
  <h1>${escapeXml(titleText)}</h1>
  <p>${escapeXml(authorText)}</p>
</div>`
                : `<div class="cover-text">
  <h1>${escapeXml(titleText)}</h1>
</div>`;

            const coverBody = coverAsset
                ? `<div class="cover-image">
  <img src="${coverAsset.href}" alt="Cover"/>
</div>${hideCoverText ? "" : coverTextBlock}`
                : coverTextBlock;

            const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${escapeXml(languageTag)}">
<head>
  <title>${escapeXml(titleText)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body class="cover">
  ${coverBody}
</body>
</html>`;

            oebps.file("cover.xhtml", coverXhtml);

            const navItems = [
                `<li><a href="cover.xhtml">Cover</a></li>`,
                ...chapterFiles.map(
                    (chapter) => `<li><a href="${chapter.href}">${escapeXml(chapter.title)}</a></li>`
                ),
            ].join("");

            const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${escapeXml(languageTag)}">
<head>
  <title>Inhalt</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Inhalt</h1>
    <ol>
      ${navItems}
    </ol>
  </nav>
</body>
</html>`;

            oebps.file("nav.xhtml", navXhtml);

            const navPoints = [
                { id: "cover", href: "cover.xhtml", label: "Cover" },
                ...chapterFiles.map((chapter) => ({
                    id: chapter.id,
                    href: chapter.href,
                    label: chapter.title,
                })),
            ]
                .map(
                    (item, index) => `
    <navPoint id="${item.id}" playOrder="${index + 1}">
      <navLabel><text>${escapeXml(item.label)}</text></navLabel>
      <content src="${item.href}"/>
    </navPoint>`
                )
                .join("");

            const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(bookId)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(titleText)}</text></docTitle>
  <navMap>${navPoints}
  </navMap>
</ncx>`;

            oebps.file("toc.ncx", tocNcx);

            for (const asset of imageAssets) {
                oebps.file(asset.href, asset.data, { binary: true });
            }

            const manifestEntries: string[] = [
                `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
                `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
                `<item id="css" href="styles.css" media-type="text/css"/>`,
                `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
            ];

            if (coverAsset) {
                manifestEntries.push(
                    `<item id="${coverAsset.id}" href="${coverAsset.href}" media-type="${coverAsset.mediaType}" properties="cover-image"/>`
                );
            }

            for (const chapter of chapterFiles) {
                manifestEntries.push(
                    `<item id="${chapter.id}" href="${chapter.href}" media-type="application/xhtml+xml"/>`
                );
            }

            for (const asset of imageAssets) {
                if (coverAsset && asset.id === coverAsset.id) continue;
                manifestEntries.push(
                    `<item id="${asset.id}" href="${asset.href}" media-type="${asset.mediaType}"/>`
                );
            }

            const spineEntries = [
                `<itemref idref="cover"/>`,
                `<itemref idref="nav" linear="no"/>`,
                ...chapterFiles.map((chapter) => `<itemref idref="${chapter.id}"/>`),
            ];

            const metadataCreator = authorText
                ? `<dc:creator>${escapeXml(authorText)}</dc:creator>`
                : "";
            const modified = new Date().toISOString().split(".")[0] + "Z";
            const coverMeta = coverAsset ? `<meta name="cover" content="cover-image"/>` : "";

            const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(titleText)}</dc:title>
    ${metadataCreator}
    <dc:language>${escapeXml(languageTag)}</dc:language>
    <dc:identifier id="bookid">${escapeXml(bookId)}</dc:identifier>
    <meta property="dcterms:modified">${escapeXml(modified)}</meta>
    ${coverMeta}
  </metadata>
  <manifest>
    ${manifestEntries.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spineEntries.join("\n    ")}
  </spine>
</package>`;

            oebps.file("content.opf", contentOpf);

            const epubBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
            const fileName = `${slugify(titleText)}.epub`;
            const url = URL.createObjectURL(epubBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error("EPUB export failed:", error);
        } finally {
            setIsExportingEpub(false);
        }
    };

    // State-of-the-art DOCX Export with Georgia fonts and clean layout spacing
    const exportToDocx = async () => {
        if (isExporting || isExportingEpub || isExportingDocx || chapters.length === 0) return;

        setIsExportingDocx(true);

        try {
            const orderedChapters = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex);

            // Load all chapter content if not already loaded
            const chapterEntries = await Promise.all(
                orderedChapters.map(async (chapter) => {
                    if (loadedContent[chapter.id]) {
                        return { ...chapter, content: loadedContent[chapter.id] };
                    }
                    if (chapter.content && chapter.content.trim()) {
                        return chapter;
                    }
                    try {
                        const response = await fetch(`/api/books/${bookId}/chapters/${chapter.id}`);
                        if (response.ok) {
                            const data = await response.json();
                            return { ...chapter, content: data.content || "" };
                        }
                    } catch (error) {
                        console.error("Failed to fetch chapter for DOCX:", error);
                    }
                    return chapter;
                })
            );

            const docxImageCache = new Map<string, { data: ArrayBuffer; width: number; height: number; type: "png" | "jpg" | "gif" }>();

            const loadDocxImage = async (src: string): Promise<{ data: ArrayBuffer; width: number; height: number; type: "png" | "jpg" | "gif" } | null> => {
                try {
                    let blob: Blob;
                    let mime = "image/png";
                    let type: "png" | "jpg" | "gif" = "png";

                    if (src.startsWith("data:")) {
                        const parts = src.split(",");
                        mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
                        const bstr = atob(parts[1]);
                        let n = bstr.length;
                        const u8arr = new Uint8Array(n);
                        while (n--) {
                            u8arr[n] = bstr.charCodeAt(n);
                        }
                        blob = new Blob([u8arr], { type: mime });
                    } else {
                        const resolved = resolveUrl(src);
                        const response = await fetch(resolved);
                        if (!response.ok) return null;
                        blob = await response.blob();
                        mime = blob.type || response.headers.get("content-type") || "image/png";
                    }

                    if (mime.includes("jpeg") || mime.includes("jpg")) {
                        type = "jpg";
                    } else if (mime.includes("gif")) {
                        type = "gif";
                    } else {
                        type = "png";
                    }

                    const arrayBuffer = await blob.arrayBuffer();

                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            resolve({
                                data: arrayBuffer,
                                width: img.naturalWidth,
                                height: img.naturalHeight,
                                type
                            });
                        };
                        img.onerror = () => {
                            resolve({
                                data: arrayBuffer,
                                width: 300,
                                height: 200,
                                type
                            });
                        };
                        const url = URL.createObjectURL(blob);
                        img.src = url;
                        img.addEventListener("load", () => URL.revokeObjectURL(url));
                        img.addEventListener("error", () => URL.revokeObjectURL(url));
                    });
                } catch (e) {
                    console.error("Failed to load image for DOCX:", e);
                    return null;
                }
            };

            // Preload all images in the book for DOCX
            const allDocxSrcs = new Set<string>();
            for (const ch of chapterEntries) {
                const tmp = document.createElement("div");
                tmp.innerHTML = ch.content || "";
                const images = Array.from(tmp.querySelectorAll("img"));
                for (const img of images) {
                    const src = img.getAttribute("src");
                    if (src) allDocxSrcs.add(src);
                }
            }

            await Promise.all(
                Array.from(allDocxSrcs).map(async (src) => {
                    const data = await loadDocxImage(src);
                    if (data) {
                        docxImageCache.set(src, data);
                    }
                })
            );

            // HTML parser and converter to docx structures
            const htmlToParagraphs = (html: string): Paragraph[] => {
                if (!html || html.trim() === "") return [];

                const paragraphs: Paragraph[] = [];
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = html;

                const processNode = (node: Node): TextRun[] => {
                    const runs: TextRun[] = [];

                    if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.textContent || "";
                        if (text.trim()) {
                            runs.push(new TextRun({ text, font: "Georgia" }));
                        }
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as HTMLElement;
                        const tagName = element.tagName.toLowerCase();

                        if (tagName === "strong" || tagName === "b") {
                            const childText = element.textContent || "";
                            runs.push(new TextRun({ text: childText, bold: true, font: "Georgia" }));
                        } else if (tagName === "em" || tagName === "i") {
                            const childText = element.textContent || "";
                            runs.push(new TextRun({ text: childText, italics: true, font: "Georgia" }));
                        } else if (tagName === "u") {
                            const childText = element.textContent || "";
                            runs.push(new TextRun({ text: childText, underline: {}, font: "Georgia" }));
                        } else if (tagName === "br") {
                            runs.push(new TextRun({ text: "", break: 1 }));
                        } else {
                            for (const child of Array.from(node.childNodes)) {
                                runs.push(...processNode(child));
                            }
                        }
                    }

                    return runs;
                };

                let isFirstParagraph = true;

                const processElement = (element: Element) => {
                    const tagName = element.tagName.toLowerCase();

                    // Check if this element or any of its descendants is an image
                    const imgEl = tagName === "img" ? element : element.querySelector("img");
                    if (imgEl) {
                        const src = imgEl.getAttribute("src") || "";
                        const imgData = docxImageCache.get(src);
                        if (imgData) {
                            const aspect = imgData.width / imgData.height;
                            let w = imgData.width;
                            let h = imgData.height;
                            if (w > 450) {
                                w = 450;
                                h = w / aspect;
                            }
                            if (h > 300) {
                                h = 300;
                                w = h * aspect;
                            }

                            paragraphs.push(new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new ImageRun({
                                        data: imgData.data,
                                        transformation: {
                                            width: w,
                                            height: h
                                        },
                                        type: imgData.type
                                    })
                                ],
                                spacing: { before: 200, after: 200 }
                            }));
                            return;
                        }
                    }

                    if (tagName === "h1") {
                        paragraphs.push(new Paragraph({
                            heading: HeadingLevel.HEADING_1,
                            children: [new TextRun({ text: element.textContent || "", bold: true, font: "Georgia" })],
                            spacing: { before: 400, after: 200 },
                        }));
                    } else if (tagName === "h2") {
                        paragraphs.push(new Paragraph({
                            heading: HeadingLevel.HEADING_2,
                            children: [new TextRun({ text: element.textContent || "", bold: true, font: "Georgia" })],
                            spacing: { before: 300, after: 150 },
                        }));
                    } else if (tagName === "h3") {
                        paragraphs.push(new Paragraph({
                            heading: HeadingLevel.HEADING_3,
                            children: [new TextRun({ text: element.textContent || "", bold: true, font: "Georgia" })],
                            spacing: { before: 200, after: 100 },
                        }));
                    } else if (tagName === "p") {
                        const runs = processNode(element);
                        if (runs.length > 0) {
                            paragraphs.push(new Paragraph({
                                children: runs,
                                spacing: { line: 360, after: 0 }, // 1.5 line spacing, 0 margins
                                // Suppress indentation on the very first paragraph of the chapter!
                                indent: isFirstParagraph ? undefined : { firstLine: 720 },
                            }));
                            isFirstParagraph = false;
                        }
                    } else if (tagName === "blockquote") {
                        paragraphs.push(new Paragraph({
                            children: [new TextRun({ text: element.textContent || "", italics: true, font: "Georgia" })],
                            spacing: { before: 200, after: 200 },
                            indent: { left: 720, right: 720 },
                        }));
                    } else if (tagName === "ul" || tagName === "ol") {
                        const listItems = element.querySelectorAll("li");
                        listItems.forEach((li, index) => {
                            const prefix = tagName === "ol" ? `${index + 1}. ` : "• ";
                            paragraphs.push(new Paragraph({
                                children: [new TextRun({ text: prefix + (li.textContent || ""), font: "Georgia" })],
                                indent: { left: 720 },
                                spacing: { after: 100 },
                            }));
                        });
                    } else {
                        const text = element.textContent?.trim();
                        if (text) {
                            paragraphs.push(new Paragraph({
                                children: [new TextRun({ text, font: "Georgia" })],
                                spacing: { after: 200 },
                            }));
                        }
                    }
                };

                for (const child of Array.from(tempDiv.children)) {
                    processElement(child);
                }

                if (paragraphs.length === 0 && tempDiv.textContent?.trim()) {
                    paragraphs.push(new Paragraph({
                        children: [new TextRun({ text: tempDiv.textContent, font: "Georgia" })],
                        spacing: { after: 200 },
                    }));
                }

                return paragraphs;
            };

            const children: Paragraph[] = [];

            // Modern minimalist deluxe Title Page
            children.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 3000 },
                    children: [
                        new TextRun({
                            text: bookTitle,
                            bold: true,
                            size: 64, // 32pt
                            font: "Georgia",
                        }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 600 },
                    children: [
                        new TextRun({
                            text: author,
                            size: 28, // 14pt
                            italics: true,
                            font: "Georgia",
                        }),
                    ],
                }),
                new Paragraph({
                    children: [new PageBreak()],
                })
            );

            // Add chapters
            for (let i = 0; i < chapterEntries.length; i++) {
                const chapter = chapterEntries[i];

                children.push(
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 600, after: 200 },
                        children: [
                            new TextRun({
                                text: `Kapitel ${i + 1}`,
                                size: 24, // 12pt
                                font: "Georgia",
                                bold: true,
                            }),
                        ],
                    }),
                    new Paragraph({
                        heading: HeadingLevel.HEADING_2,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 600 },
                        children: [
                            new TextRun({
                                text: chapter.title,
                                bold: true,
                                size: 36, // 18pt
                                font: "Georgia",
                            }),
                        ],
                    })
                );

                const contentParagraphs = htmlToParagraphs(chapter.content || "");
                children.push(...contentParagraphs);

                if (i < chapterEntries.length - 1) {
                    children.push(new Paragraph({
                        children: [new PageBreak()],
                    }));
                }
            }

            // Create document with default styles set globally
            const doc = new Document({
                creator: author,
                title: bookTitle,
                description: `${bookTitle} by ${author}`,
                sections: [
                    {
                        properties: {},
                        children: children,
                    },
                ],
            });

            const blob = await Packer.toBlob(doc);
            const fileName = `${slugify(bookTitle)}.docx`;
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);

        } catch (error) {
            console.error("DOCX export failed:", error);
        } finally {
            setIsExportingDocx(false);
        }
    };

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-900 dark:to-stone-800 rounded-xl p-8 transition-all duration-300",
                isFullscreen && "fixed inset-0 z-50 rounded-none",
                className
            )}
        >
            {/* Top-right controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                {onClose && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onClose}
                        className="gap-1.5 h-9"
                    >
                        <X className="h-4 w-4" />
                        Schließen
                    </Button>
                )}

                {/* View Mode Toggle (only visible on wide desktops) */}
                <div className="hidden lg:flex items-center bg-stone-200/60 dark:bg-stone-850/60 rounded-lg p-0.5 border border-stone-300/40 dark:border-stone-700/40 mr-1 select-none">
                    <Button
                        variant={viewMode === "single" ? "secondary" : "ghost"}
                        size="sm"
                        className="px-3.5 h-8 text-[11px] font-semibold gap-1.5 cursor-pointer rounded-md transition-all"
                        onClick={() => setViewMode("single")}
                        disabled={currentPageData?.type === "cover"}
                    >
                        <FileText className="h-3.5 w-3.5" />
                        Einzelseite
                    </Button>
                    <Button
                        variant={viewMode === "book" ? "secondary" : "ghost"}
                        size="sm"
                        className="px-3.5 h-8 text-[11px] font-semibold gap-1.5 cursor-pointer rounded-md transition-all"
                        onClick={() => setViewMode("book")}
                        disabled={currentPageData?.type === "cover"}
                    >
                        <Book className="h-3.5 w-3.5" />
                        Buchansicht
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                >
                    {isFullscreen ? (
                        <Minimize2 className="h-5 w-5" />
                    ) : (
                        <Maximize2 className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {/* Export Dropdown Menu */}
            <div className="absolute top-4 right-14 lg:right-72 z-10 flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger
                        className={cn(
                            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium h-9",
                            "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 cursor-pointer",
                            "transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            "disabled:pointer-events-none disabled:opacity-50"
                        )}
                        disabled={isExporting || isExportingEpub || isExportingDocx}
                    >
                        {(isExporting || isExportingEpub || isExportingDocx) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        Export
                        <ChevronDown className="h-4 w-4 opacity-70" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={4} className="z-[60]">
                        <DropdownMenuItem onClick={exportToPdf} className="cursor-pointer">
                            <Download className="h-4 w-4 mr-2" />
                            PDF (A4)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToEpub} className="cursor-pointer">
                            <Book className="h-4 w-4 mr-2" />
                            EPUB
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToDocx} className="cursor-pointer">
                            <FileText className="h-4 w-4 mr-2" />
                            DOCX
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Book Box Container */}
            <div
                ref={bookRef}
                className={cn(
                    "relative bg-white dark:bg-stone-950 shadow-2xl transition-all duration-300 select-none",
                    "border border-stone-300 dark:border-stone-700 rounded-xl",
                    isExporting && "pdf-export-mode",
                    // Dynamically double the width when double-page view is active and we are not on the cover
                    viewMode === "book" && currentPageData?.type !== "cover"
                        ? (isFullscreen ? "w-[1300px] h-[850px]" : "w-[960px] h-[640px]")
                        : (isFullscreen ? "w-[650px] h-[850px]" : "w-[480px] h-[640px]")
                )}
                style={{
                    boxShadow: isFullscreen
                        ? '0 0 0 1px rgba(0,0,0,0.05), 0 25px 60px -10px rgba(0,0,0,0.35)'
                        : '0 0 0 1px rgba(0,0,0,0.05), -1px 3px 6px -1px rgba(0,0,0,0.1), 0 12px 45px -5px rgba(0,0,0,0.28)',
                }}
            >
                {/* 3D Page Stack layers behind the book for tactile realism */}
                {currentPageData?.type !== "cover" && viewMode === "book" && (
                    <>
                        <div className="absolute inset-0 top-[2px] bottom-[2px] left-[2px] right-[2px] bg-white/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 rounded-[inherit] shadow-md -z-10 translate-x-[3px] translate-y-[2px] pointer-events-none" />
                        <div className="absolute inset-0 top-[4px] bottom-[4px] left-[4px] right-[4px] bg-white/60 dark:bg-stone-950/60 border border-stone-300 dark:border-stone-900 rounded-[inherit] shadow-sm -z-20 translate-x-[6px] translate-y-[4px] pointer-events-none" />
                    </>
                )}

                {/* Paper texture overlay (hide for cover) */}
                {currentPageData?.type !== "cover" && (
                    <div className="absolute inset-0 pointer-events-none z-[5] opacity-[0.35] mix-blend-multiply paper-texture rounded-[inherit]" />
                )}

                {/* ── RENDERING VIEWS ── */}
                {currentPageData?.type === "cover" ? (
                    /* Cover view - single page */
                    <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                        <CoverPage title={currentPageData.title} author={author} coverUrl={coverUrl} hideCoverText={hideCoverText} />
                    </div>
                ) : (
                    /* Content and chapter title views */
                    <div className="w-full h-full relative">
                        {viewMode === "book" ? (
                            /* DOUBLE PAGE BOOK SPREAD */
                            <div className="flex w-full h-full relative">
                                {/* LEFT PAGE (Even page) */}
                                <div className="flex-1 h-full relative overflow-hidden bg-[#fffdf8] dark:bg-[#1c1c1c] rounded-l-[inherit] border-r border-stone-200 dark:border-stone-800">
                                    {isLoading ? (
                                        <div className="h-full flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : (
                                        renderPage(leftPageData, currentPage, false)
                                    )}

                                    {/* spine shadow wrapping right edge */}
                                    <div className="absolute top-0 right-0 bottom-0 w-8 pointer-events-none z-10 bg-gradient-to-r from-transparent to-black/[0.06] dark:to-black/[0.22]" />
                                </div>

                                {/* RIGHT PAGE (Odd page) */}
                                <div className="flex-1 h-full relative overflow-hidden bg-[#fffdf8] dark:bg-[#1c1c1c] rounded-r-[inherit]">
                                    {isLoading ? (
                                        <div className="h-full flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : (
                                        renderPage(rightPageData, currentPage + 1, true)
                                    )}

                                    {/* spine shadow wrapping left edge */}
                                    <div className="absolute top-0 left-0 bottom-0 w-8 pointer-events-none z-10 bg-gradient-to-l from-transparent to-black/[0.06] dark:to-black/[0.22]" />
                                </div>

                                {/* Decorative book spine divider line */}
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-black/10 dark:bg-white/5 z-20 pointer-events-none" />
                            </div>
                        ) : (
                            /* SINGLE PAGE SCROLL */
                            <div className="absolute inset-0 left-6 overflow-hidden bg-[#fffdf8] dark:bg-[#1c1c1c] rounded-r-[inherit]">
                                {isLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    renderPage(leftPageData, currentPage, false)
                                )}
                                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-stone-300 via-stone-100 to-stone-50 dark:from-stone-800 dark:via-stone-700 dark:to-stone-900 z-[6] rounded-l-[inherit]" style={{ boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.1)' }} />
                                <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-black/5 z-[6]" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-4 mt-6">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPrevPage}
                    disabled={!hasPrev}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>

                <span className="text-sm text-muted-foreground min-w-[120px] text-center font-serif">
                    {viewMode === "single" || currentPage === 0 ? (
                        `Seite ${currentPage + 1} von ${allPages.length}`
                    ) : (
                        `Seiten ${currentPage}–${Math.min(currentPage + 1, allPages.length - 1)} von ${allPages.length - 1}`
                    )}
                </span>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextPage}
                    disabled={!hasNext}
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            {/* Chapter navigation dots */}
            <div className="flex gap-2 mt-4 flex-wrap justify-center max-w-lg">
                {chapters.map((chapter, idx) => {
                    const chapterPageIndex = 1 + idx * 2;
                    const isActive = leftPageData?.chapterId === chapter.id || rightPageData?.chapterId === chapter.id;

                    return (
                        <button
                            key={chapter.id}
                            onClick={() => setCurrentPage(chapterPageIndex)}
                            className={cn(
                                "px-3.5 py-1 text-xs rounded-full transition-colors cursor-pointer select-none font-serif",
                                isActive
                                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            )}
                        >
                            Kap. {idx + 1}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // Dynamic page layout renderer
    function renderPage(pageData: typeof allPages[0] | null, pageIndex: number, isRightPage: boolean) {
        if (!pageData) {
            return (
                <div className="h-full w-full bg-[#fffdf8] dark:bg-[#1c1c1c] flex flex-col items-center justify-center p-12 select-none relative rounded-[inherit]">
                    <div className="text-sm font-serif italic text-stone-300 dark:text-stone-700">Ende des Buches</div>
                </div>
            );
        }

        const showPageNumber = pageData.type === "content";
        const runningHeader = pageData.type === "content" 
            ? (isRightPage ? pageData.title : bookTitle)
            : null;

        return (
            <div className="h-full w-full flex flex-col p-10 pt-6 pb-8 overflow-hidden select-none relative rounded-[inherit] bg-transparent">
                {/* Running Header */}
                {runningHeader && (
                    <div className="flex justify-center items-center text-[10px] text-stone-400 dark:text-stone-500 font-serif tracking-[0.2em] uppercase mb-4 border-b border-stone-200/40 dark:border-stone-850/40 pb-2 z-10 select-none">
                        {runningHeader}
                    </div>
                )}
                {!runningHeader && <div className="h-[21px] mb-4" />}

                {/* Page Content */}
                <div className="flex-1 overflow-hidden select-text z-10">
                    {pageData.type === "title" && (
                        <ChapterTitlePage
                            chapterNumber={pageData.chapterNumber}
                            title={pageData.title}
                            isExporting={isExporting}
                        />
                    )}
                    {pageData.type === "content" && (
                        <div
                            className={cn(
                                "flex-1 overflow-hidden book-content pb-8", 
                                pageData.contentPageIndex === 0 && "has-drop-cap"
                            )}
                            dangerouslySetInnerHTML={{ __html: pageData.content }}
                        />
                    )}
                </div>

                {/* Centered Footers / Page Numbers */}
                {showPageNumber && (
                    <div className="text-[11px] text-stone-400 dark:text-stone-500 font-serif z-10 mt-auto pt-3 flex justify-center select-none">
                        {pageIndex}
                    </div>
                )}
                {!showPageNumber && <div className="h-4 mt-auto pt-3" />}

                {/* Inject high-fidelity typography styles */}
                <style jsx global>{`
                    .book-content {
                        font-family: var(--font-crimson-pro), "Georgia", "Times New Roman", serif;
                        font-size: 14.5px;
                        line-height: 1.85;
                        color: #2d3748;
                        text-align: justify;
                        hyphens: auto;
                        letter-spacing: 0.01em;
                    }

                    html.dark .book-content {
                        color: #e2e8f0;
                    }

                    .book-content p {
                        margin-bottom: 0.85em; /* Spacious, elegant vertical margin between block paragraphs */
                        text-indent: 0; /* Remove indents completely for clean modern block paragraphs */
                        text-align: justify;
                    }

                    /* Elite indentation rules */
                    .book-content > p:first-of-type,
                    .book-content h1 + p,
                    .book-content h2 + p,
                    .book-content h3 + p,
                    .book-content hr + p,
                    .book-content blockquote + p {
                        text-indent: 0 !important;
                    }

                    /* State-of-the-art copper drop cap only on chapter starts */
                    .book-content.has-drop-cap > p:first-of-type::first-letter {
                        float: left;
                        font-size: 3.6em;
                        line-height: 0.82;
                        padding-right: 0.08em;
                        margin-top: 0.05em;
                        font-weight: 700;
                        color: #b45309;
                        font-family: var(--font-crimson-pro), serif;
                    }

                    html.dark .book-content.has-drop-cap > p:first-of-type::first-letter {
                        color: #f59e0b;
                    }

                    .book-content h1,
                    .book-content h2,
                    .book-content h3 {
                        font-family: var(--font-crimson-pro), serif;
                        font-weight: 700;
                        margin-top: 1.2em;
                        margin-bottom: 0.4em;
                        text-indent: 0;
                    }

                    .book-content h1 { font-size: 1.6em; }
                    .book-content h2 { font-size: 1.4em; }
                    .book-content h3 { font-size: 1.2em; }

                    .book-content blockquote {
                        margin: 1.5em 2em;
                        padding-left: 1.2em;
                        border-left: 3px solid #b45309;
                        font-style: italic;
                        color: #5d6778;
                    }

                    html.dark .book-content blockquote {
                        color: #9ca3af;
                    }

                    .book-content img {
                        height: auto;
                        border-radius: 3px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
                    }
                    
                    .book-content img[class*="w-[30%]"] {
                        float: right;
                        clear: right;
                        width: 30% !important;
                        margin: 0.5em 0 0.8em 1.2em;
                    }
                    
                    .book-content img[class*="w-[45%]"] {
                        float: right;
                        clear: right;
                        width: 45% !important;
                        margin: 0.5em 0 0.8em 1.2em;
                    }
                    
                    .book-content img.block,
                    .book-content img[class*="mx-auto"] {
                        float: none !important;
                        clear: both !important;
                        display: block !important;
                        width: 100%;
                        margin: 1.2em auto !important;
                    }
                    
                    .book-content img:not([class]) {
                        max-width: 100%;
                        height: auto;
                        display: block;
                        margin: 1.5em auto;
                    }
                    
                    .book-content::after {
                        content: "";
                        display: table;
                        clear: both;
                    }
                    
                    .book-content img + p {
                        text-indent: 0;
                    }

                    .book-content ul {
                        margin: 1em 0;
                        padding-left: 2em;
                        text-indent: 0;
                        list-style-type: disc;
                    }

                    .book-content ol {
                        margin: 1em 0;
                        padding-left: 2em;
                        text-indent: 0;
                        list-style-type: decimal;
                    }

                    .book-content li {
                        margin-bottom: 0.5em;
                    }

                    .book-content hr {
                        border: none;
                        text-align: center;
                        margin: 2em 0;
                    }

                    .book-content hr::before {
                        content: "❦";
                        font-size: 1.5em;
                        color: #b45309;
                    }
                `}</style>
            </div>
        );
    }
}

// Cover Page Component
function CoverPage({ title, author, coverUrl, hideCoverText }: { title: string; author: string; coverUrl?: string | null; hideCoverText?: boolean }) {
    if (coverUrl) {
        return (
            <div className="h-full w-full relative">
                <img
                    src={coverUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                />
                {!hideCoverText && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8">
                        <h1 className="text-3xl font-serif font-bold text-white leading-tight mb-2 drop-shadow-lg">
                            {title}
                        </h1>
                        <p className="text-lg font-serif italic text-white/80">
                            {author}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col items-center justify-center p-12 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-900 dark:to-stone-950 relative select-none">
            {/* Elegant double-border */}
            <div className="absolute inset-8 border-2 border-amber-300/40 dark:border-amber-700/25 rounded" />
            <div className="absolute inset-10 border border-amber-200/30 dark:border-amber-800/15 rounded" />

            <div className="text-4xl text-amber-500/50 dark:text-amber-600/30 mb-8 select-none">❦</div>

            <h1 className="text-4xl font-serif font-bold text-center text-stone-850 dark:text-stone-150 leading-tight mb-6">
                {title}
            </h1>

            <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mb-6" />

            <p className="text-lg font-serif italic text-stone-600 dark:text-stone-400">
                {author}
            </p>

            <div className="text-4xl text-amber-500/50 dark:text-amber-600/30 mt-auto mb-8 select-none">❧</div>
        </div>
    );
}

// Chapter Title Page Component
function ChapterTitlePage({
    chapterNumber,
    title,
    isExporting,
}: {
    chapterNumber: number;
    title: string;
    isExporting?: boolean;
}) {
    const forcedStyle = isExporting ? { color: '#000000', borderColor: '#000000' } : {};
    const forcedTextStyle = isExporting ? { color: '#000000' } : {};

    return (
        <div className="h-full flex flex-col items-center justify-center p-12 text-center select-none bg-transparent">
            {/* Top vertical space offset */}
            <div className="h-[15%] mb-4" />

            <div
                className="mb-6 mx-auto w-16 border-t border-stone-300 dark:border-stone-800 chapter-line"
                style={forcedStyle}
            />

            <p
                className="text-[11px] font-bold uppercase tracking-[0.3em] text-stone-400 dark:text-stone-500 mb-8 font-serif chapter-number"
                style={forcedTextStyle}
            >
                KAPITEL {toRomanNumerals(chapterNumber)}
            </p>

            <h2
                className="text-3xl font-serif font-bold text-stone-850 dark:text-stone-100 leading-tight mb-12 max-w-lg chapter-title"
                style={forcedTextStyle}
            >
                {title}
            </h2>

            <div
                className="text-2xl text-stone-300 dark:text-stone-700 chapter-ornament mb-6"
                style={forcedTextStyle}
            >
                ❦
            </div>

            <div
                className="mx-auto w-16 border-t border-stone-300 dark:border-stone-800 chapter-line"
                style={forcedStyle}
            />
        </div>
    );
}

// Utility function to convert numbers to Roman numerals
function toRomanNumerals(num: number): string {
    const romanNumerals: [number, string][] = [
        [1000, "M"],
        [900, "CM"],
        [500, "D"],
        [400, "CD"],
        [100, "C"],
        [90, "XC"],
        [50, "L"],
        [40, "XL"],
        [10, "X"],
        [9, "IX"],
        [5, "V"],
        [4, "IV"],
        [1, "I"],
    ];

    let result = "";
    let remaining = num;

    for (const [value, numeral] of romanNumerals) {
        while (remaining >= value) {
            result += numeral;
            remaining -= value;
        }
    }

    return result;
}
