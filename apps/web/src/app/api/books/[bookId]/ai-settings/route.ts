import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: Promise<{ bookId: string }>;
};

// GET AI settings for a book
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;

        let aiSettings = await prisma.aISettings.findUnique({
            where: { bookId },
        });

        // Create default settings if not exist
        if (!aiSettings) {
            aiSettings = await prisma.aISettings.create({
                data: { bookId },
            });
        }

        // Mask API key for security (only show last 4 chars)
        const maskedSettings = {
            ...aiSettings,
            apiKey: aiSettings.apiKey
                ? `****${aiSettings.apiKey.slice(-4)}`
                : null,
        };

        return NextResponse.json(maskedSettings);
    } catch (error) {
        console.error("Failed to fetch AI settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch AI settings" },
            { status: 500 }
        );
    }
}

// PATCH update AI settings
export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const {
            apiEndpoint,
            apiKey,
            model,
            temperature,
            maxTokens,
            systemPrompt,
        } = body;

        const aiSettings = await prisma.aISettings.upsert({
            where: { bookId },
            create: {
                bookId,
                ...(apiEndpoint !== undefined && { apiEndpoint }),
                ...(apiKey !== undefined && { apiKey }),
                ...(model !== undefined && { model }),
                ...(temperature !== undefined && { temperature }),
                ...(maxTokens !== undefined && { maxTokens }),
                ...(systemPrompt !== undefined && { systemPrompt }),
            },
            update: {
                ...(apiEndpoint !== undefined && { apiEndpoint }),
                ...(apiKey !== undefined && { apiKey }),
                ...(model !== undefined && { model }),
                ...(temperature !== undefined && { temperature }),
                ...(maxTokens !== undefined && { maxTokens }),
                ...(systemPrompt !== undefined && { systemPrompt }),
            },
        });

        // Mask API key for security
        const maskedSettings = {
            ...aiSettings,
            apiKey: aiSettings.apiKey
                ? `****${aiSettings.apiKey.slice(-4)}`
                : null,
        };

        return NextResponse.json(maskedSettings);
    } catch (error) {
        console.error("Failed to update AI settings:", error);
        return NextResponse.json(
            { error: "Failed to update AI settings" },
            { status: 500 }
        );
    }
}
