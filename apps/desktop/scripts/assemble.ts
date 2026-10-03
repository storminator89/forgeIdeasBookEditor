#!/usr/bin/env tsx
/**
 * assemble.ts — copy the Next.js standalone build output into
 * `apps/desktop/build/web/` so electron-builder can pick it up via
 * `extraResources` and the production main.ts can locate it.
 *
 * Next.js' standalone output only ships the `next` package. We:
 *  1. Copy the standalone output.
 *  2. Copy `.next/static`, `public/`, and the Prisma schema.
 *  3. Merge `apps/web/node_modules/` into the build's `node_modules/`,
 *     skipping any package already present (so we don't clobber Next's
 *     version of `next` itself).
 *  4. Scan the built JS for `require(<pkg>)` and `from "<pkg>"` and
 *     pull in any missing peer-dep from the workspace's pnpm store.
 *  5. Bulk-import every package under `@libsql/*`, `@prisma/*`, and
 *     `@next/*` from the pnpm store, because they have a wide graph of
 *     optional platform-specific peers (e.g. @libsql/linux-x64-gnu)
 *     that the scanner alone misses.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(desktopRoot, "..", "..");

const standaloneRoot = path.join(repoRoot, "apps", "web", ".next", "standalone");
const staticSrc = path.join(repoRoot, "apps", "web", ".next", "static");
const publicSrc = path.join(repoRoot, "apps", "web", "public");
const prismaSrc = path.join(repoRoot, "packages", "db", "prisma");
const webNodeModulesSrc = path.join(repoRoot, "apps", "web", "node_modules");
const pnpmStore = path.join(repoRoot, "node_modules", ".pnpm");

const buildRoot = path.join(desktopRoot, "build", "web");
const staticDst = path.join(buildRoot, "apps", "web", ".next", "static");
const publicDst = path.join(buildRoot, "apps", "web", "public");
const prismaDst = path.join(buildRoot, "prisma");
const builtWebNodeModules = path.join(buildRoot, "apps", "web", "node_modules");

function rimraf(target: string): void {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    } else if (entry.isSymbolicLink()) {
      let real: string;
      try {
        real = fs.realpathSync(s);
      } catch {
        continue;
      }
      if (fs.statSync(real).isDirectory()) {
        copyDir(real, d);
      } else {
        fs.mkdirSync(path.dirname(d), { recursive: true });
        fs.copyFileSync(real, d);
      }
    }
  }
}

function assertExists(target: string, label: string): void {
  if (!fs.existsSync(target)) {
    console.error(`[assemble] FEHLER: ${label} nicht gefunden: ${target}`);
    console.error(`[assemble] Bitte zuerst "pnpm --filter web build" ausfuehren.`);
    process.exit(1);
  }
}

function mergeWebNodeModules(): void {
  if (!fs.existsSync(webNodeModulesSrc)) {
    console.warn(`[assemble] WARN: apps/web/node_modules fehlt, ueberspringe.`);
    return;
  }
  console.log(`[assemble] Merge apps/web/node_modules...`);
  fs.mkdirSync(builtWebNodeModules, { recursive: true });

  for (const entry of fs.readdirSync(webNodeModulesSrc, { withFileTypes: true })) {
    if (entry.name === ".pnpm" || entry.name === ".bin") continue;
    const src = path.join(webNodeModulesSrc, entry.name);
    const dst = path.join(builtWebNodeModules, entry.name);
    if (fs.existsSync(dst)) continue;
    let real: string;
    try {
      real = entry.isSymbolicLink() ? fs.realpathSync(src) : src;
    } catch {
      continue;
    }
    if (fs.existsSync(real) && fs.statSync(real).isDirectory()) {
      copyDir(real, dst);
    }
  }
}

function resolveFromPnpm(pkg: string): string | null {
  if (!fs.existsSync(pnpmStore)) return null;
  const flatName = pkg.replace(/\//g, "+");
  for (const entry of fs.readdirSync(pnpmStore)) {
    if (!entry.startsWith(`${flatName}@`)) continue;
    const candidate = path.join(pnpmStore, entry, "node_modules", pkg);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function patchMissingModules(): void {
  if (!fs.existsSync(builtWebNodeModules)) {
    fs.mkdirSync(builtWebNodeModules, { recursive: true });
  }

  const imported = new Set<string>();
  walkJsFiles(buildRoot, (file) => {
    const content = fs.readFileSync(file, "utf-8");
    for (const match of content.matchAll(/require\(['"]([^'./][^'"]*)['"]\)/g)) {
      imported.add(topLevelPkg(match[1]!));
    }
    for (const match of content.matchAll(/from\s+['"]([^'./][^'"]*)['"]/g)) {
      imported.add(topLevelPkg(match[1]!));
    }
    for (const match of content.matchAll(/import\(['"]([^'./][^'"]*)['"]\)/g)) {
      imported.add(topLevelPkg(match[1]!));
    }
  });

  let patched = 0;
  for (const pkg of imported) {
    if (!pkg || pkg.startsWith("node:")) continue;
    if (pkg === "next" || pkg === "react" || pkg === "react-dom") continue;
    if (fs.existsSync(path.join(builtWebNodeModules, pkg))) continue;
    const resolved = resolveFromPnpm(pkg);
    if (resolved) {
      console.log(`[assemble] Patch: kopiere ${pkg}...`);
      copyDir(resolved, path.join(builtWebNodeModules, pkg));
      patched++;
    }
  }
  console.log(`[assemble] ${patched} zusaetzliche Module gepatcht.`);
}

/**
 * Copy every package under `<scope>/*` from the pnpm store into the
 * build's `node_modules`. Used for packages that have a wide graph of
 * optional platform-specific peers (e.g. @libsql, @prisma).
 *
 * Each pnpm-store entry may be e.g. `@libsql+linux-x64-gnu@0.3.19`, and
 * inside it lives `node_modules/@libsql/linux-x64-gnu/` (the actual
 * package). We walk that directory and copy each sub-entry into the
 * build's `<scope>/<name>/`.
 */
