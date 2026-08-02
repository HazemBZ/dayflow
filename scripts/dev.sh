#!/usr/bin/env bash
# dev.sh — single command for pnpm tauri dev
#
# 1. Removes broken pnpm symlinks from standalone (Rust build fails otherwise)
# 2. Starts Next.js dev server (Tauri waits for :3000 before opening webview)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STANDALONE_NM="$PROJECT_DIR/.next/standalone/node_modules"

# Quick fix: delete broken symlinks so Rust build.rs doesn't choke
if [ -d "$STANDALONE_NM" ]; then
  find "$STANDALONE_NM" -type l ! -exec test -e {} \; -delete 2>/dev/null || true
fi

# Start Next.js dev server (foreground — Tauri monitors this process)
cd "$PROJECT_DIR"
exec pnpm dev
