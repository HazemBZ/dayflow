/**
 * Rewrite Turbopack's content-hashed external module ids back to real
 * package names in the standalone output.
 *
 * Next.js 16.1+ (Turbopack) emits external module references with a
 * content-based hash suffix, e.g. `import("@libsql/client-7664182d7c51b711")`
 * instead of `import("@libsql/client")` (upstream regression:
 * https://github.com/vercel/next.js/issues/87737). The hashed id matches no
 * installed package, so standalone output crashes at runtime with
 * ERR_MODULE_NOT_FOUND — exactly the "internal server error" / blank-app
 * symptom when the webview hits the bundled Next server.
 *
 * This script rewrites every `<pkg>-<16hex>` specifier back to `<pkg>`
 * inside .next/server output, then FAILS if any hashed id remains (so the
 * build cannot silently ship broken external references again).
 *
 * Usage: node scripts/rewrite-hashed-externals.mjs <standalone-dir>
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";

const [standaloneDir] = process.argv.slice(2);
if (!standaloneDir) {
  console.error("usage: node scripts/rewrite-hashed-externals.mjs <standalone-dir>");
  process.exit(1);
}

const TARGET_DIR = join(standaloneDir, ".next", "server");
// Turbopack appends a 16-hex content hash to external package ids.
const HASHED_ID_RE = /([@\w][\w.-]*\/[\w.-]+)-([0-9a-f]{16}|[0-9a-f]{20})/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      walk(p, out);
    } else if (p.endsWith(".js")) {
      out.push(p);
    }
  }
  return out;
}

const files = existsSync(TARGET_DIR) ? walk(TARGET_DIR) : [];
if (files.length === 0) {
  console.error(`rewrite: no .next/server output found under ${TARGET_DIR}`);
  process.exit(1);
}

const rewriter = new Map();
const remaining = new Map();

for (const file of files) {
  let content = readFileSync(file, "utf8");
  let changed = false;

  // Rewrite hashed ids to base package names.
  content = content.replace(HASHED_ID_RE, (match, pkg, _hash) => {
    changed = true;
    rewriter.set(match, pkg);
    return pkg;
  });

  // Track any hashes that survive (id not matching the `<pkg>-<hash>` shape,
  // e.g. a different hashing scheme — fail loudly rather than ship a broken
  // standalone).
  const leftover = content.match(/[@\w][\w.-]*\/[\w.-]+-[0-9a-f]{16}/g) ?? [];
  for (const id of leftover) {
    remaining.set(id, (remaining.get(id) ?? 0) + 1);
  }

  if (changed) {
    writeFileSync(file, content);
    console.log(`rewrite: ${relative(standaloneDir, file)}`);
  }
}

if (rewriter.size > 0) {
  console.log(`rewrite: rewritten hashed external ids ->`);
  for (const [from, to] of rewriter) {
    console.log(`  ${from} -> ${to}`);
  }
} else {
  console.log("rewrite: no hashed external ids found (fresh build?)");
}

if (remaining.size > 0) {
  console.error("rewrite: hashed external ids remained after rewrite:");
  for (const [id, count] of remaining) {
    console.error(`  ${id} (${count})`);
  }
  process.exit(1);
}

console.log("rewrite: done.");