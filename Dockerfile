# syntax=docker/dockerfile:1

FROM oven/bun:1 AS bun-binary

FROM node:24-slim AS deps
WORKDIR /app
COPY --from=bun-binary /usr/local/bin/bun /usr/local/bin/bun
ENV BUN_INSTALL_CACHE_DIR=/root/.bun/install/cache
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y python3 make g++ --no-install-recommends
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --verbose

FROM node:24-slim AS build
WORKDIR /app
COPY --from=bun-binary /usr/local/bin/bun /usr/local/bin/bun
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build && \
    bun build --target=node --external=better-sqlite3 scripts/migrate.ts --outfile=dist/migrate.mjs

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/dist/migrate.mjs ./migrate.mjs

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node migrate.mjs && node server.js"]
