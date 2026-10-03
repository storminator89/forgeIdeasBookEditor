import { NextResponse } from "next/server";
import prisma from "@bucherstellung/db";

const FIELDS: { model: "book" | "character" | "worldElement" | "imagePlaceholder"; field: "coverUrl" | "imageUrl" | "generatedUrl" }[] = [
  { model: "book", field: "coverUrl" },
  { model: "character", field: "imageUrl" },
  { model: "worldElement", field: "imageUrl" },
  { model: "imagePlaceholder", field: "generatedUrl" },
];

// POST /api/migrations/image-urls
// Rewrites legacy `/uploads/...` URLs in the database to the new
// `/api/uploads/...` endpoint that the desktop build (and the updated
// web build) use to serve uploaded files. Idempotent.
export async function POST() {
  const updated: { id: string; field: string; from: string; to: string }[] = [];

  for (const { model, field } of FIELDS) {
    const client = prisma[model] as unknown as {
      findMany: (args: { where: Record<string, { startsWith: string }>; select: { id: true } & Record<string, true> }) => Promise<Array<{ id: string } & Record<string, string | null>>>;
      update: (args: { where: { id: string }; data: Record<string, string> }) => Promise<unknown>;
    };

    const rows = await client.findMany({
      where: { [field]: { startsWith: "/uploads/" } },
      select: { id: true, [field]: true },
    });

    for (const row of rows) {
      const from = row[field];
      if (typeof from !== "string" || !from.startsWith("/uploads/")) continue;
      const to = from.replace(/^\/uploads\//, "/api/uploads/");
      await client.update({ where: { id: row.id }, data: { [field]: to } });
      updated.push({ id: row.id, field, from, to });
    }
  }

  return NextResponse.json({ migrated: updated.length, entries: updated });
}
