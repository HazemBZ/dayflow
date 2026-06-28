"use client";

import { useSyncExternalStore, useCallback } from "react";
import { format } from "date-fns";
import { Square } from "lucide-react";
import { timerStore, type TimerSnapshot } from "@/lib/timer-store";
import { clockStore } from "@/lib/clock-store";
import { Button } from "@/components/ui/button";
import { logSkillSession } from "@/lib/actions/daily";

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

  const handleStop = useCallback(() => {
    const snap = timerStore.getSnapshot();
    if (!snap.activity) return;

    const elapsedMs = timerStore.stop();
    const durationMinutes = Math.round(elapsedMs / 1000 / 60);
    if (durationMinutes < 1) return;

    const today = format(new Date(), "yyyy-MM-dd");
    logSkillSession({
      date: today,
      skill: snap.activity,
      durationMinutes,
      notes: snap.activity,
    }).catch(() => {});
  }, []);

  if (running) {
    const elapsedSeconds = Math.floor(elapsed / 1000);
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return (
      <span className="inline-flex items-center gap-1">
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
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={handleStop}
          aria-label="Stop timer"
          className="text-primary hover:text-primary/80"
        >
          <Square className="size-3" />
        </Button>
      </span>
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
