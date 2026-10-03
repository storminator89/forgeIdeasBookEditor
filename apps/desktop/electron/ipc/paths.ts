import { app } from "electron";
import path from "node:path";
import fs from "node:fs/promises";

/**
 * Resolves all user-data paths in a single place so the rest of the app
 * never has to know about Electron's `app.getPath('userData')`.
 */
export interface UserDataPaths {
  userDataDir: string;
  dbPath: string;
  uploadsDir: string;
  envFile: string;
  logsDir: string;
  webRoot: string;
  nextServerEntry: string;
  nextStaticDir: string;
  webPublicDir: string;
  prismaSchema: string;
  isPackaged: boolean;
}

let cached: UserDataPaths | null = null;

export function getPaths(): UserDataPaths {
  if (cached) return cached;

  const isPackaged = app.isPackaged;
  const userDataDir = app.getPath("userData");
  const dbPath = path.join(userDataDir, "dev.db");
  const uploadsDir = path.join(userDataDir, "uploads");
  const envFile = path.join(userDataDir, ".env");
  const logsDir = path.join(userDataDir, "logs");

  // In dev: webRoot points at apps/web (relative to monorepo root).
  // In production: resourcesPath is the asar.unpacked / extraResources dir.
  const webRoot = isPackaged
    ? path.join(process.resourcesPath)
    : path.resolve(__dirname, "..", "..", "..", "..", "..");

  // The standalone server entry produced by `next build` with output: "standalone".
  const nextServerEntry = isPackaged
    ? path.join(process.resourcesPath, "apps", "web", "server.js")
    : path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "..",
        "apps",
        "web",
        ".next",
        "standalone",
        "apps",
        "web",
        "server.js",
      );

  const nextStaticDir = isPackaged
    ? path.join(process.resourcesPath, "apps", "web", ".next", "static")
    : path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "..",
        "apps",
        "web",
        ".next",
        "static",
      );

  const webPublicDir = isPackaged
    ? path.join(process.resourcesPath, "apps", "web", "public")
    : path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "..",
        "apps",
        "web",
        "public",
      );

  const prismaSchema = isPackaged
    ? path.join(process.resourcesPath, "prisma", "schema.prisma")
    : path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "..",
        "packages",
        "db",
        "prisma",
        "schema",
        "schema.prisma",
      );

  cached = {
    userDataDir,
    dbPath,
    uploadsDir,
    envFile,
    logsDir,
    webRoot,
    nextServerEntry,
    nextStaticDir,
    webPublicDir,
    prismaSchema,
    isPackaged,
  };
  return cached;
}

export async function ensureUserDataDirs(): Promise<void> {
  const p = getPaths();
  await Promise.all([
    fs.mkdir(p.userDataDir, { recursive: true }),
    fs.mkdir(p.uploadsDir, { recursive: true }),
    fs.mkdir(p.logsDir, { recursive: true }),
  ]);
}
