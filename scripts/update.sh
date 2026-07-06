#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Pulling latest code..."
cd "$PROJECT_DIR"
git pull

echo "==> Updating dependencies..."
pnpm install

echo "==> Rebuilding app..."
pnpm build

echo "==> Copying static assets to standalone output..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "==> Running DB migrations..."
node scripts/migrate.mjs

echo "==> Restarting Dayflow service..."
systemctl --user restart dayflow

echo ""
echo "Done. http://dayflow.me should reflect latest code."
echo "  - Check logs: journalctl --user -u dayflow -f"
echo "  - If Caddyfile changed: sudo systemctl reload caddy"
