#!/usr/bin/env bash
# build-sidecar.sh
#
# Builds Next.js standalone output and prepares the Node.js sidecar binary
# for Tauri v2. Designed to run as `beforeBuildCommand` in tauri.conf.json.
#
# Usage (CI provides TARGET_TRIPLE, or we detect it):
#   TARGET_TRIPLE=aarch64-apple-darwin bash scripts/build-sidecar.sh
#
# The script:
#   1. Runs `pnpm build` (Next.js standalone output → .next/standalone/)
#   2. Downloads Node.js binary for the target platform
#   3. Places it in src-tauri/binaries/ with Tauri's target-triple suffix
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TAURI_BIN_DIR="$PROJECT_DIR/src-tauri/binaries"

NODE_VERSION="22.14.0"
SIDECAR_NAME="dayflow-server"

# ------------------------------------------------------------------
# 1. Detect target triple
# ------------------------------------------------------------------
detect_triple() {
  local arch
  local os

  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64) arch="x86_64" ;;
    aarch64|arm64) arch="aarch64" ;;
    *) echo "Error: unsupported architecture: $arch"; exit 1 ;;
  esac

  os="$(uname -s)"
  case "$os" in
    Darwin)
      os="apple-darwin"
      ;;
    Linux)
      os="unknown-linux-gnu"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      os="pc-windows-msvc"
      ;;
    *)
      echo "Error: unsupported OS: $os"
      exit 1
      ;;
  esac

  echo "${arch}-${os}"
}

TARGET_TRIPLE="${TARGET_TRIPLE:-$(detect_triple)}"
echo "Target triple: $TARGET_TRIPLE"

# ------------------------------------------------------------------
# 2. Build Next.js standalone output
# ------------------------------------------------------------------
echo "==> Building Next.js (standalone)..."
cd "$PROJECT_DIR"
pnpm build

# ------------------------------------------------------------------
# 2.5 Flatten standalone node_modules (resolve pnpm symlinks)
# ------------------------------------------------------------------
echo "==> Flattening standalone node_modules (resolving symlinks)..."
STANDALONE_NM="$PROJECT_DIR/.next/standalone/node_modules"

# Remove broken symlinks first
find "$STANDALONE_NM" -type l ! -exec test -e {} \; -delete 2>/dev/null || true

# Resolve remaining symlinks to actual files/directories
cp -rL "$STANDALONE_NM" "${STANDALONE_NM}_flat"
rm -rf "$STANDALONE_NM"
mv "${STANDALONE_NM}_flat" "$STANDALONE_NM"

# Copy public/ dir if missing (Next.js standalone doesn't include it)
if [ ! -d "$PROJECT_DIR/.next/standalone/public" ] && [ -d "$PROJECT_DIR/public" ]; then
  cp -r "$PROJECT_DIR/public" "$PROJECT_DIR/.next/standalone/public"
fi

# ------------------------------------------------------------------
# 2.6 Probe migrations and restore runtime modules Turbopack traced away
# ------------------------------------------------------------------
# `scripts/migrate.mjs` resolves @libsql/client and drizzle-orm from
# server/node_modules at runtime, but Next.js standalone tracing bundles
# app deps into chunks, so the packages are missing from the standalone
# output and the bundled script dies with ERR_MODULE_NOT_FOUND — killing
# the app window on startup. Run the migration in an isolated copy of the
# standalone output to catch every module the runtime needs, and restore
# each missing package into the real output.
STANDALONE_RUNTIME="$PROJECT_DIR/.next/standalone"
mkdir -p "$STANDALONE_RUNTIME/scripts"
cp -r "$PROJECT_DIR/scripts/migrate.mjs" "$STANDALONE_RUNTIME/scripts/"
if [ -d "$PROJECT_DIR/drizzle" ] && [ ! -d "$STANDALONE_RUNTIME/drizzle" ]; then
  cp -r "$PROJECT_DIR/drizzle" "$STANDALONE_RUNTIME/drizzle"
fi
PROBE_DIR="$(mktemp -d)"
PROBE_NM="$PROBE_DIR/node_modules"
cp -rL "$STANDALONE_NM" "$PROBE_NM"
cp -r "$STANDALONE_RUNTIME/scripts" "$PROBE_DIR/scripts"
cp -r "$STANDALONE_RUNTIME/drizzle" "$PROBE_DIR/drizzle"
for attempt in $(seq 1 40); do
  if probe_out=$(cd "$PROBE_DIR" && DATABASE_URL="file:probe.db" NODE_ENV=production node scripts/migrate.mjs 2>&1); then
    probe_code=0
  else
    probe_code=$?
  fi
  if [ "$probe_code" -eq 0 ]; then
    rm -f "$PROBE_DIR/probe.db"
    echo "==> Migration probe OK"
    break
  fi
  pkg=$(PROBE_OUT="$probe_out" node -e "
const s = process.env.PROBE_OUT;
const m = s.match(/Cannot find (?:package|module) '([^']+)'/);
if (m) {
  const t = m[1];
  if (!/[\\\\/]/.test(t)) { console.log(t); process.exit(0); }
  const seg = t.match(/node_modules[\\\\/]((?:@[^\\\\/]+[\\\\/][^\\\\/]+)|[^\\\\/]+)/);
  if (seg) console.log(seg[1]);
}
" || true)
  if [ -z "$pkg" ]; then
    echo "Migration probe failed, cannot identify missing package:"
    echo "$probe_out"
    exit 1
  fi
  PKG_SRC="$PROJECT_DIR/node_modules/$pkg"
  if [ ! -d "$PKG_SRC" ]; then
    PKG_SRC=$(cd "$PROJECT_DIR" && node -e "console.log(require('path').dirname(require.resolve('$pkg/package.json')))" 2>/dev/null || true)
  fi
  if [ -z "$PKG_SRC" ] || [ ! -d "$PKG_SRC" ]; then
    PKG_SRC=$(find "$PROJECT_DIR/node_modules/.pnpm" -type d -path "*/node_modules/$pkg" 2>/dev/null | head -1 || true)
  fi
  if [ -z "$PKG_SRC" ] || [ ! -d "$PKG_SRC" ]; then
    echo "Migration probe failed, missing package $pkg not found in project node_modules:"
    echo "$probe_out"
    exit 1
  fi
  echo "==> Probe: restoring $pkg into standalone node_modules"
  rm -rf "$STANDALONE_NM/$pkg"
  cp -rL "$PKG_SRC" "$STANDALONE_NM/$pkg"
  rm -rf "$PROBE_NM/$pkg"
  cp -rL "$PKG_SRC" "$PROBE_NM/$pkg"
