# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /app

# Copy workspace manifests (for layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/config/package.json packages/config/

RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build
# ============================================
FROM deps AS builder

COPY . .

# DATABASE_URL needed at build time (env validation runs during next build)
ENV DATABASE_URL=file:/app/data/dev.db
ENV NODE_ENV=production

# Generate Prisma client
RUN pnpm --filter @bucherstellung/db db:generate

# Initialize database schema at build time
RUN mkdir -p /app/data && \
    pnpm --filter @bucherstellung/db db:push

# Build Next.js standalone
RUN pnpm --filter web build

# ============================================
# Stage 3: Production
# ============================================
FROM node:22-slim AS runner

# Install tini for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Standalone server + node_modules
COPY --from=builder /app/apps/web/.next/standalone ./

# Static assets (Next.js requires these)
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Public directory at root level (process.cwd() = /app, upload route uses path.join(cwd, "public", "uploads"))
COPY --from=builder /app/apps/web/public ./public

# Pre-initialized database (schema already pushed)
COPY --from=builder /app/data/dev.db /app/data/dev.db

# Entrypoint script
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Create uploads directory and set ownership
RUN mkdir -p /app/public/uploads && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV DATABASE_URL=file:/app/data/dev.db
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

ENTRYPOINT ["tini", "--", "./entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
