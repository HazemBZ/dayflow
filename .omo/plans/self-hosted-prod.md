# Self-Hosted Production: Daily Planning App

## Goal
Deploy daily-planning Next.js app to local machine via Docker Compose. Lightweight, persistent, one-command start/stop.

## Architecture

```
Localhost:3000
    │
docker-compose: app
    │
 Next.js standalone (Node 20 Alpine)
    │
  SQLite (volume: /data/data.db)
```

- No TLS (localhost)
- No reverse proxy
- Single `docker compose up -d` to run
- `docker compose down` to stop
- `restart: unless-stopped` for auto-recovery

## Changes Required

### Phase A — Code Config (env-ize)

| File | Change |
|------|--------|
| `next.config.ts` | `output: "standalone"`, `serverExternalPackages: ["@libsql/client"]` |
| `src/lib/db/index.ts` | `DATABASE_URL` env var with fallback `file:./data.db` |
| `src/lib/db/migrate.ts` | Same env var pattern |
| `drizzle.config.ts` | Same env var pattern |
| `package.json` | Add `db:migrate` script |
| `.env.example` | Document vars: `DATABASE_URL`, `PORT` |

### Phase B — Containerization

| File | Content |
|------|---------|
| `Dockerfile` | Multi-stage: deps → build → runner (Node 20 Alpine) |
| `docker-compose.yml` | App service, volume mount, port, restart policy |
| `.dockerignore` | Exclude dev cruft |

### Phase C — Startup Script

| File | Content |
|------|---------|
| `scripts/start.sh` | Run drizzle migrations, then `next start` |

## Verification

1. `docker compose build` — builds clean
2. `docker compose up -d` — starts, migrations run
3. `curl http://localhost:3000` — returns HTML
4. DB file persists in Docker volume across restarts
5. `docker compose down` — clean stop
