"use client";

import { useSyncExternalStore } from "react";
import { format } from "date-fns";
import { timerStore } from "@/lib/timer-store";
import { clockStore } from "@/lib/clock-store";

export function LiveClock() {
  const now = useSyncExternalStore(
    clockStore.subscribe,
    clockStore.getSnapshot,
    clockStore.getServerSnapshot,
  );
  const { elapsed, running } = useSyncExternalStore(
    timerStore.subscribe,
    timerStore.getSnapshot,
    timerStore.getServerSnapshot,
  );

  if (running) {
    const elapsedSeconds = Math.floor(elapsed / 1000);
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return (
      <time
        className="font-mono text-sm tabular-nums tracking-tight text-primary"
        dateTime={`PT${elapsedSeconds}S`}
        title="Deep work session in progress"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          {m.toString().padStart(2, "0")}:{s.toString().padStart(2, "0")}
        </span>
      </time>
    );
  }

  return (
    <time
      className="font-mono text-sm tabular-nums tracking-tight text-muted-foreground"
      dateTime={now.toISOString()}
      title={format(now, "EEEE, MMMM d, yyyy")}
    >
      {format(now, "HH:mm:ss")}
    </time>
  );
}
