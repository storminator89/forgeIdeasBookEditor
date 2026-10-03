import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { getPaths, type UserDataPaths } from "./paths.js";

export interface EnvStatus {
  hasEncryptionKey: boolean;
  encryptionKeyGenerated: boolean;
  databaseUrl: string;
  envFile: string;
}

/**
 * Generate a 32-byte hex key (64 chars) matching the Zod schema in
 * `packages/env/src/server.ts` (`z.string().length(64)`).
 */
function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Parse a simple KEY=VALUE .env file. Quoted values and multi-line values
 * are intentionally not supported — we only write a single key.
 */
function parseEnvFile(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

function serializeEnvFile(values: Record<string, string>): string {
  return (
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n"
  );
}

export interface EnsureEnvResult extends EnvStatus {
  envVars: NodeJS.ProcessEnv;
}

export async function ensureEnvFile(): Promise<EnsureEnvResult> {
  const p = getPaths();
  await fs.mkdir(path.dirname(p.envFile), { recursive: true });

  let existing: Record<string, string> = {};
  let encryptionKeyGenerated = false;
  try {
    const raw = await fs.readFile(p.envFile, "utf-8");
    existing = parseEnvFile(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  if (!existing["ENCRYPTION_KEY"]) {
    existing["ENCRYPTION_KEY"] = generateEncryptionKey();
    encryptionKeyGenerated = true;
  }

  await fs.writeFile(p.envFile, serializeEnvFile(existing), "utf-8");

  const databaseUrl = `file:${p.dbPath}`;
  const envVars: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    UPLOAD_DIR: p.uploadsDir,
    ENCRYPTION_KEY: existing["ENCRYPTION_KEY"],
    NODE_ENV: "production",
    HOSTNAME: "127.0.0.1",
    PORT: "3000",
  };

  return {
    hasEncryptionKey: true,
    encryptionKeyGenerated,
    databaseUrl,
    envFile: p.envFile,
    envVars,
  };
}

/** Public for the IPC handler in main.ts */
export function getEnvStatus(): EnvStatus {
  const p = getPaths();
  return {
    hasEncryptionKey: false, // overwritten by main.ts after ensureEnvFile
    encryptionKeyGenerated: false,
    databaseUrl: `file:${p.dbPath}`,
    envFile: p.envFile,
  };
}

export { type UserDataPaths };
