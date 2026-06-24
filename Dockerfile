FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/data/data.db
# Module resolution for migration script (standalone node_modules has @libsql/client)
ENV NODE_PATH=/app/daily-planning/node_modules

# Pre-built Next.js standalone output
COPY .next/standalone ./
# Client-side static assets (inside standalone dir — server chdirs there)
COPY .next/static ./daily-planning/.next/static
# Public assets
COPY public ./daily-planning/public
# Drizzle migration files (for startup migration)
COPY drizzle ./drizzle
# Migration script (plain JS, runs before Next.js server)
COPY scripts/migrate.js ./scripts/migrate.js
# drizzle-orm not traced by Next.js standalone - inject for migration
COPY node_modules/drizzle-orm ./daily-planning/node_modules/drizzle-orm

EXPOSE 3000

ENTRYPOINT ["sh", "-c", "node scripts/migrate.js && exec node daily-planning/server.js"]
