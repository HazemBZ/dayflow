"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { scaleStore } from "@/lib/scale-store";

export function ScaleProvider({ children }: { children: ReactNode }) {
  const scale = useSyncExternalStore(
    scaleStore.subscribe,
    scaleStore.getSnapshot,
    scaleStore.getServerSnapshot,
  );

  useEffect(() => {
    // Scale base rem unit — Tailwind uses rem for ALL spacing (p-4, gap-3, h-4, etc.)
    // This scales text, layout, icons uniformly without touching CSS transforms.
    // Borders (1px) stay thin — acceptable tradeoff for animation compatibility.
    document.documentElement.style.fontSize = `${scale * 100}%`;
  }, [scale]);

  return <>{children}</>;
}
