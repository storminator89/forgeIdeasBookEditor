import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        let apiEndpoint = searchParams.get("apiEndpoint");
        let apiKey = searchParams.get("apiKey");

        // Fall back to saved global settings if not provided
        if (!apiEndpoint || !apiKey) {
            const settings = await prisma.globalSettings.findUnique({
                where: { id: "default" },
            });

            if (settings) {
                apiEndpoint = apiEndpoint || settings.apiEndpoint;
                apiKey = apiKey || settings.apiKey || null;
            }
        }

        if (!apiEndpoint) {
            return NextResponse.json(
                { error: "No API endpoint configured" },
                { status: 400 }
            );
        }

        if (!apiKey) {
            return NextResponse.json(
                { error: "No API key configured" },
                { status: 400 }
            );
        }

        // Normalize endpoint URL
        const baseUrl = apiEndpoint.replace(/\/+$/, "");
        const modelsUrl = `${baseUrl}/models`;

        const response = await fetch(modelsUrl, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            return NextResponse.json(
                { error: `API returned ${response.status}: ${errorText || response.statusText}` },
                { status: 502 }
            );
        }

        const data = await response.json();

        // OpenAI-compatible APIs return { data: [{ id: "model-name", ... }] }
        const models: string[] = (data.data || [])
            .map((m: { id: string }) => m.id)
            .filter(Boolean)
            .sort();

        return NextResponse.json({ models });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: `Failed to fetch models: ${message}` },
            { status: 502 }
        );
    }
}