done
rm -rf "$PROBE_DIR"
trap - EXIT
if [ "$probe_code" -ne 0 ]; then
  echo "Error: migration probe failed after 40 attempts"
  exit 1
fi

# ------------------------------------------------------------------
# 3. Determine Node.js download URL for the target
# ------------------------------------------------------------------
get_node_os() {
  case "$1" in
    *apple-darwin*)    echo "darwin" ;;
    *pc-windows-msvc*) echo "win" ;;
    *linux-gnu*)       echo "linux" ;;
    *) echo "Error: unknown OS in triple: $1"; exit 1 ;;
  esac
}

get_node_arch() {
  case "$1" in
    x86_64-*)   echo "x64" ;;
    aarch64-*)  echo "arm64" ;;
    *) echo "Error: unknown arch in triple: $1"; exit 1 ;;
  esac
}

NODE_OS="$(get_node_os "$TARGET_TRIPLE")"
NODE_ARCH="$(get_node_arch "$TARGET_TRIPLE")"

# Map Tauri triples to Node.js dist filenames
#   darwin-x64   →  node-v22.14.0-darwin-x64.tar.gz
#   darwin-arm64 →  node-v22.14.0-darwin-arm64.tar.gz
#   win-x64      →  node-v22.14.0-win-x64.zip
NODE_DIR="node-v${NODE_VERSION}-${NODE_OS}-${NODE_ARCH}"
case "$NODE_OS" in
  win)
    NODE_ARCHIVE="${NODE_DIR}.zip"
    ;;
  *)
    NODE_ARCHIVE="${NODE_DIR}.tar.gz"
    ;;
esac

NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE}"

# ------------------------------------------------------------------
# 4. Download and extract Node.js binary
# ------------------------------------------------------------------
mkdir -p "$TAURI_BIN_DIR"

# Determine sidecar binary filename suffix
case "$TARGET_TRIPLE" in
  *windows*)
    SIDECAR_FILE="${SIDECAR_NAME}-${TARGET_TRIPLE}.exe"
    ;;
  *)
    SIDECAR_FILE="${SIDECAR_NAME}-${TARGET_TRIPLE}"
    ;;
esac

SIDECAR_PATH="$TAURI_BIN_DIR/$SIDECAR_FILE"

if [ -f "$SIDECAR_PATH" ]; then
  echo "==> Sidecar already exists: $SIDECAR_PATH (skipping download)"
else
  echo "==> Downloading Node.js v${NODE_VERSION} for ${NODE_OS}-${NODE_ARCH}..."
  echo "    URL: $NODE_URL"

  TMP_DIR="$(mktemp -d)"
  TMP_ARCHIVE="$TMP_DIR/$NODE_ARCHIVE"

  if command -v curl &>/dev/null; then
    curl -fsSL "$NODE_URL" -o "$TMP_ARCHIVE"
  elif command -v wget &>/dev/null; then
    wget -q "$NODE_URL" -O "$TMP_ARCHIVE"
  else
    echo "Error: need curl or wget"
    exit 1
  fi

  echo "==> Extracting Node.js binary..."
  case "$NODE_OS" in
    win)
      unzip -q "$TMP_ARCHIVE" -d "$TMP_DIR"
      EXTRACTED_NODE="$TMP_DIR/$NODE_DIR/node.exe"
      ;;
    *)
      tar -xzf "$TMP_ARCHIVE" -C "$TMP_DIR"
      EXTRACTED_NODE="$TMP_DIR/$NODE_DIR/bin/node"
      ;;
  esac

  if [ ! -f "$EXTRACTED_NODE" ]; then
    echo "Error: Node binary not found at $EXTRACTED_NODE"
    ls -la "$TMP_DIR/$NODE_DIR/" 2>/dev/null || true
    exit 1
  fi

  cp "$EXTRACTED_NODE" "$SIDECAR_PATH"
  chmod +x "$SIDECAR_PATH"

  # On macOS we must ad-hoc sign the copied binary
  if [[ "$TARGET_TRIPLE" == *apple-darwin* ]] && command -v codesign &>/dev/null; then
    echo "==> Ad-hoc signing sidecar..."
    codesign --force --sign - "$SIDECAR_PATH" 2>/dev/null || true
  fi

  rm -rf "$TMP_DIR"
  echo "==> Sidecar ready: $SIDECAR_PATH ($(du -h "$SIDECAR_PATH" | cut -f1))"
fi

echo "==> Build sidecar complete."
