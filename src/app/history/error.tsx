"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card size="sm" className="max-w-sm w-full text-center">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm text-muted-foreground">Something went wrong loading history.</p>
          <p className="text-xs text-muted-foreground/60">{error.message}</p>
          <Button onClick={reset} size="sm">Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
