# Repository Guidelines

This repository is a pnpm workspace for the AI-Bucherstellung app. Use these notes to keep changes consistent and easy to review.

## Project Structure & Module Organization
- `apps/web`: Next.js app (App Router). Routes live in `apps/web/src/app`, API routes in `apps/web/src/app/api`, shared UI in `apps/web/src/components`, and static assets in `apps/web/public`.
- `packages/db`: Prisma schema in `packages/db/prisma/schema/schema.prisma` and the DB client in `packages/db/src`.
- `packages/env`: Runtime/env validation helpers in `packages/env/src`.
- `packages/config`: Shared TypeScript config.
- `local.db`: Local SQLite file used by `pnpm db:local`.

## Build, Test, and Development Commands
- `pnpm install`: install workspace dependencies.
- `pnpm dev`: run all workspace dev servers (web app on `http://localhost:3001`).
- `pnpm dev:web`: run only the Next.js app.
- `pnpm build`: build all workspaces.
- `pnpm check-types`: run TypeScript checks across workspaces.
- `pnpm db:push` / `pnpm db:migrate` / `pnpm db:generate`: Prisma schema and client tasks.
- `pnpm db:studio`: open Prisma Studio.
- `pnpm db:local`: run local SQLite via Turso dev.

## Coding Style & Naming Conventions
Use TypeScript/TSX with ES modules and strict type checking. Follow the existing formatting in each file (double quotes, semicolons, and grouped imports are common). In `apps/web`, prefer the `@/*` path alias for local imports. Component files are `PascalCase.tsx`, while Next.js route files use `page.tsx` and `route.ts`.

## Testing Guidelines
No automated test runner is configured yet, and there are no coverage requirements. At minimum, run `pnpm check-types` and perform manual UI checks for the affected routes. If you add a test framework, include scripts and document it here.

## Commit & Pull Request Guidelines
Git history only shows "initial commit", so there is no established convention. Use concise, imperative commit messages (e.g., "Add book editor autosave"). PRs should include a short summary, testing notes, and screenshots for UI changes; call out any Prisma schema updates and include the migration steps.

## Security & Configuration Tips
Do not commit secrets; `.env` files are ignored. AI provider keys can be configured via the app settings screen or local env. Treat `apps/web/public/uploads` as user content; keep samples minimal.
