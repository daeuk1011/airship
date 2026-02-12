FROM oven/bun:1 AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build
RUN bun build --target=node --external=better-sqlite3 scripts/migrate.ts --outfile=dist/migrate.js

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/dist/migrate.js ./migrate.js

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node migrate.js && node server.js"]
