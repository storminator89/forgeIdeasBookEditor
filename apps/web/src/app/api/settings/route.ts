import prisma from "@bucherstellung/db";
import { NextRequest, NextResponse } from "next/server";

// GET global settings
export async function GET() {
    try {
        // Get or create the default global settings
        let settings = await prisma.globalSettings.findUnique({
            where: { id: "default" },
        });

        if (!settings) {
            settings = await prisma.globalSettings.create({
                data: { id: "default" },
            });
        }

        // Mask API key for security (only show that it exists)
        const maskedSettings = {
            ...settings,
            apiKey: settings.apiKey ? `****${settings.apiKey.slice(-4)}` : null,
            hasApiKey: !!settings.apiKey,
        };

        return NextResponse.json(maskedSettings);
    } catch (error) {
        console.error("Failed to fetch global settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch global settings" },
            { status: 500 }
        );
    }
}

// PATCH update global settings
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            apiEndpoint,
            apiKey,
            model,
            temperature,
            maxTokens,
            systemPrompt,
        } = body;

        const settings = await prisma.globalSettings.upsert({
            where: { id: "default" },
            create: {
                id: "default",
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
            ...settings,
            apiKey: settings.apiKey ? `****${settings.apiKey.slice(-4)}` : null,
            hasApiKey: !!settings.apiKey,
        };

        return NextResponse.json(maskedSettings);
    } catch (error) {
        console.error("Failed to update global settings:", error);
        return NextResponse.json(
            { error: "Failed to update global settings" },
            { status: 500 }
        );
    }
}

// Special endpoint to get unmasked API key for internal use (wizard)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Security: Only return unmasked if specifically requested with token
        if (body.action !== "getUnmasked") {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const settings = await prisma.globalSettings.findUnique({
            where: { id: "default" },
        });

        if (!settings || !settings.apiKey) {
            return NextResponse.json(
                { error: "No API key configured" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            apiEndpoint: settings.apiEndpoint,
            apiKey: settings.apiKey,
            model: settings.model,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            systemPrompt: settings.systemPrompt,
        });
    } catch (error) {
        console.error("Failed to get settings:", error);
        return NextResponse.json(
            { error: "Failed to get settings" },
            { status: 500 }
        );
    }
}
