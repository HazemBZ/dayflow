export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6 px-4 md:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="space-y-2 rounded-xl border bg-background px-5 py-4 shadow-sm">
        <div className="h-7 w-28 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/60" />
      </div>

      {/* UI Scale skeleton */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>

      {/* Deep Work Activities skeleton */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-muted/30" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 w-20 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Weekly Targets skeleton */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted/30" />
          ))}
        </div>
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Scorecard Fields skeleton */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted/30" />
          ))}
        </div>
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
