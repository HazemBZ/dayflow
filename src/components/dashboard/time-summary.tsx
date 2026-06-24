"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABELS: Record<string, string> = {
  job_leadership: "Job + Leadership",
  immigration_apps: "Immigration Apps",
  terraform: "Terraform",
  aws: "AWS",
  kubernetes: "Kubernetes",
  interview_prep: "Interview Prep",
  networking: "Networking",
  showcase_project: "Showcase Project",
  ai_exploration: "AI Exploration",
};

interface TimeLog {
  category: string;
  hours: number;
}

interface TimeSummaryProps {
  timeLogs: TimeLog[];
}

export function TimeSummary({ timeLogs }: TimeSummaryProps) {
  if (timeLogs.length === 0) return null;

  const totalHours = timeLogs.reduce((sum, t) => sum + t.hours, 0);
  const roundedTotal = Math.round(totalHours * 10) / 10;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{roundedTotal}h logged</span>
      {timeLogs.map((log, i) => (
        <Badge key={`${log.category}-${i}`} variant="secondary" className="gap-1 text-[10px]">
          {CATEGORY_LABELS[log.category] ?? log.category}
          <span className="tabular-nums">{log.hours}h</span>
        </Badge>
      ))}
    </div>
  );
}
