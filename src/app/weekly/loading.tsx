export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6 px-4 md:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="space-y-3 rounded-xl border bg-background px-5 py-4 shadow-sm">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      {/* Plan + Leadership row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Weekly Targets skeleton (2 cols) */}
        <div className="md:col-span-2 space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-56 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
                <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>

        {/* Leadership skeleton (1 col) */}
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="flex justify-end">
            <div className="h-9 w-16 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>

      {/* Scorecard skeleton */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <div className="h-5 w-44 animate-pulse rounded bg-muted" />
          <div className="h-3 w-52 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
              <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
            </div>
          ))}
          <div className="flex items-end pb-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-muted/60" />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Time + Skills row */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted/60" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted/60" />
              </div>
              <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-44 animate-pulse rounded bg-muted/60" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                <div className="h-3 w-8 animate-pulse rounded bg-muted/60" />
              </div>
              <div className="h-3 w-10 animate-pulse rounded bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
