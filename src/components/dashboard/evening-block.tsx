"use client";

import { useState } from "react";
import { Briefcase } from "lucide-react";
import { SectionTooltip } from "@/components/ui/section-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EVENING_TASKS = [
  { value: "applications", label: "Applications" },
  { value: "cv", label: "CV Updates" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "networking", label: "Networking Messages" },
] as const;

interface EveningBlockProps {
  initialValue: string | null;
  initialCompleted: boolean;
  onSave: (taskType: string | null, completed: boolean) => Promise<void>;
}

export function EveningBlock({
  initialValue,
  initialCompleted,
  onSave,
}: EveningBlockProps) {
  const [taskType, setTaskType] = useState(initialValue ?? "");
  const [completed, setCompleted] = useState(initialCompleted);

  const handleTaskTypeChange = (value: string | null) => {
    const val = value ?? "";
    setTaskType(val);
    onSave(val, completed).catch(console.error);
  };

  const handleToggle = (checked: boolean) => {
    setCompleted(checked);
    onSave(taskType || null, checked).catch(console.error);
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Evening atmosphere — sunset-to-dusk gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, transparent 30%, oklch(0.7 0.12 40 / 0.07), oklch(0.6 0.1 330 / 0.05), oklch(0.4 0.08 280 / 0.04))",
        }}
        aria-hidden="true"
      />
      <div className="relative">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Evening Block
            <span className="text-xs font-normal text-muted-foreground">
              Immigration / Career
            </span>
          </CardTitle>
          <SectionTooltip>
            <p>
              <strong>Evening block</strong> is your dedicated time for
              immigration and career tasks.
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
              <li>Applications, CV updates, LinkedIn, networking</li>
              <li>Even 30 minutes a day keeps momentum alive</li>
              <li>Check it off when done to close the day</li>
            </ul>
          </SectionTooltip>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Select value={taskType} onValueChange={handleTaskTypeChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pick one task type..." />
              </SelectTrigger>
              <SelectContent>
                {EVENING_TASKS.map((task) => (
                  <SelectItem key={task.value} value={task.value}>
                    {task.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Checkbox
              checked={completed}
              onCheckedChange={(checked) => handleToggle(checked === true)}
              disabled={!taskType}
              aria-label="Evening task completed"
            />
            <span
              className={`text-xs ${
                completed
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {completed ? "Done" : "Mark done"}
            </span>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
