"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Circle,
  FolderKanban,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { ProjectSelect } from "@/components/todos/project-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  claimTodo,
  deleteTodo,
  getTodo,
  releaseTodo,
  TodoApiError,
  updateTodo,
} from "@/lib/todos/client";
import {
  TODO_SEVERITIES,
  TODO_STATUSES,
  todoSeveritySchema,
  todoStatusSchema,
  type TodoDto,
  type TodoSeverity,
  type TodoStatus,
} from "@/lib/todos/contracts";
import { listProjects } from "@/lib/projects/client";
import type { ProjectDto } from "@/lib/projects/contracts";
import { cn } from "@/lib/utils";

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

const MARKDOWN_STYLES =
  "w-full max-w-none text-sm leading-relaxed [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1.5 [&_li:last-child]:mb-0 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_pre]:mb-4 [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_table]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm";

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function errorMessage(error: unknown): string {
  if (error instanceof TodoApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "The Todo request failed. Please try again.";
}

function projectErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "The Project request failed. Please try again.";
}

function statusVariant(status: TodoStatus): "default" | "secondary" | "outline" {
  switch (status) {
    case "done":
      return "default";
    case "cancelled":
      return "secondary";
    case "pending":
    case "in_progress":
      return "outline";
  }
}

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

export default function TodoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawTodoId = params.id;
  const todoId = typeof rawTodoId === "string" ? rawTodoId : null;
  const [todo, setTodo] = useState<TodoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftSeverity, setDraftSeverity] = useState<TodoSeverity>("medium");
  const [draftStatus, setDraftStatus] = useState<TodoStatus>("pending");
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<readonly ProjectDto[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshTodo = useCallback(async () => {
    if (!todoId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      setTodo(await getTodo(todoId));
      setNotFound(false);
    } catch (loadError) {
      if (loadError instanceof TodoApiError && loadError.status === 404) {
        setNotFound(true);
      } else {
        setError(errorMessage(loadError));
      }
    } finally {
      setLoading(false);
    }
  }, [todoId]);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectError(null);
    try {
      setProjects(await listProjects());
    } catch (loadError) {
      setProjectError(projectErrorMessage(loadError));
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTodo();
  }, [refreshTodo]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  function beginEdit(): void {
    if (!todo) return;
    setDraft(todo.text);
    setDraftSeverity(todo.severity);
    setDraftStatus(todo.status);
    setDraftProjectId(todo.projectId);
    setEditing(true);
  }

  async function applyMutation(action: () => Promise<TodoDto>): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      setTodo(await action());
      await refreshTodo();
      return true;
    } catch (mutationError) {
      setError(errorMessage(mutationError));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(): Promise<void> {
    if (!todo || !draft.trim()) return;
    const saved = await applyMutation(async () =>
      updateTodo(todo.id, {
        text: draft.trim(),
        severity: draftSeverity,
        status: draftStatus,
        projectId: draftProjectId,
      }),
    );
    if (saved) setEditing(false);
  }

  async function removeTodo(): Promise<void> {
    if (!todo) return;
    setSaving(true);
    setError(null);
    try {
      await deleteTodo(todo.id);
      router.push("/todos");
    } catch (deleteError) {
      setError(errorMessage(deleteError));
      setDeleting(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl space-y-4 py-8"><div className="h-7 w-32 animate-pulse rounded bg-muted" /><div className="h-10 w-3/4 animate-pulse rounded bg-muted" /><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>;
  }

  if (notFound) {
    return <div className="mx-auto max-w-3xl py-20 text-center"><Circle className="mx-auto size-10 text-muted-foreground/40" /><h1 className="mt-3 text-2xl font-semibold">Todo not found</h1><p className="mt-2 text-sm text-muted-foreground">This Todo may have been deleted.</p><Button className="mt-6" onClick={() => router.push("/todos")}><ArrowLeft className="size-4" />Back to Todos</Button></div>;
  }

  if (!todo) {
    return <div className="mx-auto max-w-3xl py-20 text-center"><h1 className="text-2xl font-semibold">Unable to load Todo</h1><p className="mt-2 text-sm text-muted-foreground">{error ?? "The Todo service did not return a record."}</p><Button className="mt-6" onClick={() => void refreshTodo()}>Try again</Button></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/todos")}><ArrowLeft className="size-4" />All Todos</Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={beginEdit}><Pencil className="size-3.5" />Edit</Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(true)}><Trash2 className="size-3.5" />Delete</Button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {projectError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">Unable to load projects: {projectError}</div>}

      {editing ? (
        <Card>
          <CardHeader><CardTitle>Edit Todo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1.5"><span className="text-sm font-medium">Todo</span><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-48" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5"><span className="text-sm font-medium">Status</span><Select value={draftStatus} onValueChange={(value) => setDraftStatus(todoStatusSchema.parse(value))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TODO_STATUSES.map((item) => <SelectItem key={item} value={item}>{STATUS_LABELS[item]}</SelectItem>)}</SelectContent></Select></label>
              <label className="space-y-1.5"><span className="text-sm font-medium">Severity</span><Select value={draftSeverity} onValueChange={(value) => setDraftSeverity(todoSeveritySchema.parse(value))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TODO_SEVERITIES.map((item) => <SelectItem key={item} value={item}>{SEVERITY_LABELS[item]}</SelectItem>)}</SelectContent></Select></label>
              <div className="sm:col-span-2"><ProjectSelect projects={projects} value={draftProjectId} onValueChange={setDraftProjectId} disabled={projectsLoading || saving} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button><Button disabled={saving || !draft.trim()} onClick={() => void saveEdit()}>{saving ? "Saving…" : "Save"}</Button></div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <Button variant="ghost" size="icon" aria-label={todo.status === "done" ? "Mark Todo pending" : "Mark Todo done"} disabled={saving} onClick={() => void applyMutation(() => updateTodo(todo.id, { status: todo.status === "done" ? "pending" : "done" }))}>{todo.status === "done" ? <CheckCircle2 className="text-primary" /> : <Circle />}</Button>
                  <div className="min-w-0"><h1 className={cn("font-heading text-2xl font-semibold tracking-tight", todo.status === "done" && "text-muted-foreground line-through")}>{todo.text}</h1><p className="mt-2 text-xs text-muted-foreground">Created {formatTime(todo.createdAt)}{todo.updatedAt !== todo.createdAt && ` · Updated ${formatTime(todo.updatedAt)}`}</p></div>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={todo.bookmarked ? "Remove bookmark" : "Bookmark Todo"} disabled={saving} onClick={() => void applyMutation(() => updateTodo(todo.id, { bookmarked: !todo.bookmarked }))}><Bookmark className={cn("size-3.5", todo.bookmarked && "fill-current text-primary")} /></Button>
              </div>
              <div className="flex flex-wrap gap-2"><Badge variant={statusVariant(todo.status)}>{STATUS_LABELS[todo.status]}</Badge><Badge variant="outline" className={severityClass(todo.severity)}>{SEVERITY_LABELS[todo.severity]}</Badge></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Project</CardTitle></CardHeader>
            <CardContent className="min-w-0">
              {todo.projectId ? (() => {
                const project = projects.find((item) => item.id === todo.projectId);
                return project ? (
                  <div className="flex min-w-0 items-start gap-2 text-sm">
                    <FolderKanban className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0"><p className="font-medium">{project.projectName}</p><p className="truncate text-muted-foreground" title={project.projectPath}>{project.projectPath}</p></div>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Project unavailable.</p>;
              })() : <p className="text-sm text-muted-foreground">No project assigned.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm"><UserRound className="size-4 text-muted-foreground" /><span className="text-muted-foreground">Assigned to</span><span className="font-medium">{todo.assignedTo ?? "Unassigned"}</span></div>
              <div className="flex flex-col gap-2 sm:flex-row"><Input value={agentId} onChange={(event) => setAgentId(event.target.value)} placeholder="Agent ID" aria-label="Agent ID for Todo claim or release" /><Button disabled={saving || !agentId.trim() || todo.assignedTo !== null} onClick={() => void applyMutation(() => claimTodo(todo.id, agentId.trim()))}>Claim</Button><Button variant="outline" disabled={saving || !agentId.trim() || todo.assignedTo === null} onClick={() => void applyMutation(() => releaseTodo(todo.id, agentId.trim()))}>Release</Button></div>
              <p className="text-xs text-muted-foreground">Claim and release require the exact agent ID. Assignment changes are applied by the canonical Todo API.</p>
            </CardContent>
          </Card>

          <article className={MARKDOWN_STYLES}><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{todo.text}</ReactMarkdown></article>
        </>
      )}

      <Dialog open={deleting} onOpenChange={setDeleting}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Todo</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Delete this Todo? This cannot be undone.</p><DialogFooter><Button variant="outline" onClick={() => setDeleting(false)}>Cancel</Button><Button variant="destructive" disabled={saving} onClick={() => void removeTodo()}>{saving ? "Deleting…" : "Delete"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
