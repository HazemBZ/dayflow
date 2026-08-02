# Dayflow Quality and Performance Audit

**Date:** 2026-07-30
**Audited commit:** `9642f47`
**Status:** Saved for later planning
**Scope:** Correctness, security, performance, tests, architecture, dependencies, migrations, DX, documentation, and product direction.

## Executive summary

Dayflow builds successfully, passes TypeScript checking, and serves all tested routes. Its highest-leverage improvements are establishing a reliable release verification gate, adding regression tests, protecting user data before automatic migrations, patching runtime dependencies, and fixing two mutation correctness defects.

Performance findings are primarily source-based projections. Browser profiling was unavailable, so canvas and global-loading optimizations should be measured with representative data before implementation.

## Verification results

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit --pretty false` | Passed |
| `pnpm build` | Passed; 13 static pages generated |
| `pnpm exec eslint src` | Failed with 4 errors and 8 warnings |
| `pnpm lint` | Failed and traversed generated `src-tauri/target/**` output |
| `pnpm audit --prod` | 22 advisories: 12 high, 10 moderate |
| Production route smoke test | 10 tested routes returned HTTP 200 |
| Warm local HTTP timing | Approximately 5–10 ms TTFB |
| Automated tests | No tracked test/spec files found |

Tested routes: `/`, `/settings`, `/canvas`, `/history`, `/weekly`, `/horizon`, `/scorecard`, `/budget`, `/notes`, and `/bugs`.

## Prioritized findings

### 1. Release verification is unreliable

- **Category:** DX / release integrity
- **Impact:** HIGH
- **Effort:** M
- **Fix risk:** LOW
- **Confidence:** HIGH
- **Evidence:**
  - `package.json:5-14` has no `test` or `typecheck` scripts.
  - `.github/workflows/release.yml:66-113` proceeds from dependency installation to the Tauri build without explicit lint, typecheck, or test gates.
  - `eslint.config.mjs:9-15` does not ignore `src-tauri/target/**`, causing root lint to scan generated build output.
  - Source-only lint still reports four `react-hooks/set-state-in-effect` errors and eight warnings.
  - `ROADMAP.yaml:127-149` marks lint cleanup and final verification completed, contradicting current state.
- **Fix sketch:** Add explicit lint, typecheck, and test scripts; exclude generated Tauri output; clear source lint failures; require these checks before release builds.

### 2. Critical workflows have no automated regression tests

- **Category:** Test coverage
- **Impact:** HIGH
- **Effort:** L
- **Fix risk:** MED
- **Confidence:** HIGH
- **Evidence:** No tracked `*.test.*` or `*.spec.*` files exist. Untested high-value flows include dashboard save/reorder/toggle, notes and bugs CRUD, canvas movement and deletion, weekly saves, and history refresh.
- **Fix sketch:** Start with characterization tests around mutation actions and stores, then add focused end-to-end scenarios for dashboard, notes, canvas, and weekly review.

### 3. Automatic migrations lack a repository-backed backup and restore path

- **Category:** Data durability
- **Impact:** HIGH
- **Effort:** M
- **Fix risk:** MED
- **Confidence:** MED
- **Evidence:**
  - `scripts/update.sh:20-21` runs migrations before service restart.
  - `scripts/dayflow.service:8` runs migrations before every service start.
  - `src-tauri/src/lib.rs:147-152` runs migrations before desktop sidecar startup.
  - No backup, restore, SQLite `.backup`, or `VACUUM INTO` workflow was found in first-party scripts or documentation.
- **Fix sketch:** Create a timestamped SQLite backup before migration, retain a bounded history, document restore steps, and fail safely if backup creation fails.

### 4. Runtime dependencies contain patched vulnerabilities

- **Category:** Dependencies / security
- **Impact:** MED
- **Effort:** S
- **Fix risk:** LOW–MED
- **Confidence:** HIGH
- **Evidence:**
  - `package.json:30` pins Next.js `16.2.9`; reported Next advisories are patched in `>=16.2.11`.
  - Direct Next dependency paths include Server Action and App Router advisories plus Sharp and PostCSS advisories.
  - `package.json:39` places the `shadcn` CLI in runtime dependencies, causing CLI-only Hono, AJV, js-yaml, and related advisories to appear in production audit results.
- **Fix sketch:** Upgrade Next.js and compatible React packages to current patched releases, verify which Sharp/PostCSS advisories remain, and move `shadcn` to development dependencies.

### 5. New records receive incorrect sort positions

- **Category:** Correctness
- **Impact:** MED
- **Effort:** S
- **Fix risk:** LOW
- **Confidence:** HIGH
- **Evidence:**
  - `src/lib/actions/deep-work.ts:20-26`
  - `src/lib/actions/field-config.ts:47-53`
  - `src/lib/actions/daily.ts:176-188`

  These paths order ascending and take the first row while treating it as the maximum sort value. New entries can reuse low sort positions instead of appending after the current maximum.
- **Fix sketch:** Query descending with `limit(1)` or use a `max()` aggregate. Add tests proving the next value equals the current maximum plus one.

### 6. Optimistic outcome mutations discard persistence failures

- **Category:** Correctness / error handling
- **Impact:** MED
- **Effort:** S–M
- **Fix risk:** MED
- **Confidence:** HIGH
- **Evidence:**
  - `src/components/dashboard/top-outcomes.tsx:268-307` updates local completion and ordering state, then invokes `onToggle` and `onReorder` without awaiting or handling their promises.
  - `src/app/page.tsx:166-195` shows these handlers perform asynchronous persistence followed by data refetching.
- **Impact detail:** Failed writes can leave stale optimistic UI or produce unhandled promise rejections.
- **Fix sketch:** Await mutations, expose pending state, and restore prior state or reload the affected data after failure.

### 7. `db:push` contradicts the documented migration policy

- **Category:** Migrations / operator safety
- **Impact:** MED
- **Effort:** S
- **Fix risk:** LOW
- **Confidence:** HIGH
- **Evidence:** `package.json:11` exposes `db:push`, while `README.md:80-84` explicitly warns that using it bypasses migration tracking and can break deployment.
- **Fix sketch:** Remove the normal script or rename and guard it as an exceptional administrative operation. Keep `db:generate` plus `db:migrate` as the supported workflow.

### 8. Canvas contains quadratic hot-path scans

- **Category:** Performance
- **Impact:** MED, projected
- **Effort:** M
- **Fix risk:** MED
- **Confidence:** MED for runtime impact; HIGH for algorithmic evidence
- **Evidence:**
  - `src/app/canvas/page.tsx:176-244` repeatedly scans notes while constructing React Flow nodes.
  - `src/app/canvas/page.tsx:277-282` performs `baseChildren.find` inside a map during frame dragging.
  - `src/app/canvas/page.tsx:302-315` scans generic nodes per moved child.
  - `src/app/canvas/page.tsx:438-478` performs repeated membership and node lookups.
  - `src/app/canvas/page.tsx:510-512` nests `filter` and `some` for unplaced notes.
- **Fix sketch:** Profile with representative canvas sizes, then pre-index records with `Map` and `Set` structures and derive lookup tables once per source change.

### 9. Every route eagerly loads all notes and bug notes

- **Category:** Performance
- **Impact:** LOW–MED, projected
- **Effort:** S–M
- **Fix risk:** LOW–MED
- **Confidence:** MED for runtime impact; HIGH for source behavior
- **Evidence:**
  - `src/app/layout.tsx:66-74` mounts `NotesPopover` on every route.
  - `src/components/ui/notes-popover.tsx:180-217` immediately loads both complete stores before the popover opens.
  - `src/lib/notes-store.ts:104-110` and `src/lib/bug-notes-store.ts:108-114` serialize complete arrays to derive snapshot identity.
- **Fix sketch:** Load on first open or during idle time, cache the result, and avoid whole-array serialization for snapshot invalidation.

## Investigate before planning

### Database indexes

Date and canvas foreign-key indexes may help at larger data volumes, but current evidence is insufficient for immediate work:

- History is capped at 90 daily logs.
- `daily_logs.date` already has a unique index.
- The `canvas_nodes` composite primary key begins with `canvasId`, supporting canvas lookup.
- Remaining candidates need realistic data volumes and SQLite query-plan evidence.

### Dashboard refetching

Dashboard mutations refetch four datasets in `src/app/page.tsx:154-245`. This is inefficient, but mutations are infrequent and warm local HTTP timing is fast. Fold this into mutation cleanup unless browser profiling demonstrates visible cost.

### Read-before-write upserts

Daily and weekly first-write races are possible across concurrent tabs. Current single-user local deployment makes impact low; unique constraints should turn most races into failed requests rather than silent duplication. Add concurrency tests before redesigning these paths.

## Considered and rejected

### Missing authentication as a high-severity vulnerability

Rejected as an active high-severity finding. Server actions have no authentication, but the documented deployment binds Next.js to `127.0.0.1` and uses local hosts-file routing through Caddy (`docs/service-setup.md:34-47`, `docs/caddy-setup.md:40-51`). Keep the local-only trust model explicit and reassess before any remote or multi-user deployment.

### Client-only routes as a proven performance defect

Rejected without browser evidence. Client route boundaries and large files are maintainability facts, but Lighthouse, bundle analysis, React Scan, and render profiles were unavailable.

### Duplicate migration runners

Rejected as a standalone defect. The TypeScript development runner and portable production ESM runner have different execution and path-resolution requirements. The duplicated logic is small; the contradictory `db:push` workflow is the concrete problem.

## Product direction options

These are optional product choices, not defects.

1. **Finish canvas as a spatial workspace.** `ROADMAP.yaml:150-184` still marks canvas in progress. Add note/bug-to-canvas entry points, bulk placement, and frame-level organization after canvas performance is measured.
2. **Unify notes and bugs capture.** Notes and bugs currently use parallel pages, stores, and detail flows. A shared typed record model could reduce drift while retaining filtered views and bug-specific metadata.
3. **Close the daily-to-strategy loop.** Daily, weekly, horizon, scorecard, and budget surfaces exist, but users synthesize them manually. Prototype one weekly review surface before expanding reporting further.

## Measurement limitations

- Playwright Chromium could not start because the required Chrome distribution was unavailable.
- Lighthouse mobile/desktop medians were not collected.
- React Scan/render-count profiling was not collected.
- Bundle-per-route analysis was not collected.
- Accessibility and responsive visual QA were not performed.
- Local warm TTFB does not measure hydration, interaction latency, or rendering cost.
- No deployed multi-user or high-volume database workload was tested.

## Recommended planning order

1. Establish verification scripts and release gates.
2. Add critical-flow characterization tests.
3. Add backup and restore protection before changing migration behavior.
4. Patch runtime dependencies.
5. Fix sort ordering and optimistic mutation handling.
6. Remove the contradictory `db:push` path.
7. Profile canvas and note-loading behavior with representative data before performance implementation.

Dependencies: verification baseline should precede risky refactors; backup protection should precede migration changes. Dependency patching and small correctness fixes can proceed in parallel once verification commands are available.
