/**
 * Next.js instrumentation hook.
 *
 * Workaround for React.cache memory leak under sustained load in Next.js 16.x
 * (https://github.com/vercel/next.js/discussions/88603).
 *
 * Periodically forces V8 GC to release accumulated cache entries that the
 * automatic GC doesn't collect quickly enough under continuous traffic.
 *
 * Requires NODE_OPTIONS=--expose-gc (set in systemd service env).
 */

export async function register() {
  if (typeof globalThis.gc !== "function") {
    console.warn(
      "[instrumentation] gc() not available — start with --expose-gc or NODE_OPTIONS=--expose-gc",
    );
    return;
  }

  // Force GC every 60s to prevent React.cache entries from accumulating
  setInterval(() => {
    globalThis.gc!();
  }, 60_000);

  console.log("[instrumentation] Periodic GC installed (60s interval)");
}
