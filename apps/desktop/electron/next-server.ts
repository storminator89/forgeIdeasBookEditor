import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import path from "node:path";
import { getPaths } from "./ipc/paths.js";

interface ServerHandle {
  proc: ChildProcess;
  url: string;
  port: number;
}

let handle: ServerHandle | null = null;

function getPort(): number {
  const raw = process.env["PORT"];
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

async function waitForHealth(
  url: string,
  timeoutMs = 30_000,
  intervalMs = 250,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.status < 500) return; // any 2xx, 3xx, 4xx = server is up
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `Next.js server did not become healthy within ${timeoutMs}ms (${url}): ${String(lastError)}`,
  );
}

/**
 * Spawn the Next.js standalone server. Stdout/stderr are mirrored to a
 * rolling log file under `userData/logs/` so the user can inspect them
 * via the menu.
 */
export async function startNextServer(
  env: NodeJS.ProcessEnv,
): Promise<ServerHandle> {
  if (handle) return handle;

  const p = getPaths();
  if (!existsSync(p.nextServerEntry)) {
    throw new Error(
      `Next.js server entry not found at ${p.nextServerEntry}. ` +
        `Run "pnpm --filter web build" first.`,
    );
  }

  const port = getPort();
  const envWithPort: NodeJS.ProcessEnv = { ...env, PORT: String(port) };

  // The standalone server computes `__dirname` from the server.js location
  // and serves `.next/static` from `../.next/static` relative to it.
  // We set cwd to the standalone root to keep that working.
  const cwd = path.dirname(p.nextServerEntry);

  const proc = spawn(process.execPath, [p.nextServerEntry], {
    cwd,
    env: envWithPort,
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Mirror logs
  const logFile = path.join(p.logsDir, "next-server.log");
  const logStream = createWriteStream(logFile, { flags: "a" });

  proc.stdout.on("data", (chunk: Buffer) => {
    process.stdout.write(`[next] ${chunk}`);
    logStream.write(chunk);
  });
  proc.stderr.on("data", (chunk: Buffer) => {
    process.stderr.write(`[next] ${chunk}`);
    logStream.write(chunk);
  });
  proc.on("exit", (code, signal) => {
    logStream.write(`\n[next-server] exited code=${code} signal=${signal}\n`);
  });

  const url = `http://127.0.0.1:${port}`;
  await waitForHealth(url, 30_000);

  handle = { proc, url, port };
  return handle;
}

export async function stopNextServer(): Promise<void> {
  if (!handle) return;
  const { proc } = handle;
  handle = null;

  if (proc.exitCode !== null) return;

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve();
    }, 3_000);

    proc.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    proc.kill("SIGTERM");
  });
}

export function getServerUrl(): string | null {
  return handle?.url ?? null;
}
