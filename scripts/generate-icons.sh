#!/usr/bin/env bash
# generate-icons.sh
# Generates placeholder icons for Dayflow Tauri app.
# Replace with real icons before shipping.
#
# Usage: bash scripts/generate-icons.sh
#
# Dependencies: ImageMagick (convert) or a Node.js runtime.
# Falls from ImageMagick → Node.js PNG generation → error.
#
set -euo pipefail

ICONS_DIR="$(cd "$(dirname "$0")/../src-tauri/icons" && pwd)"
mkdir -p "$ICONS_DIR"

# ------------------------------------------------------------------
# Strategy 1: ImageMagick (preferred)
# ------------------------------------------------------------------
if command -v convert &>/dev/null; then
  echo "==> Generating icons with ImageMagick..."

  # Create a simple gradient-square SVG source
  TMP_SVG=$(mktemp).svg
  cat > "$TMP_SVG" <<'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#bg)"/>
  <text x="256" y="300" font-family="system-ui,sans-serif" font-size="240"
        font-weight="bold" fill="white" text-anchor="middle">D</text>
  <text x="256" y="440" font-family="system-ui,sans-serif" font-size="64"
        fill="rgba(255,255,255,0.8)" text-anchor="middle">dayflow</text>
</svg>
SVGEOF

  # Generate required icon sizes
  convert "$TMP_SVG" -resize 32x32   "$ICONS_DIR/32x32.png"
  convert "$TMP_SVG" -resize 128x128 "$ICONS_DIR/128x128.png"
  convert "$TMP_SVG" -resize 256x256 "$ICONS_DIR/128x128@2x.png"

  # macOS .icns (requires ImageMagick to handle .icns or we use iconutil)
  if command -v iconutil &>/dev/null; then
    echo "==> Generating .icns via iconutil..."
    TMP_ICONSET="$ICONS_DIR/../Dayflow.iconset"
    mkdir -p "$TMP_ICONSET"
    convert "$TMP_SVG" -resize 16x16   "$TMP_ICONSET/icon_16x16.png"
    convert "$TMP_SVG" -resize 32x32   "$TMP_ICONSET/icon_16x16@2x.png"
    convert "$TMP_SVG" -resize 32x32   "$TMP_ICONSET/icon_32x32.png"
    convert "$TMP_SVG" -resize 64x64   "$TMP_ICONSET/icon_32x32@2x.png"
    convert "$TMP_SVG" -resize 128x128 "$TMP_ICONSET/icon_128x128.png"
    convert "$TMP_SVG" -resize 256x256 "$TMP_ICONSET/icon_128x128@2x.png"
    convert "$TMP_SVG" -resize 256x256 "$TMP_ICONSET/icon_256x256.png"
    convert "$TMP_SVG" -resize 512x512 "$TMP_ICONSET/icon_256x256@2x.png"
    convert "$TMP_SVG" -resize 512x512 "$TMP_ICONSET/icon_512x512.png"
    iconutil -c icns "$TMP_ICONSET" -o "$ICONS_DIR/icon.icns"
    rm -rf "$TMP_ICONSET"
  else
    # Fallback: create a minimal valid .icns using the 128x128 PNG
    cp "$ICONS_DIR/128x128.png" "$ICONS_DIR/icon.icns"
    echo "  (iconutil not found — using PNG as placeholder .icns)"
  fi

  # Windows .ico
  convert "$TMP_SVG" -define icon:auto-resize=256,128,64,48,32,16 "$ICONS_DIR/icon.ico"

  rm -f "$TMP_SVG"
  echo "==> Icons generated in $ICONS_DIR"
  exit 0
fi

# ------------------------------------------------------------------
# Strategy 2: Node.js (fallback)
# ------------------------------------------------------------------
if command -v node &>/dev/null; then
  echo "==> Generating icons with Node.js (minimal PNGs)..."

  node -e "
const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 blue PNG
function createMinimalPNG() {
  // PNG sig + IHDR (1x1 RGB) + IDAT (raw scanline) + IEND
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);             // length
  ihdr.write('IHDR', 4);                  // chunk type
  ihdr.writeUInt32BE(1, 8);              // width
  ihdr.writeUInt32BE(1, 12);             // height
  ihdr[16] = 8;                           // bit depth
  ihdr[17] = 2;                           // color type (RGB)
  const crcIHDR = crc32(ihdr.slice(4, 21));
  ihdr.writeUInt32BE(crcIHDR, 21);       // CRC

  // IDAT: zlib-compressed scanline (filter byte 0 + RGB)
  const raw = Buffer.from([0, 99, 102, 245]); // filter=0, R=99, G=102, B=245 (indigo)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(raw);
  const idat = Buffer.alloc(12 + compressed.length);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const crcIDAT = crc32(idat.slice(4, 8 + compressed.length));
  idat.writeUInt32BE(crcIDAT, 8 + compressed.length);

  const iend = Buffer.alloc(12);
  iend.writeUInt32BE(0, 0);
  iend.write('IEND', 4);
  const crcIEND = crc32(iend.slice(4, 8));
  iend.writeUInt32BE(crcIEND, 8);

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const outDir = '${ICONS_DIR}';
fs.mkdirSync(outDir, { recursive: true });

// Write placeholder PNGs
const png = createMinimalPNG();
fs.writeFileSync(path.join(outDir, '32x32.png'), png);
fs.writeFileSync(path.join(outDir, '128x128.png'), png);
fs.writeFileSync(path.join(outDir, '128x128@2x.png'), png);
fs.writeFileSync(path.join(outDir, 'icon.icns'), png);    // not valid ICNS but enough for dev
fs.writeFileSync(path.join(outDir, 'icon.ico'), png);      // not valid ICO but enough for dev
console.log('Placeholder icons written to', outDir);
console.log('WARNING: Replace with real icons before shipping!');
"
  exit 0
fi

# ------------------------------------------------------------------
# No tools available
# ------------------------------------------------------------------
echo "Error: need ImageMagick (convert) or Node.js to generate icons."
echo "Install one and re-run this script, or manually place icons in:"
echo "  $ICONS_DIR"
echo ""
echo "Required files: 32x32.png, 128x128.png, 128x128@2x.png, icon.icns, icon.ico"
exit 1
