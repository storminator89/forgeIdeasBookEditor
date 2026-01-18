"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Loader2, Download, Book, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toJpeg } from "html-to-image";
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
}: BookPreviewProps) {
    const [currentPage, setCurrentPage] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(true); // Start in fullscreen for better PDF export
    const [loadedContent, setLoadedContent] = useState<Record<string, string>>({});
    const [loadingChapterId, setLoadingChapterId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingEpub, setIsExportingEpub] = useState(false);
    const [isExportingDocx, setIsExportingDocx] = useState(false);
    const bookRef = useRef<HTMLDivElement>(null);

    // Track which chapters we've already fetched to prevent re-fetching
    const fetchedChaptersRef = useRef<Set<string>>(new Set());

    // Helper function to split HTML content into pages
    // Uses conservative approach to prevent text cutoff
    const splitContentIntoPages = useCallback((html: string, charsPerPage: number = 1800): string[] => {
        if (!html || html.trim() === "") return [""];

        const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
        if (!tempDiv) {
            // Server-side fallback - split by paragraph tags
            const pages: string[] = [];
            // Split by closing </p> tags to ensure we never cut mid-paragraph
            const paragraphs = html.split('</p>').map(p => p.trim()).filter(Boolean).map(p => p + '</p>');

            let currentPage = "";
            let currentLength = 0;

            for (const para of paragraphs) {
                const textLength = para.replace(/<[^>]*>/g, '').length;

                if (currentLength + textLength > charsPerPage && currentPage !== "") {
                    pages.push(currentPage);
                    currentPage = para;
                    currentLength = textLength;
                } else {
                    currentPage += para;
                    currentLength += textLength;
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
            // No block elements, just wrap in paragraph
            const text = tempDiv.textContent || "";
            if (text.length <= charsPerPage) {
                return [`<p>${text}</p>`];
            }
            // Split at sentence boundaries for long text
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

        for (const child of children) {
            const childHtml = (child as HTMLElement).outerHTML;
            const childText = (child as HTMLElement).textContent || "";
            const childLength = childText.length;

            // If adding this child would exceed the limit AND we already have content, start new page
            if (currentLength + childLength > charsPerPage && currentPage !== "") {
                pages.push(currentPage);
                currentPage = "";
                currentLength = 0;
            }

            // Add the child to current page
            currentPage += childHtml;
            currentLength += childLength;
        }

        if (currentPage) {
            pages.push(currentPage);
        }

        return pages.length > 0 ? pages : [""];
    }, []);

    // Create pages from chapters - memoized
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
            // Conservative limit to prevent text cutoff at page bottom
            const contentChunks = splitContentIntoPages(chapterContent, 1600);

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

        // Add cover page at the beginning
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
    const hasNext = currentPage < allPages.length - 1;
    const hasPrev = currentPage > 0;

    // Load chapter content when viewing a content page
    useEffect(() => {
        const loadContent = async () => {
            if (
                currentPageData?.type === "content" &&
                currentPageData.chapterId &&
                !fetchedChaptersRef.current.has(currentPageData.chapterId)
            ) {
                // Mark as fetching before we start
                fetchedChaptersRef.current.add(currentPageData.chapterId);
                setLoadingChapterId(currentPageData.chapterId);

                try {
                    const response = await fetch(
                        `/api/books/${bookId}/chapters/${currentPageData.chapterId}`
                    );
                    if (response.ok) {
                        const data = await response.json();
                        setLoadedContent((prev) => ({
                            ...prev,
                            [currentPageData.chapterId]: data.content || "",
                        }));
                    }
                } catch (error) {
                    console.error("Error loading chapter content:", error);
                    // Remove from fetched set on error so we can retry
                    fetchedChaptersRef.current.delete(currentPageData.chapterId);
                } finally {
                    setLoadingChapterId(null);
                }
            }
        };
        loadContent();
    }, [currentPage, bookId, currentPageData?.type, currentPageData?.chapterId]);

    const goToNextPage = () => {
        if (hasNext) setCurrentPage(currentPage + 1);
    };

    const goToPrevPage = () => {
        if (hasPrev) setCurrentPage(currentPage - 1);
    };

    const isLoading = loadingChapterId === currentPageData?.chapterId;

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

    // PDF Export function
    const exportToPdf = async () => {
        if (!bookRef.current || allPages.length === 0) return;

        setIsExporting(true);
        const originalPage = currentPage;

        try {
            // A4 dimensions in mm: 210 x 297
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = 210;
            const pageHeight = 297;

            // Calculate aspect ratio to fit A4 page without distortion (width priority)
            // Original aspect ratio: 500 / 650 = 0.769
            // A4 aspect ratio: 210 / 297 = 0.707
            // We scale to fit width (210mm), height will be determined by ratio
            // But we actually want to fill the page for a "book" feel, letting margins handle it.
            // Since our source is "stubbier" than A4, stretching to full A4 height would distort verticality.
            // Better to fit width and center vertically or just fill. 
            // The user wants "A4 format", usually meaning "Make it big".
            // Let's stick to full page fill for now but ensure padding prevents cutoff.

            // Iterate through all pages
            for (let i = 0; i < allPages.length; i++) {
                setCurrentPage(i);

                // Wait for content to render and fonts to load
                await new Promise(resolve => setTimeout(resolve, 350)); // Slightly longer wait

                if (bookRef.current) {
                    try {
                        const imgData = await toJpeg(bookRef.current, {
                            quality: 0.98, // Higher quality
                            backgroundColor: '#ffffff',
                            pixelRatio: 3, // Higher resolution for A4
                        });

                        if (i > 0) {
                            pdf.addPage();
                        }

                        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
                    } catch (err) {
                        console.error(`Error rendering page ${i}:`, err);
                    }
                }
            }

            // Save PDF
            pdf.save(`${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}_A4.pdf`);

        } catch (error) {
            console.error('PDF export failed:', error);
        } finally {
            setCurrentPage(originalPage);
            setIsExporting(false);
        }
    };

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

            const epubStyles = `
body {
    font-family: "Georgia", "Times New Roman", serif;
    line-height: 1.6;
    margin: 0;
    padding: 1.5rem;
    color: #111111;
}

h1, h2, h3, h4 {
    font-weight: 700;
    margin: 1.2em 0 0.6em;
}

p {
    margin: 0 0 1em;
    text-indent: 1.5em;
}

p:first-of-type {
    text-indent: 0;
}

img {
    max-width: 100%;
    height: auto;
}

blockquote {
    margin: 1em 2em;
    padding-left: 1em;
    border-left: 2px solid #999999;
    color: #555555;
}

.cover {
    text-align: center;
}

.cover-image img {
    display: block;
    max-width: 100%;
    margin: 0 auto;
}

.cover-text {
    margin-top: 2rem;
}

.cover-text h1 {
    margin: 0 0 0.5rem;
}

.cover-text p {
    margin: 0;
    text-indent: 0;
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

    // DOCX Export function
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

            // Helper function to parse HTML and convert to docx paragraphs
            const htmlToParagraphs = (html: string): Paragraph[] => {
                if (!html || html.trim() === "") return [];

                const paragraphs: Paragraph[] = [];

                // Parse HTML
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = html;

                const processNode = (node: Node): TextRun[] => {
                    const runs: TextRun[] = [];

                    if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.textContent || "";
                        if (text.trim()) {
                            runs.push(new TextRun({ text }));
                        }
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as HTMLElement;
                        const tagName = element.tagName.toLowerCase();

                        // Handle different elements
                        if (tagName === "strong" || tagName === "b") {
                            const childText = element.textContent || "";
                            runs.push(new TextRun({ text: childText, bold: true }));
                        } else if (tagName === "em" || tagName === "i") {
                            const childText = element.textContent || "";
                            runs.push(new TextRun({ text: childText, italics: true }));
                        } else if (tagName === "u") {
                            const childText = element.textContent || "";
                            runs.push(new TextRun({ text: childText, underline: {} }));
                        } else if (tagName === "br") {
                            runs.push(new TextRun({ text: "", break: 1 }));
                        } else {
                            // Process child nodes
                            for (const child of Array.from(node.childNodes)) {
                                runs.push(...processNode(child));
                            }
                        }
                    }

                    return runs;
                };

                const processElement = (element: Element) => {
                    const tagName = element.tagName.toLowerCase();

                    if (tagName === "h1") {
                        paragraphs.push(new Paragraph({
                            heading: HeadingLevel.HEADING_1,
                            children: [new TextRun({ text: element.textContent || "", bold: true })],
                            spacing: { before: 400, after: 200 },
                        }));
                    } else if (tagName === "h2") {
                        paragraphs.push(new Paragraph({
                            heading: HeadingLevel.HEADING_2,
                            children: [new TextRun({ text: element.textContent || "", bold: true })],
                            spacing: { before: 300, after: 150 },
                        }));
                    } else if (tagName === "h3") {
                        paragraphs.push(new Paragraph({
                            heading: HeadingLevel.HEADING_3,
                            children: [new TextRun({ text: element.textContent || "", bold: true })],
                            spacing: { before: 200, after: 100 },
                        }));
                    } else if (tagName === "p") {
                        const runs = processNode(element);
                        if (runs.length > 0) {
                            paragraphs.push(new Paragraph({
                                children: runs,
                                spacing: { after: 200 },
                                indent: { firstLine: 720 }, // 0.5 inch indent
                            }));
                        }
                    } else if (tagName === "blockquote") {
                        paragraphs.push(new Paragraph({
                            children: [new TextRun({ text: element.textContent || "", italics: true })],
                            spacing: { before: 200, after: 200 },
                            indent: { left: 720, right: 720 },
                        }));
                    } else if (tagName === "ul" || tagName === "ol") {
                        const listItems = element.querySelectorAll("li");
                        listItems.forEach((li, index) => {
                            const prefix = tagName === "ol" ? `${index + 1}. ` : "• ";
                            paragraphs.push(new Paragraph({
                                children: [new TextRun({ text: prefix + (li.textContent || "") })],
                                indent: { left: 720 },
                                spacing: { after: 100 },
                            }));
                        });
                    } else {
                        // For other elements, try to get text content
                        const text = element.textContent?.trim();
                        if (text) {
                            paragraphs.push(new Paragraph({
                                children: [new TextRun({ text })],
                                spacing: { after: 200 },
                            }));
                        }
                    }
                };

                // Process all top-level elements
                for (const child of Array.from(tempDiv.children)) {
                    processElement(child);
                }

                // If no block elements found, wrap text in paragraph
                if (paragraphs.length === 0 && tempDiv.textContent?.trim()) {
                    paragraphs.push(new Paragraph({
                        children: [new TextRun({ text: tempDiv.textContent })],
                        spacing: { after: 200 },
                    }));
                }

                return paragraphs;
            };

            // Build document sections
            const children: Paragraph[] = [];

            // Title page
            children.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 3000 },
                    children: [
                        new TextRun({
                            text: bookTitle,
                            bold: true,
                            size: 72, // 36pt
                        }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400 },
                    children: [
                        new TextRun({
                            text: author,
                            size: 32, // 16pt
                            italics: true,
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

                // Chapter title
                children.push(
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 600, after: 400 },
                        children: [
                            new TextRun({
                                text: `Kapitel ${i + 1}`,
                                size: 28, // 14pt
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
                            }),
                        ],
                    })
                );

                // Chapter content
                const contentParagraphs = htmlToParagraphs(chapter.content || "");
                children.push(...contentParagraphs);

                // Page break after each chapter (except last)
                if (i < chapterEntries.length - 1) {
                    children.push(new Paragraph({
                        children: [new PageBreak()],
                    }));
                }
            }

            // Create document
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

            // Generate and download
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
                "relative flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-900 dark:to-stone-800 rounded-xl p-8",
                isFullscreen && "fixed inset-0 z-50 rounded-none",
                className
            )}
        >
            {/* Fullscreen Toggle */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10"
                onClick={() => setIsFullscreen(!isFullscreen)}
            >
                {isFullscreen ? (
                    <Minimize2 className="h-5 w-5" />
                ) : (
                    <Maximize2 className="h-5 w-5" />
                )}
            </Button>

            {/* DOCX Export Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-[8.5rem] z-10"
                onClick={exportToDocx}
                disabled={isExporting || isExportingEpub || isExportingDocx}
                title="Als DOCX exportieren (für Lektoren)"
            >
                {isExportingDocx ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <FileText className="h-5 w-5" />
                )}
            </Button>

            {/* EPUB Export Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-24 z-10"
                onClick={exportToEpub}
                disabled={isExporting || isExportingEpub || isExportingDocx}
                title="Als EPUB exportieren"
            >
                {isExportingEpub ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Book className="h-5 w-5" />
                )}
            </Button>

            {/* PDF Export Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-14 z-10"
                onClick={exportToPdf}
                disabled={isExporting || isExportingEpub || isExportingDocx}
                title="Als PDF exportieren"
            >
                {isExporting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Download className="h-5 w-5" />
                )}
            </Button>

            {/* Book */}
            <div
                ref={bookRef}
                className={cn(
                    "relative bg-white dark:bg-stone-950 shadow-2xl transition-all duration-300",
                    "border border-stone-300 dark:border-stone-700",
                    isFullscreen
                        ? "w-[700px] h-[900px]"
                        : "w-[500px] h-[650px]",
                    isExporting && "pdf-export-mode"
                )}
                style={{
                    boxShadow: isFullscreen
                        ? '0 0 0 1px rgba(0,0,0,0.05), 0 20px 50px -10px rgba(0,0,0,0.3)'
                        : '0 0 0 1px rgba(0,0,0,0.05), -1px 3px 6px -1px rgba(0,0,0,0.1), 0 10px 40px -5px rgba(0,0,0,0.25)',
                }}
            >
                {/* Paper Texture Overlay - hide for cover */}
                {currentPageData?.type !== "cover" && (
                    <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.4] mix-blend-multiply paper-texture rounded-[inherit]" />
                )}

                {/* Decorative book spine - hide for cover */}
                {currentPageData?.type !== "cover" && (
                    <>
                        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-stone-300 via-stone-100 to-stone-50 dark:from-stone-800 dark:via-stone-700 dark:to-stone-900 z-[2] rounded-l-[inherit]" style={{ boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.1)' }} />
                        <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-black/5 z-[2]" />
                    </>
                )}

                {/* Cover page - edge-to-edge without spine offset */}
                {currentPageData?.type === "cover" && (
                    <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                        <CoverPage title={currentPageData.title} author={author} coverUrl={coverUrl} hideCoverText={hideCoverText} />
                    </div>
                )}

                {/* Page content - with spine offset for non-cover pages */}
                {currentPageData?.type !== "cover" && (
                    <div className="absolute inset-0 left-6 overflow-hidden bg-[#fffdf8] dark:bg-[#1a1a1a] rounded-r-[inherit]">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : null}

                        {/* Chapter title view */}
                        {currentPageData?.type === "title" && (
                            <ChapterTitlePage
                                chapterNumber={currentPageData.chapterNumber}
                                title={currentPageData.title}
                                isExporting={isExporting}
                            />
                        )}

                        {currentPageData?.type === "content" && (
                            <ContentPage
                                content={currentPageData.content}
                                chapterNumber={currentPageData.chapterNumber}
                                pageNumber={currentPageData.contentPageIndex + 1}
                            />
                        )}
                    </div>
                )}

                {/* Page number */}
                {currentPageData?.type !== "cover" && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-stone-400 dark:text-stone-600 font-serif z-10">
                        {currentPage}
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-6">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPrevPage}
                    disabled={!hasPrev}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>

                <span className="text-sm text-muted-foreground min-w-[100px] text-center">
                    Seite {currentPage + 1} von {allPages.length}
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

            {/* Chapter list */}
            <div className="flex gap-2 mt-4 flex-wrap justify-center max-w-lg">
                {chapters.map((chapter, idx) => {
                    const chapterPageIndex = 1 + idx * 2;
                    const isActive = currentPageData?.chapterId === chapter.id;

                    return (
                        <button
                            key={chapter.id}
                            onClick={() => setCurrentPage(chapterPageIndex)}
                            className={cn(
                                "px-3 py-1 text-xs rounded-full transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
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
                {/* Overlay with title - only show if not hidden */}
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
        <div className="h-full flex flex-col items-center justify-center p-12 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            {/* Decorative border */}
            <div className="absolute inset-8 border-2 border-amber-300/50 dark:border-amber-700/30 rounded" />
            <div className="absolute inset-10 border border-amber-200/50 dark:border-amber-800/20 rounded" />

            {/* Ornament top */}
            <div className="text-4xl text-amber-400/60 dark:text-amber-600/40 mb-8">❦</div>

            {/* Title */}
            <h1 className="text-4xl font-serif font-bold text-center text-stone-800 dark:text-stone-200 leading-tight mb-6">
                {title}
            </h1>

            {/* Decorative line */}
            <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mb-6" />

            {/* Author */}
            <p className="text-lg font-serif italic text-stone-600 dark:text-stone-400">
                {author}
            </p>

            {/* Ornament bottom */}
            <div className="text-4xl text-amber-400/60 dark:text-amber-600/40 mt-auto mb-8">❧</div>
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
        <div className="h-full flex flex-col items-center justify-center p-12 text-center chapter-title-page">
            <div
                className="mb-6 mx-auto w-16 border-t-2 border-stone-300 dark:border-stone-700 chapter-line"
                style={forcedStyle}
            />

            {/* Chapter number */}
            <p
                className="text-base font-bold uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400 mb-8 font-serif chapter-number"
                style={forcedTextStyle}
            >
                KAPITEL {toRomanNumerals(chapterNumber)}
            </p>

            {/* Chapter title */}
            <h2
                className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-50 leading-tight mb-12 max-w-lg chapter-title"
                style={forcedTextStyle}
            >
                {title}
            </h2>

            {/* Decorative ornament */}
            <div
                className="text-3xl text-stone-300 dark:text-stone-600 chapter-ornament"
                style={forcedTextStyle}
            >
                ❦
            </div>

            <div
                className="mt-6 mx-auto w-16 border-t-2 border-stone-300 dark:border-stone-700 chapter-line"
                style={forcedStyle}
            />
        </div>
    );
}

// Content Page Component
function ContentPage({
    content,
    chapterNumber,
    pageNumber,
}: {
    content: string;
    chapterNumber: number;
    pageNumber: number;
}) {
    return (
        <div className="h-full flex flex-col p-8 pt-4 overflow-hidden">
            {/* Header - subtle chapter indicator */}
            <div className="flex justify-between items-center text-xs text-stone-400 dark:text-stone-500 font-serif italic mb-3 border-b border-stone-200/50 dark:border-stone-700/50 pb-2">
                <span className="tracking-wide">Kapitel {chapterNumber}</span>
            </div>

            {/* Content - optimized spacing for better page fill */}
            <div
                className="flex-1 overflow-hidden book-content pb-8"
                dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* Book styling for content */}
            <style jsx global>{`
                .book-content {
                    font-family: var(--font-crimson-pro), "Georgia", "Times New Roman", serif;
                    font-size: 15px;
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
                    margin-bottom: 0.85em;
                    text-indent: 1.5em;
                    text-align: justify;
                }

                .book-content p:first-of-type {
                    text-indent: 0;
                }

                .book-content p:first-of-type::first-letter {
                    float: left;
                    font-size: 3.5em;
                    line-height: 0.85;
                    padding-right: 0.08em;
                    padding-top: 0.05em;
                    font-weight: 600;
                    color: #b45309;
                    font-family: var(--font-crimson-pro), serif;
                }

                html.dark .book-content p:first-of-type::first-letter {
                    color: #f59e0b;
                }

                .book-content h1,
                .book-content h2,
                .book-content h3 {
                    font-family: var(--font-crimson-pro), serif;
                    font-weight: 700;
                    margin-top: 0.5em; /* Reduced from 1.5em */
                    margin-bottom: 0.5em;
                    text-indent: 0;
                }

                .book-content h1 {
                    font-size: 1.75em;
                }

                .book-content h2 {
                    font-size: 1.5em;
                }

                .book-content h3 {
                    font-size: 1.25em;
                }

                .book-content blockquote {
                    margin: 1.5em 2em;
                    padding-left: 1em;
                    border-left: 3px solid #d97706;
                    font-style: italic;
                    color: #6b7280;
                }

                html.dark .book-content blockquote {
                    color: #9ca3af;
                    border-left-color: #d97706;
                }

                /* Professional book image styling */
                .book-content img {
                    height: auto;
                    border-radius: 3px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
                }
                
                /* Small images - right float with text wrap (30%) */
                .book-content img[class*="w-[30%]"],
                .book-content img[class*="w-1/4"],
                .book-content img[class*="max-w-[180px]"],
                .book-content img[class*="max-w-[150px]"] {
                    float: right;
                    clear: right;
                    width: 30% !important;
                    max-width: none !important;
                    margin: 0.5em 0 0.8em 1.2em;
                    shape-outside: margin-box;
                    shape-margin: 0.8em;
                }
                
                /* Medium images - right float with text wrap (45%) */
                .book-content img[class*="w-[45%]"],
                .book-content img[class*="w-1/2"],
                .book-content img[class*="max-w-[280px]"],
                .book-content img[class*="max-w-[300px]"] {
                    float: right;
                    clear: right;
                    width: 45% !important;
                    max-width: none !important;
                    margin: 0.5em 0 0.8em 1.2em;
                    shape-outside: margin-box;
                    shape-margin: 1em;
                }
                
                /* Large/full-width images - centered, no float */
                .book-content img.block,
                .book-content img[class*="mx-auto"],
                .book-content img[class*="clear-both"],
                .book-content img[class*="max-w-full"],
                .book-content img.full-width,
                /* Treat images with just the default class as large */
                .book-content img[class="rounded-lg h-auto shadow-md"] {
                    float: none !important;
                    clear: both !important;
                    display: block !important;
                    max-width: 100% !important;
                    width: 100%;
                    margin: 1.2em auto !important;
                    shape-outside: none !important;
                }
                
                /* Specific legacy alternating float ONLY for images that are NOT marked as large/default */
                /* This effectively disables the auto-float for new images, ensuring control via classes */
                .book-content img:not([class]) {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 1.5em auto;
                }
                
                /* Clearfix after floated content */
                .book-content::after {
                    content: "";
                    display: table;
                    clear: both;
                }
                
                /* Paragraph after images should have no indent */
                .book-content img + p,
                .book-content p:has(img) + p {
                    text-indent: 0;
                }
                
                /* Responsive: smaller screens - stack images */
                @media (max-width: 500px) {
                    .book-content img {
                        float: none !important;
                        display: block !important;
                        max-width: 100% !important;
                        margin: 1em auto !important;
                        shape-outside: none !important;
                    }
                }

                /* Lists */
                .book-content ul,
                .book-content ol {
                    margin: 1em 0;
                    padding-left: 2em;
                    text-indent: 0;
                }

                .book-content li {
                    margin-bottom: 0.5em;
                }

                /* Horizontal rule as decorative divider */
                .book-content hr {
                    border: none;
                    text-align: center;
                    margin: 2em 0;
                }

                .book-content hr::before {
                    content: "❦";
                    font-size: 1.5em;
                    color: #d97706;
                }
                
                /* PDF EXPORT OVERRIDES - FORCE PRINT STYLING */
                .pdf-export-mode {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    box-shadow: none !important;
                    border: none !important;
                    /* Increase bottom padding to prevent cutoff on A4 scaling */
                    padding-bottom: 80px !important;
                }
                
                .pdf-export-mode .book-content {
                    color: #000000 !important;
                }
                
                /* Force white background on all inner containers */
                .pdf-export-mode > div,
                .pdf-export-mode div,
                .pdf-export-mode [class*="bg-"],
                .pdf-export-mode .chapter-title-page,
                .pdf-export-mode [class*="dark:bg-"] {
                    background-color: #ffffff !important;
                    background: #ffffff !important;
                    background-image: none !important;
                }
                
                /* Hide decorative elements in PDF */
                .pdf-export-mode .paper-texture,
                .pdf-export-mode [class*="from-stone"],
                .pdf-export-mode [class*="via-stone"],
                .pdf-export-mode [class*="to-stone"]:not(p):not(span):not(h1):not(h2):not(h3) {
                    opacity: 0 !important;
                    background: transparent !important;
                }
                
                /* Reset header border for print */
                .pdf-export-mode .border-b {
                    border-color: #cccccc !important;
                }
                
                /* Force ALL text to black, overriding Tailwind classes */
                .pdf-export-mode h1,
                .pdf-export-mode h2,
                .pdf-export-mode h3,
                .pdf-export-mode h4,
                .pdf-export-mode h5,
                .pdf-export-mode h6,
                .pdf-export-mode p,
                .pdf-export-mode span,
                .pdf-export-mode div,
                .pdf-export-mode [class*="text-stone-"] {
                    color: #000000 !important;
                    text-shadow: none !important;
                    -webkit-text-fill-color: #000000 !important;
                }
                
                .pdf-export-mode .book-content blockquote {
                    color: #333333 !important;
                    border-left-color: #000000 !important;
                }
                
                /* Ensure image captions/shadows look good in print */
                .pdf-export-mode img {
                    box-shadow: none !important;
                    border: 1px solid #eee !important;
                }
                
                /* Specific overrides for Chapter Title Page in PDF */
                .pdf-export-mode .chapter-title-page .chapter-title,
                .pdf-export-mode .chapter-title-page .chapter-number,
                .pdf-export-mode .chapter-title-page .chapter-ornament {
                    color: #000000 !important;
                }
                
                .pdf-export-mode .chapter-title-page .chapter-line {
                    border-color: #000000 !important;
                }
            `}</style>
        </div>
    );
}

// Utility function to convert number to Roman numerals
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
