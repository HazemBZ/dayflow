#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="dayflow.service"
SERVICE_SRC="$PROJECT_DIR/scripts/$SERVICE_NAME"
SERVICE_DST="$HOME/.config/systemd/user/$SERVICE_NAME"
CADDYFILE_SRC="$PROJECT_DIR/scripts/Caddyfile"
CADDYFILE_DST="/etc/caddy/conf.d/dayflow"

echo "==> Installing dependencies..."
cd "$PROJECT_DIR"
pnpm install

echo "==> Building production bundle..."
pnpm build

echo "==> Copying static assets to standalone output..."
cp -r "$PROJECT_DIR/.next/static" "$PROJECT_DIR/.next/standalone/.next/static"
cp -r "$PROJECT_DIR/public" "$PROJECT_DIR/.next/standalone/public"

echo "==> Configuring Caddy..."
sudo mkdir -p /etc/caddy/conf.d
sudo cp "$CADDYFILE_SRC" "$CADDYFILE_DST"

echo "==> Adding hostname entries (requires sudo)..."
for h in dayflow.me dayflow; do
  if grep -q "$h$" /etc/hosts 2>/dev/null; then
    echo "  '$h' already in /etc/hosts -- skipping."
  else
    echo "127.0.0.1 $h" | sudo tee -a /etc/hosts >/dev/null
    echo "  Added '$h' -> 127.0.0.1"
  fi
done

echo "==> Enabling user service startup at boot (linger)..."
sudo loginctl enable-linger "$USER"

echo "==> Installing Dayflow systemd user service..."
mkdir -p "$HOME/.config/systemd/user"
cp "$SERVICE_SRC" "$SERVICE_DST"
systemctl --user daemon-reload

echo "==> Enabling services..."
sudo systemctl enable --now caddy
sudo systemctl reload caddy
systemctl --user enable --now "$SERVICE_NAME"

echo "==> Service status:"
echo "--- Caddy ---"
sudo systemctl status caddy --no-pager -l 2>&1 | head -10
echo ""
echo "--- Dayflow ---"
systemctl --user status "$SERVICE_NAME" --no-pager -l 2>&1 | head -10

echo ""
echo "Done. Dayflow at http://dayflow.me"
echo "  - Start:       systemctl --user start dayflow"
echo "  - Stop:        systemctl --user stop dayflow"
echo "  - Logs:        journalctl --user -u dayflow -f"
echo "  - Restart:     sudo systemctl restart caddy"
