import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { getPaths } from "./ipc/paths.js";

/**
 * Runs `prisma db push` if the SQLite database does not exist or if the
 * Prisma schema is newer than the database file. Mirrors the Docker
 * `entrypoint.sh` logic.
 */
export async function runMigrationsIfNeeded(): Promise<void> {
  const p = getPaths();
  if (!existsSync(p.prismaSchema)) {
    throw new Error(`Prisma schema not found at ${p.prismaSchema}`);
  }

  const dbExists = existsSync(p.dbPath);
  let needsMigration = !dbExists;

  if (dbExists) {
    const [schemaStat, dbStat] = await Promise.all([
      fs.stat(p.prismaSchema),
      fs.stat(p.dbPath),
    ]);
    if (schemaStat.mtimeMs > dbStat.mtimeMs) {
      needsMigration = true;
    }
  }

  if (!needsMigration) return;

  const prismaBin = await findPrismaBinary();
  const schemaDir = path.dirname(p.prismaSchema);

  await runPrismaDbPush(prismaBin, schemaDir);
}

async function findPrismaBinary(): Promise<string> {
  const candidates: string[] = [
    path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "..",
      "node_modules",
      ".bin",
      "prisma",
    ),
    path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "..",
      "node_modules",
      ".bin",
      "prisma.cmd",
    ),
    path.join(process.resourcesPath ?? "", "prisma", "node_modules", ".bin", "prisma"),
    path.join(process.resourcesPath ?? "", "prisma", "node_modules", ".bin", "prisma.cmd"),
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  throw new Error(
    "Prisma-Binary nicht gefunden. Stelle sicher, dass `pnpm install` ausgefuehrt wurde.",
  );
}

function runPrismaDbPush(bin: string, schemaDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, ["db", "push", "--skip-generate"], {
      cwd: schemaDir,
      env: { ...process.env, DATABASE_URL: `file:${getPaths().dbPath}` },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      process.stdout.write(`[prisma] ${chunk}`);
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      process.stderr.write(`[prisma] ${chunk}`);
    });
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`prisma db push exited with code ${code}\n${stderr}`));
    });
  });
}

/**
 * Triggers the image-URL migration endpoint inside the running Next.js
 * server. Should be called after `startNextServer`. Failures are
 * non-fatal because the upload route already returns the new URL format
 * going forward.
 */
export async function migrateImageUrls(serverUrl: string): Promise<void> {
  const url = `${serverUrl.replace(/\/$/, "")}/api/migrations/image-urls`;
  try {
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      console.warn(
        `[desktop] Image-URL-Migration: HTTP ${res.status} ${res.statusText}`,
      );
      return;
    }
    const body = (await res.json()) as { migrated: number };
    if (body.migrated > 0) {
      console.log(
        `[desktop] Image-URL-Migration: ${body.migrated} Eintraege aktualisiert`,
      );
    }
  } catch (err) {
    console.warn(`[desktop] Image-URL-Migration fehlgeschlagen: ${String(err)}`);
  }
}
