"use client";

import { format, getISOWeek, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface HeaderProps {
  date: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  canGoNext: boolean;
}

export function Header({ date, onPrevDay, onNextDay, canGoNext }: HeaderProps) {
  const isTodayView = isToday(date);
  const weekNumber = getISOWeek(date);
  const greeting = getGreeting();
  const formattedDate = format(date, "EEEE, MMMM d, yyyy");

  return (
    <div className="bg-background px-5 py-2 rounded-xl shadow-sm border flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={onPrevDay}
          className="rounded p-0.5 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span>{formattedDate}</span>

        <button
          type="button"
          onClick={onNextDay}
          disabled={!canGoNext}
          className={cn(
            "rounded p-0.5 transition-colors",
            canGoNext
              ? "hover:bg-muted hover:text-foreground"
              : "cursor-not-allowed opacity-30",
          )}
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <span className="text-border">·</span>
        <span>Week {weekNumber}</span>

        {isTodayView && (
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            Today
          </span>
        )}
      </div>
    </div>
  );
}
