"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageScrollProps {
  /** Static header shown at top, never scrolls */
  header: ReactNode;
  /** Content that scrolls independently below header */
  children: ReactNode;
  /** Tailwind max-width class on header + content (e.g. "max-w-5xl") */
  maxWidth?: string;
  /** Extra classes on the content wrapper (e.g. "space-y-6 pt-6") */
  scrollContentClass?: string;
}

/**
 * Page layout with fixed header + independently scrollable content.
 * Wheel events on the header area are forwarded to the scroll container.
 */
export function PageScroll({
  header,
  children,
  maxWidth = "",
  scrollContentClass = "",
}: PageScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const scroll = scrollRef.current;
    if (!outer || !scroll) return;

    const handler = (e: WheelEvent) => {
      if (!scroll.contains(e.target as Node)) {
        scroll.scrollBy({ top: e.deltaY });
      }
    };

    outer.addEventListener("wheel", handler, { passive: true });
    return () => outer.removeEventListener("wheel", handler);
  }, []);

  return (
    <div ref={outerRef} className="h-full flex flex-col">
      <div className={cn("flex-shrink-0 mx-auto w-full", maxWidth)}>
        {header}
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className={cn("mx-auto w-full pb-12", maxWidth, scrollContentClass)}>
          {children}
        </div>
      </div>
    </div>
  );
}
