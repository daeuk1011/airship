FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build
RUN printf '%s\n' \
  'import { migrate } from "drizzle-orm/better-sqlite3/migrator";' \
  'import Database from "better-sqlite3";' \
  'import { drizzle } from "drizzle-orm/better-sqlite3";' \
  'import path from "path";' \
  'import fs from "fs";' \
  'const p = (process.env.DATABASE_URL || "file:./data/ota.db").replace(/^file:/, "");' \
  'const d = path.dirname(p);' \
  'if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });' \
  'const s = new Database(p);' \
  's.pragma("journal_mode = WAL");' \
  's.pragma("foreign_keys = ON");' \
  'migrate(drizzle(s), { migrationsFolder: "./drizzle" });' \
  'console.log("Migrations applied.");' \
  's.close();' > /tmp/migrate.ts && \
  bun build --target=node --external=better-sqlite3 /tmp/migrate.ts --outfile=dist/migrate.js

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
