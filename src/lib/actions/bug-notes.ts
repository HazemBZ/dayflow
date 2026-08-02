"use server";

import { revalidatePath } from "next/cache";

import type {
  TodoDto,
  TodoSeverity,
  TodoStatus,
} from "@/lib/todos/contracts";
import { todoService } from "@/lib/todos/production";
import type {
  TodoCreateResult,
  TodoMutationResult,
} from "@/lib/todos/service";

export type BugNoteRow = {
  readonly id: string;
  readonly text: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly bookmarked: boolean;
  readonly severity: TodoSeverity;
  readonly status: "open" | "in-progress" | "resolved" | "closed";
};

const TODO_TO_LEGACY_STATUS = {
  pending: "open",
  in_progress: "in-progress",
  done: "resolved",
  cancelled: "closed",
} as const satisfies Record<TodoStatus, BugNoteRow["status"]>;

const LEGACY_TO_TODO_STATUS = {
  open: "pending",
  "in-progress": "in_progress",
  resolved: "done",
  closed: "cancelled",
} as const satisfies Record<BugNoteRow["status"], TodoStatus>;

class LegacyBugNoteNotFoundError extends Error {
  constructor() {
    super("Bug note not found");
    this.name = "LegacyBugNoteNotFoundError";
  }
}

class LegacyBugNoteConflictError extends Error {
  constructor() {
    super("Bug note lifecycle conflict");
    this.name = "LegacyBugNoteConflictError";
  }
}

class LegacyBugNoteInvariantError extends Error {
  constructor() {
    super("Unexpected Todo mutation result");
    this.name = "LegacyBugNoteInvariantError";
  }
}

function toLegacyBugNote(todo: TodoDto): BugNoteRow {
  return {
    id: todo.id,
    text: todo.text,
    createdAt: Date.parse(todo.createdAt),
    updatedAt: Date.parse(todo.updatedAt),
    bookmarked: todo.bookmarked,
    severity: todo.severity,
    status: TODO_TO_LEGACY_STATUS[todo.status],
  };
}

function requireTodo(result: TodoMutationResult): TodoDto {
  switch (result.kind) {
    case "success":
      return result.todo;
    case "not_found":
      throw new LegacyBugNoteNotFoundError();
    case "project_not_found":
      throw new LegacyBugNoteInvariantError();
    case "conflict":
      throw new LegacyBugNoteConflictError();
    default:
      throw new LegacyBugNoteInvariantError();
  }
}

function requireCreatedTodo(result: TodoCreateResult): TodoDto {
  switch (result.kind) {
    case "success":
      return result.todo;
    case "project_not_found":
      throw new LegacyBugNoteInvariantError();
    default:
      throw new LegacyBugNoteInvariantError();
  }
}

export async function getBugNotes(): Promise<BugNoteRow[]> {
  const todos = await todoService.list();
  return todos.map(toLegacyBugNote);
}

export async function addBugNote(text: string): Promise<BugNoteRow> {
  const todo = requireCreatedTodo(await todoService.create({ text }));
  revalidatePath("/");
  return toLegacyBugNote(todo);
}

export async function getBugNote(id: string): Promise<BugNoteRow | null> {
  const todo = await todoService.get(id);
  return todo ? toLegacyBugNote(todo) : null;
}

export async function removeBugNote(id: string): Promise<void> {
  await todoService.delete(id);
  revalidatePath("/");
}

export async function updateBugNote(id: string, text: string): Promise<void> {
  requireTodo(await todoService.update(id, { text }));
  revalidatePath("/");
}

export async function updateBugNoteStatus(
  id: string,
  status: BugNoteRow["status"],
): Promise<BugNoteRow> {
  const todo = requireTodo(
    await todoService.update(id, { status: LEGACY_TO_TODO_STATUS[status] }),
  );
  revalidatePath("/");
  return toLegacyBugNote(todo);
}

export async function toggleBugNoteBookmark(id: string): Promise<BugNoteRow> {
  const current = await todoService.get(id);
  if (!current) {
    throw new LegacyBugNoteNotFoundError();
  }
  const todo = requireTodo(
    await todoService.update(id, { bookmarked: !current.bookmarked }),
  );
  revalidatePath("/");
  return toLegacyBugNote(todo);
}