function bulkImportScope(scope: string): void {
  if (!fs.existsSync(pnpmStore)) return;
  const flatPrefix = scope.replace(/\//g, "+");
  const dstScope = path.join(builtWebNodeModules, scope);
  fs.mkdirSync(dstScope, { recursive: true });
  for (const entry of fs.readdirSync(pnpmStore)) {
    if (!entry.startsWith(`${flatPrefix}+`) && entry !== flatPrefix) continue;
    const scopeDir = path.join(pnpmStore, entry, "node_modules", scope);
    if (!fs.existsSync(scopeDir)) continue;
    for (const sub of fs.readdirSync(scopeDir, { withFileTypes: true })) {
      const src = path.join(scopeDir, sub.name);
      const dst = path.join(dstScope, sub.name);
      if (fs.existsSync(dst)) continue;
      let real: string;
      try {
        real = sub.isSymbolicLink() ? fs.realpathSync(src) : src;
      } catch {
        continue;
      }
      if (fs.existsSync(real) && fs.statSync(real).isDirectory()) {
        console.log(`[assemble] Bulk: kopiere ${scope}/${sub.name}...`);
        copyDir(real, dst);
      }
    }
  }
}

function topLevelPkg(spec: string): string {
  if (spec.startsWith("@")) {
    const slash = spec.indexOf("/");
    if (slash === -1) return spec;
    const rest = spec.slice(slash + 1);
    const nextSlash = rest.indexOf("/");
    return nextSlash === -1 ? spec : spec.slice(0, slash + 1 + nextSlash);
  }
  return spec.split("/")[0]!;
}

function walkJsFiles(dir: string, cb: (file: string) => void): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsFiles(full, cb);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".js") ||
        entry.name.endsWith(".mjs") ||
        entry.name.endsWith(".cjs"))
    ) {
      cb(full);
    }
  }
}

function main(): void {
  console.log(`[assemble] Standalone: ${standaloneRoot}`);
  assertExists(standaloneRoot, "Next.js standalone build");

  console.log(`[assemble] Leere build/web/`);
  rimraf(buildRoot);
  fs.mkdirSync(buildRoot, { recursive: true });

  console.log(`[assemble] Kopiere standalone Output...`);
  copyDir(standaloneRoot, buildRoot);

  if (fs.existsSync(staticSrc)) {
    console.log(`[assemble] Kopiere .next/static...`);
    rimraf(staticDst);
    copyDir(staticSrc, staticDst);
  } else {
    console.warn(`[assemble] WARN: .next/static nicht gefunden.`);
  }

  if (fs.existsSync(publicSrc)) {
    console.log(`[assemble] Kopiere public/...`);
    rimraf(publicDst);
    copyDir(publicSrc, publicDst);
  }

  if (fs.existsSync(prismaSrc)) {
    console.log(`[assemble] Kopiere Prisma-Schema...`);
    rimraf(prismaDst);
    copyDir(prismaSrc, prismaDst);
  }

  mergeWebNodeModules();
  patchMissingModules();

  console.log(`[assemble] Bulk-Import @libsql, @prisma, @next...`);
  bulkImportScope("@libsql");
  bulkImportScope("@prisma");
  bulkImportScope("@next");

  console.log(`[assemble] Fertig: ${buildRoot}`);
}

main();
