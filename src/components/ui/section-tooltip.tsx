"use client";

import { useState, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";

interface SectionTooltipProps {
  children: ReactNode;
}

export function SectionTooltip({ children }: SectionTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        aria-label="About this section"
      >
        <HelpCircle className="h-3 w-3" />
        {open ? "Hide info" : "What's this?"}
      </button>

      {open && (
        <div className="mt-1.5 w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-muted-foreground shadow-xs">
          {children}
        </div>
      )}
    </div>
  );
}
