"use client";

import { useSyncExternalStore } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SCALE_PRESETS, scaleStore } from "@/lib/scale-store";

export function ScaleSection() {
  const currentScale = useSyncExternalStore(
    scaleStore.subscribe,
    scaleStore.getSnapshot,
    scaleStore.getServerSnapshot,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>UI Scale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Adjust interface size for your display. Scales all UI elements
          uniformly — useful for high-resolution or larger displays.
        </p>
        <div className="flex flex-wrap gap-2">
          {SCALE_PRESETS.map((scale) => {
            const active = currentScale === scale;
            const label = scale === 1 ? "100%" : `${Math.round(scale * 100)}%`;
            return (
              <button
                key={scale}
                onClick={() => scaleStore.set(scale)}
                className={
                  active
                    ? "rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all"
                    : "rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
