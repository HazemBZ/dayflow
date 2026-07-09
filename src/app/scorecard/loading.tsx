export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6 px-4 md:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="space-y-2 rounded-xl border bg-background px-5 py-4 shadow-sm">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted/60" />
      </div>

      {/* Applications Chart skeleton */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <div className="h-5 w-44 animate-pulse rounded bg-muted" />
          <div className="h-3 w-52 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted/30" />
      </div>

      {/* Learning Hours Chart skeleton */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="h-3 w-56 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted/30" />
      </div>

      {/* Combined Overview Chart skeleton */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <div className="h-5 w-44 animate-pulse rounded bg-muted" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="h-72 w-full animate-pulse rounded-lg bg-muted/30" />
      </div>

      {/* Recent Scores Table skeleton */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="space-y-2">
          <div className="h-8 w-full animate-pulse rounded bg-muted/30" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-muted/20" />
          ))}
        </div>
      </div>
    </div>
  );
}
