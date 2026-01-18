"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    Highlighter,
    Minus,
    ImagePlus,
    Loader2,
    Link as LinkIcon,
    Trash2,
    Maximize,
    Minimize,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    className?: string;
    editorClassName?: string;
}

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                "h-8 w-8 p-0",
                isActive && "bg-accent text-accent-foreground"
            )}
        >
            {children}
        </Button>
    );
}

interface ToolbarProps {
    editor: Editor | null;
    onImageClick: () => void;
}

function Toolbar({ editor, onImageClick }: ToolbarProps) {
    if (!editor) return null;

    return (
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
            {/* Undo/Redo */}
            <div className="flex items-center border-r pr-1 mr-1">
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Rückgängig"
                >
                    <Undo className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Wiederholen"
                >
                    <Redo className="h-4 w-4" />
                </ToolbarButton>
            </div>

            {/* Text Formatting */}
            <div className="flex items-center border-r pr-1 mr-1">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    title="Fett"
                >
                    <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    title="Kursiv"
                >
                    <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive("underline")}
                    title="Unterstrichen"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive("strike")}
                    title="Durchgestrichen"
                >
                    <Strikethrough className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    isActive={editor.isActive("highlight")}
                    title="Hervorheben"
                >
                    <Highlighter className="h-4 w-4" />
                </ToolbarButton>
            </div>

            {/* Headings */}
            <div className="flex items-center border-r pr-1 mr-1">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive("heading", { level: 1 })}
                    title="Überschrift 1"
                >
                    <Heading1 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive("heading", { level: 2 })}
                    title="Überschrift 2"
                >
                    <Heading2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive("heading", { level: 3 })}
                    title="Überschrift 3"
                >
                    <Heading3 className="h-4 w-4" />
                </ToolbarButton>
            </div>

            {/* Lists */}
            <div className="flex items-center border-r pr-1 mr-1">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    title="Aufzählungsliste"
                >
                    <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    title="Nummerierte Liste"
                >
                    <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
            </div>

            {/* Block Elements */}
            <div className="flex items-center border-r pr-1 mr-1">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive("blockquote")}
                    title="Zitat"
                >
                    <Quote className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    title="Trennlinie"
                >
                    <Minus className="h-4 w-4" />
                </ToolbarButton>
            </div>

            {/* Image */}
            <div className="flex items-center">
                <ToolbarButton
                    onClick={onImageClick}
                    title="Bild einfügen"
                >
                    <ImagePlus className="h-4 w-4" />
                </ToolbarButton>
            </div>
        </div>
    );
}

