import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";
import { encrypt, decryptIfNeeded } from "@/lib/crypto";

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

        // Mask API key for security (decrypt first to get last 4 chars)
        const plainKey = decryptIfNeeded(aiSettings.apiKey);
        const maskedSettings = {
            ...aiSettings,
            apiKey: plainKey ? `****${plainKey.slice(-4)}` : null,
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

        // Encrypt API key before storing
        const encryptedApiKey = apiKey ? encrypt(apiKey) : undefined;

        const aiSettings = await prisma.aISettings.upsert({
            where: { bookId },
            create: {
                bookId,
                ...(apiEndpoint !== undefined && { apiEndpoint }),
                ...(encryptedApiKey !== undefined && { apiKey: encryptedApiKey }),
                ...(model !== undefined && { model }),
                ...(temperature !== undefined && { temperature }),
                ...(maxTokens !== undefined && { maxTokens }),
                ...(systemPrompt !== undefined && { systemPrompt }),
            },
            update: {
                ...(apiEndpoint !== undefined && { apiEndpoint }),
                ...(encryptedApiKey !== undefined && { apiKey: encryptedApiKey }),
                ...(model !== undefined && { model }),
                ...(temperature !== undefined && { temperature }),
                ...(maxTokens !== undefined && { maxTokens }),
                ...(systemPrompt !== undefined && { systemPrompt }),
            },
        });

        // Mask API key for security
        const plainKey = decryptIfNeeded(aiSettings.apiKey);
        const maskedSettings = {
            ...aiSettings,
            apiKey: plainKey ? `****${plainKey.slice(-4)}` : null,
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
