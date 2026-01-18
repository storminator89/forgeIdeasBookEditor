"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getRelationTypeInfo } from "./CharacterRelationModal";

// Dynamic import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Lade Graph...</div>
        </div>
    ),
});

type Character = {
    id: string;
    name: string;
    role: string;
    imageUrl: string | null;
};

type RelationFrom = {
    id: string;
    relationType: string;
    description: string | null;
    relatedCharacter: Character;
};

type RelationTo = {
    id: string;
    relationType: string;
    description: string | null;
    character: Character;
};

type CharacterWithRelations = Character & {
    relationsFrom: RelationFrom[];
    relationsTo: RelationTo[];
};

type GraphNode = {
    id: string;
    name: string;
    role: string;
    imageUrl: string | null;
    val: number;
    color: string;
};

type GraphLink = {
    source: string;
    target: string;
    relationType: string;
    description: string | null;
    color: string;
};

type GraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
};

type Props = {
    characters: CharacterWithRelations[];
    onNodeClick: (characterId: string) => void;
    className?: string;
};

const ROLE_COLORS: Record<string, string> = {
    protagonist: "#22c55e",   // green
    antagonist: "#ef4444",    // red
    supporting: "#3b82f6",    // blue
    minor: "#9ca3af",         // gray
};

const RELATION_COLORS: Record<string, string> = {
    family: "#22c55e",    // green
    friend: "#3b82f6",    // blue
    enemy: "#ef4444",     // red
    romantic: "#ec4899",  // pink
    colleague: "#6b7280", // gray
    rival: "#f97316",     // orange
    mentor: "#eab308",    // yellow
};

export default function CharacterRelationshipGraph({
    characters,
    onNodeClick,
    className = "",
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    // Transform characters into graph data
    const graphData: GraphData = {
        nodes: characters.map(char => ({
            id: char.id,
            name: char.name,
            role: char.role,
            imageUrl: char.imageUrl,
            val: char.role === "protagonist" ? 3 : char.role === "antagonist" ? 2.5 : char.role === "supporting" ? 2 : 1.5,
            color: ROLE_COLORS[char.role] || ROLE_COLORS.minor,
        })),
        links: characters.flatMap(char =>
            char.relationsFrom.map(rel => ({
                source: char.id,
                target: rel.relatedCharacter.id,
                relationType: rel.relationType,
                description: rel.description,
                color: RELATION_COLORS[rel.relationType] || RELATION_COLORS.colleague,
            }))
        ),
    };

    // Custom node rendering
    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name;
        const fontSize = 12 / globalScale;
        const nodeRadius = Math.sqrt(node.val) * 8;

        // Draw node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Draw border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();

        // Draw initial letter
        ctx.font = `bold ${fontSize * 1.5}px Sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label.charAt(0).toUpperCase(), node.x, node.y);

        // Draw label below
        ctx.font = `${fontSize}px Sans-serif`;
        ctx.fillStyle = "currentColor";
        ctx.fillText(label, node.x, node.y + nodeRadius + fontSize);
    }, []);

    // Custom link rendering
    const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const start = link.source;
        const end = link.target;

        if (typeof start !== "object" || typeof end !== "object") return;

        // Draw link line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = link.color;
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const endRadius = Math.sqrt(end.val) * 8;
        const arrowLength = 8 / globalScale;
        const arrowX = end.x - Math.cos(angle) * (endRadius + 5);
        const arrowY = end.y - Math.sin(angle) * (endRadius + 5);

        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle - Math.PI / 6),
            arrowY - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle + Math.PI / 6),
            arrowY - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = link.color;
        ctx.fill();
    }, []);

    const handleNodeClick = useCallback((node: any) => {
        onNodeClick(node.id);
    }, [onNodeClick]);

    // Center graph on mount
    useEffect(() => {
        if (fgRef.current && graphData.nodes.length > 0) {
            setTimeout(() => {
                fgRef.current?.zoomToFit(400, 50);
            }, 500);
        }
    }, [graphData.nodes.length]);

    if (characters.length === 0) {
        return (
            <div className={`flex items-center justify-center ${className}`}>
                <div className="text-center text-muted-foreground">
                    <p>Keine Charaktere vorhanden.</p>
                    <p className="text-sm">Erstelle Charaktere, um den Beziehungsgraphen zu sehen.</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`relative ${className}`} style={{ minHeight: 500 }}>
            <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                nodeCanvasObject={nodeCanvasObject}
                nodePointerAreaPaint={(node: any, color, ctx) => {
                    const nodeRadius = Math.sqrt(node.val) * 8;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeRadius + 5, 0, 2 * Math.PI, false);
                    ctx.fillStyle = color;
                    ctx.fill();
                }}
                linkCanvasObject={linkCanvasObject}
                onNodeClick={handleNodeClick}
                nodeLabel={(node: any) => `${node.name} (${node.role})`}
                linkLabel={(link: any) => {
                    const info = getRelationTypeInfo(link.relationType);
                    return `${info.label}${link.description ? `: ${link.description}` : ""}`;
                }}
                backgroundColor="transparent"
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                enableNodeDrag={true}
                enableZoomInteraction={true}
                enablePanInteraction={true}
            />

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
                <p className="text-xs font-medium mb-2">Legende</p>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Protagonist</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Antagonist</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Nebenrolle</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <span>Kleine Rolle</span>
                    </div>
                </div>
                <div className="border-t mt-2 pt-2 space-y-1">
                    <p className="text-xs font-medium">Beziehungen</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-green-500" />
                            <span>Familie</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-blue-500" />
                            <span>Freund</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-red-500" />
                            <span>Feind</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-pink-500" />
                            <span>Romantisch</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-orange-500" />
                            <span>Rivale</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-yellow-500" />
                            <span>Mentor</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg text-xs text-muted-foreground">
                <p>🖱️ Klicke auf einen Charakter zum Bearbeiten</p>
                <p>↔️ Ziehen zum Verschieben</p>
                <p>🔍 Scrollen zum Zoomen</p>
            </div>
        </div>
    );
}