export default function RichTextEditor({
    content,
    onChange,
    placeholder = "Beginne mit dem Schreiben...",
    className,
    editorClassName,
}: RichTextEditorProps) {
    const [showImageDialog, setShowImageDialog] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [imageSize, setImageSize] = useState<"large" | "medium" | "small">("large");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const [imageToolbarPos, setImageToolbarPos] = useState<{ top: number; left: number } | null>(null);
    const [, setSelectionUpdateTrigger] = useState(0); // Used to force re-render on selection change

    // Get CSS class based on image size - professional book styling
    const getImageClass = (size: "large" | "medium" | "small") => {
        switch (size) {
            case "small":
                return "float-right clear-right ml-6 mb-4 mt-1 w-[30%] max-w-[180px]";
            case "medium":
                return "float-right clear-right ml-6 mb-4 mt-1 w-[45%] max-w-[280px]";
            case "large":
            default:
                return "block mx-auto my-6 w-full max-w-full clear-both";
        }
    };

    // Handle image click to show edit toolbar
    const handleImageClick = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG' && target.closest('.ProseMirror')) {
            const img = target as HTMLImageElement;
            setSelectedImage(img);
            const rect = img.getBoundingClientRect();
            const editorRect = img.closest('.ProseMirror')?.getBoundingClientRect();
            if (editorRect) {
                setImageToolbarPos({
                    top: rect.top - editorRect.top - 50,
                    left: Math.max(0, rect.left - editorRect.left + rect.width / 2 - 100),
                });
            }
        } else if (!target.closest('.image-edit-toolbar')) {
            setSelectedImage(null);
            setImageToolbarPos(null);
        }
    }, []);

    // Update image size
    const updateSelectedImageSize = (size: "large" | "medium" | "small") => {
        if (selectedImage && editor) {
            const src = selectedImage.getAttribute('src');
            let pos = -1;

            // Find the image node position by scanning the document
            editor.state.doc.descendants((node, p) => {
                if (node.type.name === 'image' && node.attrs.src === src) {
                    pos = p;
                    return false; // Stop iteration
                }
                return true;
            });

            if (pos >= 0) {
                editor.chain()
                    .setNodeSelection(pos)
                    .updateAttributes('image', { class: `rounded-lg h-auto shadow-md ${getImageClass(size)}` })
                    .run();

                // Force a small delay to ensure UI updates if needed, though Tiptap should handle it
                setTimeout(() => {
                    editor.view.focus();
                }, 10);
            }

            setSelectedImage(null);
            setImageToolbarPos(null);
        }
    };

    // Delete selected image
    const deleteSelectedImage = () => {
        if (selectedImage && editor) {
            const src = selectedImage.getAttribute('src');
            let pos = -1;

            editor.state.doc.descendants((node, p) => {
                if (node.type.name === 'image' && node.attrs.src === src) {
                    pos = p;
                    return false;
                }
                return true;
            });

            if (pos >= 0) {
                editor.chain()
                    .setNodeSelection(pos)
                    .deleteSelection()
                    .run();
            }
            setSelectedImage(null);
            setImageToolbarPos(null);
        }
    };

    // Add click listener for images
    useEffect(() => {
        document.addEventListener('click', handleImageClick);
        return () => document.removeEventListener('click', handleImageClick);
    }, [handleImageClick]);
    // Memoize extensions to prevent duplicate extension warnings
    const extensions = useMemo(() => [
        StarterKit.configure({
            heading: {
                levels: [1, 2, 3],
            },
        }),
        Placeholder.configure({
            placeholder,
            emptyEditorClass: "before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none",
        }),
        Highlight,
        Typography,
        Underline,
        // Extended Image extension to support dynamic class attribute
        Image.extend({
            addAttributes() {
                return {
                    ...this.parent?.(),
                    class: {
                        default: 'rounded-lg h-auto shadow-md block mx-auto my-6 w-full max-w-full clear-both',
                        parseHTML: element => element.getAttribute('class'),
                        renderHTML: attributes => {
                            if (!attributes.class) {
                                return {};
                            }
                            return { class: attributes.class };
                        },
                    },
                };
            },
        }).configure({
            allowBase64: true,
        }),
    ], [placeholder]);

    const editor = useEditor({
        immediatelyRender: false,
        extensions,
        content,
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4",
                    "prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
                    "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-blockquote:my-2",
                    "prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic",
                    "prose-strong:font-bold prose-em:italic",
                    "prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto",
                    editorClassName
                ),
            },
            handleDrop: (view, event, slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files.length) {
                    const file = event.dataTransfer.files[0];
                    if (file && file.type.startsWith("image/")) {
                        event.preventDefault();
                        handleFileUpload(file);
                        return true;
                    }
                }
                return false;
            },
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (items) {
                    for (const item of Array.from(items)) {
                        if (item.type.startsWith("image/")) {
                            const file = item.getAsFile();
                            if (file) {
                                event.preventDefault();
                                handleFileUpload(file);
                                return true;
                            }
                        }
                    }
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        onSelectionUpdate: ({ editor }) => {
            // Force re-render to update toolbar active states
            // We can do this by setting a state or using a ref, but mostly React detects changes if we pull state.
            // Since Toolbar uses `editor.isActive(...)` and `editor` object reference is stable, 
            // the Toolbar component might not re-render just because selection changed inside Tiptap.
            // A simple trick is to trigger a state update.
            setSelectionUpdateTrigger(Date.now());
        },
    });

    const handleFileUpload = useCallback(async (file: File) => {
        setIsUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Upload fehlgeschlagen");
            }

            const data = await response.json();

            if (editor && data.url) {
                editor.chain().focus().setImage({
                    src: data.url,
                    alt: "",
                    title: imageSize,
                } as { src: string; alt?: string; title?: string }).run();

                // Apply size class after insertion
                setTimeout(() => {
                    const images = document.querySelectorAll('.ProseMirror img');
                    const lastImage = images[images.length - 1] as HTMLImageElement;
                    if (lastImage) {
                        lastImage.className = `rounded-lg h-auto shadow-md ${getImageClass(imageSize)}`;
                    }
                }, 10);
            }

            setShowImageDialog(false);
            setImageUrl("");
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : "Upload fehlgeschlagen");
        } finally {
            setIsUploading(false);
        }
    }, [editor]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    const handleInsertImageUrl = () => {
        if (editor && imageUrl.trim()) {
            editor.chain().focus().setImage({
                src: imageUrl.trim(),
                alt: "",
                title: imageSize,
            } as { src: string; alt?: string; title?: string }).run();

            // Apply size class after insertion
            setTimeout(() => {
                const images = document.querySelectorAll('.ProseMirror img');
                const lastImage = images[images.length - 1] as HTMLImageElement;
                if (lastImage) {
                    lastImage.className = `rounded-lg h-auto shadow-md ${getImageClass(imageSize)}`;
                }
            }, 10);

            setShowImageDialog(false);
            setImageUrl("");
        }
    };

    // Sync external content changes
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <>
            <div className={cn("rounded-md border bg-background relative", className)}>
                <Toolbar editor={editor} onImageClick={() => setShowImageDialog(true)} />
                <EditorContent editor={editor} />

                {/* Floating Image Edit Toolbar */}
                {selectedImage && imageToolbarPos && (
                    <div
                        className="image-edit-toolbar absolute z-50 bg-background border rounded-lg shadow-lg p-1 flex items-center gap-1"
                        style={{
                            top: `${imageToolbarPos.top}px`,
                            left: `${imageToolbarPos.left}px`,
                        }}
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSelectedImageSize("large")}
                            title="Groß"
                            className="h-8 px-2 text-xs"
                        >
                            <Maximize className="h-3 w-3 mr-1" />
                            Groß
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSelectedImageSize("medium")}
                            title="Mittel"
                            className="h-8 px-2 text-xs"
                        >
                            M
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSelectedImageSize("small")}
                            title="Klein"
                            className="h-8 px-2 text-xs"
                        >
                            <Minimize className="h-3 w-3 mr-1" />
                            Klein
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={deleteSelectedImage}
                            title="Löschen"
                            className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>

            <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Bild einfügen</DialogTitle>
                        <DialogDescription>
                            Lade ein Bild hoch oder füge eine Bild-URL ein.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* File Upload */}
                        <div className="space-y-2">
                            <Label>Bild hochladen</Label>
                            <div
                                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Wird hochgeladen...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Klicken oder Bild hier ablegen
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            JPG, PNG, GIF, WebP • Max. 5MB
                                        </span>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>
                            {uploadError && (
                                <p className="text-sm text-destructive">{uploadError}</p>
                            )}
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Oder
                                </span>
                            </div>
                        </div>

                        {/* Size Selection */}
                        <div className="space-y-2">
                            <Label>Bildgröße</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={imageSize === "large" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setImageSize("large")}
                                    className="flex-1"
                                >
                                    Groß
                                </Button>
                                <Button
                                    type="button"
                                    variant={imageSize === "medium" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setImageSize("medium")}
                                    className="flex-1"
                                >
                                    Mittel
                                </Button>
                                <Button
                                    type="button"
                                    variant={imageSize === "small" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setImageSize("small")}
                                    className="flex-1"
                                >
                                    Klein
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {imageSize === "large"
                                    ? "Volle Breite, kein Textumfluss"
                                    : imageSize === "medium"
                                        ? "50% Breite, Text fließt um das Bild"
                                        : "25% Breite, Text fließt um das Bild"}
                            </p>
                        </div>

                        {/* URL Input */}
                        <div className="space-y-2">
                            <Label htmlFor="imageUrl">Bild-URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="imageUrl"
                                    placeholder="https://beispiel.de/bild.jpg"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleInsertImageUrl();
                                        }
                                    }}
                                />
                                <Button
                                    onClick={handleInsertImageUrl}
                                    disabled={!imageUrl.trim()}
                                >
                                    <LinkIcon className="h-4 w-4 mr-2" />
                                    Einfügen
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                .ProseMirror h1 { font-size: 2rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; line-height: 1.2; }
                .ProseMirror h2 { font-size: 1.5rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; line-height: 1.3; }
                .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; line-height: 1.4; }
                .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
                .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
                .ProseMirror blockquote { border-left: 2px solid var(--primary); padding-left: 1rem; font-style: italic; margin-top: 1rem; margin-bottom: 1rem; }
                .ProseMirror p { margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.6; }
            `}</style>
        </>
    );
}

// Export text statistics utility
export interface TextStatistics {
    wordCount: number;
    characterCount: number;
    readingTime: number; // in minutes
    paragraphCount: number;
    sentenceCount: number;
    averageSentenceLength: number; // words per sentence
}

export function getTextStatistics(html: string): TextStatistics {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const text = doc.body.textContent || "";

    // Word count
    const words = text.trim().split(/\s+/).filter((word) => word.length > 0);
    const wordCount = words.length;

    // Character count (excluding whitespace for a more accurate "content" metric, or including? 
    // Usually purely characters including spaces is standard for limits, but for "Netto" maybe without.
    // Let's go with standard length).
    const characterCount = text.length;

    // Reading time (avg 225 words per minute)
    const readingTime = Math.ceil(wordCount / 225);

    // Paragraph count - counting block elements roughly
    // This is a heuristic. Tiptap usually uses <p>.
    const paragraphs = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li');
    // Filter out empty paragraphs often left by editors
    const nonEmptyParagraphs = Array.from(paragraphs).filter(p => p.textContent?.trim().length ?? 0 > 0);
    const paragraphCount = Math.max(1, nonEmptyParagraphs.length); // At least 1 if there is text, simplistic

    // Sentence count
    // specific punctuation split. roughly.
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;

    // Avg sentence length
    const averageSentenceLength = wordCount > 0 ? Math.round(wordCount / sentenceCount) : 0;

    return {
        wordCount,
        characterCount,
        readingTime,
        paragraphCount,
        sentenceCount,
        averageSentenceLength
    };
}
