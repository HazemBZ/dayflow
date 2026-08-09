"use client";

import { useState, type ReactNode } from "react";
import { ExternalLink, ListTodo, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProjectSelect } from "@/components/todos/project-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TODO_SEVERITIES,
  todoSeveritySchema,
  type CreateTodoInput,
  type TodoDto,
  type TodoSeverity,
} from "@/lib/todos/contracts";
import type { ProjectDto } from "@/lib/projects/contracts";

type TodoCanvasControlsProps = {
  readonly todos: readonly TodoDto[];
  readonly placedTodoIds: readonly string[];
  readonly projects: readonly ProjectDto[];
  readonly projectsLoading: boolean;
  readonly error: string | null;
  readonly onAddTodo: (todo: TodoDto) => Promise<void>;
  readonly onCreateTodo: (input: CreateTodoInput) => Promise<boolean>;
  readonly children: ReactNode;
};

const SEVERITY_LABELS: Record<TodoSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function TodoCanvasControls({
  todos,
  placedTodoIds,
  projects,
  projectsLoading,
  error,
  onAddTodo,
  onCreateTodo,
  children,
}: TodoCanvasControlsProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftSeverity, setDraftSeverity] = useState<TodoSeverity>("medium");
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const placedIds = new Set(placedTodoIds);
  const unplacedTodos = todos.filter((todo) => !placedIds.has(todo.id));

  async function handleCreate(): Promise<void> {
    const text = draft.trim();
    if (!text) return;

    setCreating(true);
    const created = await onCreateTodo({
      text,
      severity: draftSeverity,
      bookmarked: false,
      status: "pending",
      projectId: draftProjectId,
    });
    setCreating(false);

    if (!created) return;
    setDraft("");
    setDraftSeverity("medium");
    setDraftProjectId(null);
    setCreateOpen(false);
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="absolute bottom-4 left-4 z-10 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <Popover>
          <PopoverTrigger render={<Button size="sm" className="shadow-sm" />}>
            <ListTodo className="mr-1 size-3.5" />
            Add Todos
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-1.5">
            {unplacedTodos.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                All todos on canvas
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {unplacedTodos.map((todo) => (
                  <button
                    key={todo.id}
                    type="button"
                    onClick={() => void onAddTodo(todo)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                  >
                    <ListTodo className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium text-foreground">{todo.text}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {todo.status.replace("_", " ")} · {SEVERITY_LABELS[todo.severity]}
                      </p>
                    </div>
                    <ExternalLink className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
        <Button size="sm" variant="outline" className="shadow-sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 size-3.5" />
          New Todo
        </Button>
        {children}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Todo</DialogTitle>
            <DialogDescription>
              Create a canonical Todo and place it on this canvas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Todo</span>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Describe work to do"
                className="max-h-48 min-h-32 overflow-y-auto"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Severity</span>
              <Select
                value={draftSeverity}
                onValueChange={(value) => setDraftSeverity(todoSeveritySchema.parse(value))}
                disabled={creating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TODO_SEVERITIES.map((severity) => (
                    <SelectItem key={severity} value={severity}>
                      {SEVERITY_LABELS[severity]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <ProjectSelect
              projects={projects}
              value={draftProjectId}
              onValueChange={setDraftProjectId}
              disabled={projectsLoading || creating}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating || !draft.trim()}>
              {creating ? "Creating…" : "Create Todo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
