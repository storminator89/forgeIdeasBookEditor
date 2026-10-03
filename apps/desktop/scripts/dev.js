#!/usr/bin/env node
/**
 * dev.js — start the web app in dev mode and the Electron main process
 * with hot-reload support.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(desktopRoot, "..", "..");

async function main() {
  // The Electron binary lives in the workspace's node_modules.
  const require = createRequire(import.meta.url);
  const electronBin = require("electron");

  // Start Next.js dev server in the background.
  console.log("[dev] Starte Next.js (apps/web) im Dev-Mode auf Port 3001...");
  const next = spawn("pnpm", ["--filter", "web", "dev"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, PORT: "3001" },
  });

  // Wait until Next.js answers on 3001.
  await waitForUrl("http://127.0.0.1:3001");

  // Start Electron pointing at the dev server.
  console.log("[dev] Starte Electron...");
  const electron = spawn(electronBin, ["."], {
    cwd: desktopRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      ELECTRON_DEV: "1",
      // Tell Electron to load the Next.js dev URL instead of the
      // standalone server.
      NEXT_DEV_URL: "http://127.0.0.1:3001",
    },
  });

  electron.on("exit", () => {
    next.kill("SIGTERM");
    process.exit(0);
  });
  next.on("exit", () => {
    electron.kill("SIGTERM");
    process.exit(0);
  });
}

async function waitForUrl(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server unter ${url} wurde nicht innerhalb von ${timeoutMs}ms erreichbar.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
