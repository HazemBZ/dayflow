"use client";

import { memo } from "react";
import { ExternalLink, ListTodo, Trash2 } from "lucide-react";
import { type Node, type NodeProps } from "@xyflow/react";

import { cn } from "@/lib/utils";
import type { TodoDto, TodoSeverity, TodoStatus } from "@/lib/todos/contracts";

type TodoNodeData = {
  readonly todo: TodoDto;
  readonly onOpen: () => void;
  readonly onRemove: () => void;
};

export type TodoNodeType = Node<TodoNodeData, "todo">;

const STATUS_LABELS: Record<TodoStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

const SEVERITY_LABELS: Record<TodoSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

function severityClass(severity: TodoSeverity): string {
  switch (severity) {
    case "critical":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "high":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "medium":
      return "border-primary/30 bg-primary/10 text-primary";
    case "low":
      return "border-border text-muted-foreground";
  }
}

function TodoNodeComponent({ data, selected }: NodeProps<TodoNodeType>) {
  const { todo } = data;

  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[280px] rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-shadow",
        selected && "shadow-md ring-2 ring-primary",
      )}
    >
      <div className="flex items-start gap-2">
        <ListTodo className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <p
          className={cn(
            "min-w-0 flex-1 line-clamp-3 text-sm font-medium",
            todo.status === "done" && "text-muted-foreground line-through",
          )}
        >
          {todo.text}
        </p>
        <div className="nodrag flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Open todo"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              data.onOpen();
            }}
          >
            <ExternalLink className="size-3" />
          </button>
          <button
            type="button"
            aria-label="Remove todo from canvas"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              data.onRemove();
            }}
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {STATUS_LABELS[todo.status]}
        </span>
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            severityClass(todo.severity),
          )}
        >
          {SEVERITY_LABELS[todo.severity]}
        </span>
      </div>
    </div>
  );
}

export const TodoNode = memo(TodoNodeComponent);
