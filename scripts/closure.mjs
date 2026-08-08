/**
 * Resolve the runtime dependency closure of scripts/migrate.mjs and copy
 * every package into the standalone node_modules directory.
 *
 * Next.js standalone tracing bundles app deps into chunks, so packages that
 * migrate.mjs imports at runtime (@libsql/client, drizzle-orm and their
 * transitive deps) are missing from .next/standalone/node_modules. The
 * bundled script dies with ERR_MODULE_NOT_FOUND at startup.
 *
 * Usage: node scripts/closure.mjs <project-dir> <standalone-node_modules>
 */
import { join, dirname } from "node:path";
import { readFileSync, existsSync, cpSync, mkdirSync, realpathSync, rmSync } from "node:fs";

const [projectDir, targetNm] = process.argv.slice(2);

// Emulate Node's package directory lookup: walk up from `fromDir` checking
// node_modules/<pkg> at each level. Does not rely on package entry points,
// so it works for packages with exports maps lacking a "." entry.
function findPkgDir(pkg, fromDir) {
  let dir = fromDir;
  while (true) {
    const candidate = join(dir, "node_modules", pkg);
    if (existsSync(join(candidate, "package.json"))) return realpathSync(candidate);
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const pkgDirs = new Map(); // pkg name -> resolved dir (resolution base for its deps)
const queue = [{ name: "@libsql/client", optional: false }, { name: "drizzle-orm", optional: false }];

// Next.js's own runtime deps are also dropped by standalone tracing: the
// bundled server boots via server.js → next/dist/server/next.js → config.js,
// which require()s @next/env, @swc/helpers, styled-jsx, postcss, etc. from
// node_modules at runtime (see DAYFLOW issue: MODULE_NOT_FOUND @swc/helpers
// on first launch). Seed them from next's own dir inside the pnpm store.
const nextDir = findPkgDir("next", projectDir);
if (nextDir) {
  const nextManifest = JSON.parse(readFileSync(join(nextDir, "package.json"), "utf8"));
  for (const dep of Object.keys(nextManifest.dependencies ?? {})) {
    pkgDirs.set(dep, nextDir);
    queue.push({ name: dep, optional: false });
  }
}

const seen = new Set();
let copied = 0;

while (queue.length > 0) {
  const { name: pkg, optional } = queue.shift();
  if (seen.has(pkg)) continue;
  seen.add(pkg);

  // Transitive deps resolve from the dependent's dir (pnpm nests packages
  // inside the store: @libsql/core lives under @libsql/client's node_modules).
  const fromDir = pkgDirs.get(pkg) ?? projectDir;
  const src = findPkgDir(pkg, fromDir);
  if (!src) {
    if (optional) continue; // per-platform native bindings absent on other builders
    console.error(`closure: cannot resolve ${pkg} from ${fromDir}`);
    process.exit(1);
  }
  pkgDirs.set(pkg, src);

  const dest = join(targetNm, pkg);
  console.log(`==> Restoring ${pkg} into standalone node_modules`);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true, dereference: true });
  copied++;

  const manifest = JSON.parse(readFileSync(join(src, "package.json"), "utf8"));
  for (const section of ["dependencies", "optionalDependencies"]) {
    for (const dep of Object.keys(manifest[section] ?? {})) {
      if (seen.has(dep)) continue;
      // Record the resolution base for each dep so it resolves from
      // *this* package's dir (pnpm nests deps in the package's own
      // node_modules inside the store).
      pkgDirs.set(dep, src);
      queue.push({ name: dep, optional: section === "optionalDependencies" });
    }
  }
}

console.log(`closure: restored ${copied} package(s), ${seen.size} in closure`);
