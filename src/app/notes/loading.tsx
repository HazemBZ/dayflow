export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 py-6 px-4 md:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between rounded-xl border bg-background px-5 py-4 shadow-sm">
        <div className="space-y-2">
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Note card skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
            <div className="flex gap-1">
              <div className="h-7 w-7 animate-pulse rounded bg-muted" />
              <div className="h-7 w-7 animate-pulse rounded bg-muted" />
              <div className="h-7 w-7 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted/30" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/30" />
          </div>
        </div>
      ))}
    </div>
  );
}
