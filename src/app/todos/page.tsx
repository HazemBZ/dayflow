"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Bot,
  CheckCircle2,
  Circle,
  FolderKanban,
  ListTodo,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { ProjectSelect } from "@/components/todos/project-select";
import { ProjectsDialog } from "@/components/todos/projects-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageScroll } from "@/components/ui/page-scroll";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createTodo,
  listTodos,
  TodoApiError,
  updateTodo,
  type TodoListFilters,
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

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

const CARD_MARKDOWN_STYLES =
  "min-w-0 [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:m-0 [&_li]:marker:text-muted-foreground [&_pre]:m-0 [&_blockquote]:m-0";

function cardPreviewLines(text: string): string {
  const lines: string[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    lines.push(line);
    if (lines.length === 2) break;
  }
  return lines.join("\n");
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

function errorMessage(error: unknown): string {
  if (error instanceof TodoApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "The Todo request failed. Please try again.";
}

function projectErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "The Project request failed. Please try again.";
}

function parseStatusFilter(value: string | null): TodoStatus | "all" {
  return !value || value === "all" ? "all" : todoStatusSchema.parse(value);
}

function parseSeverityFilter(value: string | null): TodoSeverity | "all" {
  return !value || value === "all" ? "all" : todoSeveritySchema.parse(value);
}

function parseAssignmentFilter(
  value: string | null,
): "all" | "assigned" | "unassigned" {
  if (!value) return "all";
  if (value === "all" || value === "assigned" || value === "unassigned") {
    return value;
  }
  throw new Error("Invalid Todo assignment filter");
}

export default function TodosPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<readonly TodoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TodoStatus | "all">("all");
  const [severity, setSeverity] = useState<TodoSeverity | "all">("all");
  const [bookmarked, setBookmarked] = useState(false);
  const [assigned, setAssigned] = useState<"all" | "assigned" | "unassigned">(
    "all",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [agentGuideOpen, setAgentGuideOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projects, setProjects] = useState<readonly ProjectDto[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftSeverity, setDraftSeverity] = useState<TodoSeverity>("medium");
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const loadRequestId = useRef(0);

  const filters = useMemo<TodoListFilters>(
    () => ({
      query: query.trim() || undefined,
      statuses: status === "all" ? undefined : [status],
      severities: severity === "all" ? undefined : [severity],
      bookmarked: bookmarked || undefined,
      assigned: assigned === "all" ? undefined : assigned,
    }),
    [assigned, bookmarked, query, severity, status],
  );

  const activeFilterCount =
    Number(query.trim().length > 0) +
    Number(status !== "all") +
    Number(severity !== "all") +
    Number(bookmarked) +
    Number(assigned !== "all");

  const loadTodos = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setError(null);
    try {
      const nextTodos = await listTodos(filters);
      if (requestId === loadRequestId.current) setTodos(nextTodos);
    } catch (loadError) {
      if (requestId === loadRequestId.current) setError(errorMessage(loadError));
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, [filters]);

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
    const timeoutId = window.setTimeout(() => void loadTodos(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadTodos]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  function clearFilters(): void {
    setQuery("");
    setStatus("all");
    setSeverity("all");
    setBookmarked(false);
    setAssigned("all");
  }

  async function handleCreate(): Promise<void> {
    const text = draft.trim();
    if (!text) return;

    setSaving(true);
    setError(null);
    try {
      await createTodo({
        text,
        severity: draftSeverity,
        bookmarked: false,
        status: "pending",
        projectId: draftProjectId,
      });
      setDraft("");
      setDraftSeverity("medium");
      setDraftProjectId(null);
      setCreateOpen(false);
      await loadTodos();
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  async function updateListTodo(
    todo: TodoDto,
    input: { readonly bookmarked?: boolean; readonly status?: TodoStatus },
  ): Promise<void> {
    setError(null);
    try {
      const updated = await updateTodo(todo.id, input);
      setTodos((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      await loadTodos();
    } catch (updateError) {
      setError(errorMessage(updateError));
    }
  }

  function handleProjectCreated(project: ProjectDto): void {
    setProjects((current) =>
      [...current, project].sort((left, right) =>
        left.projectName.localeCompare(right.projectName) ||
        left.projectPath.localeCompare(right.projectPath) ||
        left.id.localeCompare(right.id),
      ),
    );
  }

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  return (
    <PageScroll
      header={
        <div className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Todos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {todos.length} visible todo{todos.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setProjectsOpen(true)}>
              <FolderKanban className="size-3.5" />
              Projects
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAgentGuideOpen(true)}>
              <Bot className="size-3.5" />
              Agent API guide
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              New Todo
            </Button>
          </div>
        </div>
      }
      maxWidth="max-w-3xl"
      scrollContentClass="space-y-4 pt-6"
    >
      <Card size="sm">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="relative min-w-0 flex-1 sm:min-w-56">
            <span className="sr-only">Search todos</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search todos"
              className="pl-8"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select value={status} onValueChange={(value) => setStatus(parseStatusFilter(value))}>
              <SelectTrigger aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {TODO_STATUSES.map((item) => <SelectItem key={item} value={item}>{STATUS_LABELS[item]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={(value) => setSeverity(parseSeverityFilter(value))}>
              <SelectTrigger aria-label="Filter by severity"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {TODO_SEVERITIES.map((item) => <SelectItem key={item} value={item}>{SEVERITY_LABELS[item]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={assigned} onValueChange={(value) => setAssigned(parseAssignmentFilter(value))}>
              <SelectTrigger aria-label="Filter by assignment"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any assignee</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant={bookmarked ? "default" : "outline"} size="sm" onClick={() => setBookmarked((current) => !current)} aria-pressed={bookmarked}>
            <Bookmark className={cn("size-3.5", bookmarked && "fill-current")} />
            Bookmarked
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <SlidersHorizontal className="size-3.5" />
              Clear {activeFilterCount}
            </Button>
          )}
        </CardContent>
      </Card>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {projectError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Unable to load projects: {projectError}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/60" />)}
        </div>
      ) : todos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ListTodo className="mb-3 size-10 text-muted-foreground/40" />
          <h2 className="text-lg font-medium">No matching todos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create a todo or adjust active filters.</p>
          <div className="mt-4 flex gap-2">
            {activeFilterCount > 0 && <Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
            <Button onClick={() => setCreateOpen(true)}><Plus className="size-3.5" />New Todo</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map((todo) => (
            <Card key={todo.id} size="sm" className="transition-colors hover:bg-accent/30">
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label={todo.status === "done" ? "Mark todo pending" : "Mark todo done"}
                  onClick={() => void updateListTodo(todo, { status: todo.status === "done" ? "pending" : "done" })}
                >
                  {todo.status === "done" ? <CheckCircle2 className="text-primary" /> : <Circle />}
                </Button>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => router.push(`/todos/${todo.id}`)}>
                  <div className={cn("line-clamp-2 text-sm font-medium", CARD_MARKDOWN_STYLES, todo.status === "done" && "text-muted-foreground line-through")}>
  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{cardPreviewLines(todo.text)}</ReactMarkdown>
</div>
                  <p className="mt-1 text-xs text-muted-foreground">Updated {formatTime(todo.updatedAt)}{todo.assignedTo ? ` · ${todo.assignedTo}` : " · Unassigned"}</p>
                  {todo.projectId && (() => {
                    const project = projectsById.get(todo.projectId);
                    return (
                      <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                        <FolderKanban className="size-3 shrink-0" />
                        <span className="shrink-0">{project?.projectName ?? "Project unavailable"}</span>
                        {project && <span className="truncate" title={project.projectPath}>· {project.projectPath}</span>}
                      </p>
                    );
                  })()}
                </button>
                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  <Badge variant={statusVariant(todo.status)}>{STATUS_LABELS[todo.status]}</Badge>
                  <Badge variant="outline" className={severityClass(todo.severity)}>{SEVERITY_LABELS[todo.severity]}</Badge>
                  <Button variant="ghost" size="icon-sm" aria-label={todo.bookmarked ? "Remove bookmark" : "Bookmark todo"} onClick={() => void updateListTodo(todo, { bookmarked: !todo.bookmarked })}>
                    <Bookmark className={cn("size-3.5", todo.bookmarked && "fill-current text-primary")} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Todo</DialogTitle><DialogDescription>Create a trackable item in the canonical Todo queue.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1.5"><span className="text-sm font-medium">Todo</span><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Describe work to do" className="max-h-48 min-h-32 overflow-y-auto" /></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Severity</span><Select value={draftSeverity} onValueChange={(value) => setDraftSeverity(todoSeveritySchema.parse(value))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TODO_SEVERITIES.map((item) => <SelectItem key={item} value={item}>{SEVERITY_LABELS[item]}</SelectItem>)}</SelectContent></Select></label>
            <ProjectSelect projects={projects} value={draftProjectId} onValueChange={setDraftProjectId} disabled={projectsLoading || saving} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={() => void handleCreate()} disabled={saving || !draft.trim()}>{saving ? "Creating…" : "Create Todo"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectsDialog
        open={projectsOpen}
        onOpenChange={setProjectsOpen}
        projects={projects}
        onProjectCreated={handleProjectCreated}
      />

      <Dialog open={agentGuideOpen} onOpenChange={setAgentGuideOpen}>
        <DialogContent className="max-h-[min(720px,calc(100dvh-2rem))] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>How agents use Todos</DialogTitle>
            <DialogDescription>
              Use the Todo API to discover work, coordinate ownership, and report progress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 text-sm">
            <section className="space-y-2">
              <h2 className="font-medium">Typical workflow</h2>
              <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
                <li>List available work with <code className="rounded bg-muted px-1 py-0.5 text-xs">GET /api/todos?unassigned=true</code>.</li>
                <li>Claim one atomically with <code className="rounded bg-muted px-1 py-0.5 text-xs">POST /api/todos/:id/claim</code>.</li>
                <li>Update progress or completion with <code className="rounded bg-muted px-1 py-0.5 text-xs">PATCH /api/todos/:id</code>.</li>
                <li>Release only when the assigned agent is done or handing work back with <code className="rounded bg-muted px-1 py-0.5 text-xs">POST /api/todos/:id/release</code>.</li>
              </ol>
            </section>
            <section className="space-y-2">
              <h2 className="font-medium">Supported operations</h2>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><code className="rounded bg-muted px-1 py-0.5 text-xs">GET /api/todos</code> lists todos. Filter with repeated <code className="rounded bg-muted px-1 py-0.5 text-xs">status</code> or <code className="rounded bg-muted px-1 py-0.5 text-xs">severity</code>, plus <code className="rounded bg-muted px-1 py-0.5 text-xs">q</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">bookmarked</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">assignedTo</code>, or <code className="rounded bg-muted px-1 py-0.5 text-xs">unassigned=true</code>.</li>
                <li><code className="rounded bg-muted px-1 py-0.5 text-xs">POST /api/todos</code> creates a pending todo. Send <code className="rounded bg-muted px-1 py-0.5 text-xs">text</code>; <code className="rounded bg-muted px-1 py-0.5 text-xs">severity</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">bookmarked</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">status</code>, and nullable <code className="rounded bg-muted px-1 py-0.5 text-xs">projectId</code> are optional.</li>
                <li><code className="rounded bg-muted px-1 py-0.5 text-xs">GET /api/todos/:id</code> reads one todo; <code className="rounded bg-muted px-1 py-0.5 text-xs">DELETE /api/todos/:id</code> removes one.</li>
                <li><code className="rounded bg-muted px-1 py-0.5 text-xs">GET /api/projects</code> lists projects; <code className="rounded bg-muted px-1 py-0.5 text-xs">POST /api/projects</code> creates one from <code className="rounded bg-muted px-1 py-0.5 text-xs">projectName</code> and <code className="rounded bg-muted px-1 py-0.5 text-xs">projectPath</code>. Send <code className="rounded bg-muted px-1 py-0.5 text-xs">projectId: null</code> in a Todo patch to clear its association.</li>
                <li>Successful JSON responses use <code className="rounded bg-muted px-1 py-0.5 text-xs">&#123; data: ... &#125;</code>; failures use <code className="rounded bg-muted px-1 py-0.5 text-xs">&#123; error: &#123; code, message &#125; &#125;</code>.</li>
              </ul>
            </section>
            <section className="rounded-lg border bg-muted/30 p-3 text-muted-foreground">
              <p><span className="font-medium text-foreground">Coordination rules:</span> <code className="rounded bg-muted px-1 py-0.5 text-xs">agentId</code> is a caller-supplied coordination token, not authentication. Claims and releases are atomic: there is no steal path, and only the assigned agent can release an in-progress todo. Treat a <code className="rounded bg-muted px-1 py-0.5 text-xs">409</code> as authoritative current state, then re-read before retrying.</p>
            </section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgentGuideOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageScroll>
  );
}
