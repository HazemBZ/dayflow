export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6 px-4 md:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="space-y-3 rounded-xl border bg-background px-5 py-4 shadow-sm">
        <div className="h-7 w-36 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted/60" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Category grid skeletons (6 cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-muted" />
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="h-5 w-5 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>

      {/* Daily Breakdown skeleton */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-36 animate-pulse rounded bg-muted/60" />
                <div className="h-3 w-10 animate-pulse rounded bg-muted/60" />
              </div>
              <div className="h-8 w-full animate-pulse rounded-lg bg-muted/30" />
              <div className="h-8 w-3/4 animate-pulse rounded-lg bg-muted/20" />
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Summary skeleton */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-56 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
              </div>
              <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
