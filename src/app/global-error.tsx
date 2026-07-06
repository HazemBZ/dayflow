"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="flex flex-col items-center gap-4 max-w-sm w-full rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">
            A critical error occurred.
          </p>
          <p className="text-xs text-muted-foreground/60">{error.message}</p>
          <button
            onClick={reset}
            className="inline-flex h-7 items-center justify-center rounded-lg border border-transparent bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/80 transition-all select-none"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
