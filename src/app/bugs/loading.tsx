export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 md:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between rounded-xl border bg-background px-5 py-4 shadow-sm">
        <div className="space-y-2">
          <div className="h-7 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Bug card skeletons - grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex gap-1.5">
              <div className="h-5 w-14 animate-pulse rounded bg-muted" />
              <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted/30" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted/30" />
            </div>
            <div className="mt-3 h-3 w-20 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
