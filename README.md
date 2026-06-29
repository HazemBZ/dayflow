# Dayflow

A personal planning system — daily, weekly, and strategic.

Track your 3 key outcomes each day, log deep work sessions, review evenings, keep score, and zoom out to the big picture. Built for clarity, not complexity.

## Features

- **Daily Dashboard** — Set 3 outcomes per day, drag to reorder, mark complete. Log deep work sessions with time tracking. Evening review and "protection gate" (record what you said no to).
- **Weekly View** — See your week at a glance, track time across categories.
- **Horizon** — Monthly & quarterly planning. Strategic alignment beyond the day.
- **Scorecard** — Visual metrics and trends. Charts for outcomes, deep work, skill sessions, and time allocation.
- **Budget** — Track spending against your plan.
- **History** — Browse past entries.
- **Settings** — Themes, fonts, view modes (basic/full), app-wide scaling.

## Screenshots

| Daily Dashboard | History | Settings |
|---|---|---|
| ![Daily Dashboard](/screenshots/daily.png) | ![History](/screenshots/history.png) | ![Settings](/screenshots/settings.png) |

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (React 19) |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui + Base UI + Framer Motion |
| Database | SQLite via libSQL (Turso-compatible) |
| ORM | Drizzle with drizzle-kit migrations |
| Package Manager | pnpm |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install & Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database Setup

```bash
# Generate migrations from schema
pnpm db:generate

# Push schema to SQLite
pnpm db:push

# Open Drizzle Studio (GUI)
pnpm db:studio
```

The app uses a local SQLite file (`data.db`). No external database required.

### Docker

```bash
docker compose up -d
# Runs on port 3001
```

## Project Structure

```
src/
├── app/          # Next.js App Router pages
│   ├── budget/
│   ├── history/
│   ├── horizon/
│   ├── scorecard/
│   ├── settings/
│   └── weekly/
├── components/   # React components
│   ├── dashboard/
│   └── ui/
└── lib/          # Actions, DB, stores, utilities
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:push` | Push schema to DB |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:migrate` | Run migrations |
