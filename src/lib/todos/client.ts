import { z } from "zod";

import {
  todoDtoSchema,
  type CreateTodoInput,
  type TodoDto,
  type TodoSeverity,
  type TodoStatus,
  type UpdateTodoInput,
} from "@/lib/todos/contracts";

const todoListResponseSchema = z.strictObject({
  data: z.array(todoDtoSchema),
});

const todoResponseSchema = z.strictObject({
  data: todoDtoSchema,
});

const errorResponseSchema = z
  .strictObject({
    error: z.strictObject({
      code: z.string(),
      message: z.string(),
    }),
  })
  .passthrough();

export type TodoListFilters = {
  readonly query?: string;
  readonly statuses?: readonly TodoStatus[];
  readonly severities?: readonly TodoSeverity[];
  readonly bookmarked?: boolean;
  readonly assigned?: "assigned" | "unassigned";
};

export class TodoApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "TodoApiError";
    this.status = status;
    this.code = code;
  }
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TodoApiError(
        response.status,
        "INVALID_RESPONSE",
        "The Todo service returned an invalid response.",
      );
    }
    throw error;
  }
}

async function requestJson(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(path, {
    ...init,
    headers,
  });
  const body = await responseJson(response);

  if (!response.ok) {
    const error = errorResponseSchema.safeParse(body);
    if (error.success) {
      throw new TodoApiError(
        response.status,
        error.data.error.code,
        error.data.error.message,
      );
    }
    throw new TodoApiError(
      response.status,
      "REQUEST_FAILED",
      "The Todo request failed.",
    );
  }

  return body;
}

function toSearchParams(filters: TodoListFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const status of filters.statuses ?? []) {
    params.append("status", status);
  }
  for (const severity of filters.severities ?? []) {
    params.append("severity", severity);
  }
  if (filters.query?.trim()) params.set("q", filters.query.trim());
  if (filters.bookmarked !== undefined) {
    params.set("bookmarked", String(filters.bookmarked));
  }
  if (filters.assigned === "unassigned") params.set("unassigned", "true");
  return params;
}

export async function listTodos(
  filters: TodoListFilters = {},
): Promise<readonly TodoDto[]> {
  const params = toSearchParams(filters);
  const suffix = params.size > 0 ? `?${params}` : "";
  const body = await requestJson(`/api/todos${suffix}`);
  const todos = todoListResponseSchema.parse(body).data;
  return filters.assigned === "assigned"
    ? todos.filter((todo) => todo.assignedTo !== null)
    : todos;
}

export async function getTodo(id: string): Promise<TodoDto> {
  const body = await requestJson(`/api/todos/${encodeURIComponent(id)}`);
  return todoResponseSchema.parse(body).data;
}

export async function createTodo(input: CreateTodoInput): Promise<TodoDto> {
  const body = await requestJson("/api/todos", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return todoResponseSchema.parse(body).data;
}

export async function updateTodo(
  id: string,
  input: UpdateTodoInput,
): Promise<TodoDto> {
  const body = await requestJson(`/api/todos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return todoResponseSchema.parse(body).data;
}

export async function deleteTodo(id: string): Promise<void> {
  const response = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (response.status === 204) return;

  const body = await responseJson(response);
  const error = errorResponseSchema.safeParse(body);
  if (error.success) {
    throw new TodoApiError(
      response.status,
      error.data.error.code,
      error.data.error.message,
    );
  }
  throw new TodoApiError(
    response.status,
    "REQUEST_FAILED",
    "The Todo request failed.",
  );
}

async function updateAssignment(
  id: string,
  action: "claim" | "release",
  agentId: string,
): Promise<TodoDto> {
  const body = await requestJson(
    `/api/todos/${encodeURIComponent(id)}/${action}`,
    {
      method: "POST",
      body: JSON.stringify({ agentId }),
    },
  );
  return todoResponseSchema.parse(body).data;
}

export function claimTodo(id: string, agentId: string): Promise<TodoDto> {
  return updateAssignment(id, "claim", agentId);
}

export function releaseTodo(id: string, agentId: string): Promise<TodoDto> {
  return updateAssignment(id, "release", agentId);
}
