import { randomUUID } from "node:crypto";

import {
  createTodoSchema,
  serializeTodo,
  todoAgentSchema,
  todoIdSchema,
  updateTodoSchema,
} from "@/lib/todos/contracts";
import type { TodoDto } from "@/lib/todos/contracts";
import type { ProjectRepository } from "@/lib/projects/repository";
import type {
  RepositoryDeleteResult,
  RepositoryMutationResult,
  TodoRepository,
} from "@/lib/todos/repository";

export type TodoConflictReason =
  | "assigned_todo_cannot_be_pending"
  | "claim_unavailable"
  | "release_unavailable";

export type TodoMutationResult =
  | { readonly kind: "success"; readonly todo: TodoDto }
  | { readonly kind: "not_found" }
  | { readonly kind: "project_not_found" }
  | {
      readonly kind: "conflict";
      readonly reason: TodoConflictReason;
      readonly current: TodoDto;
    };

export interface TodoService {
  list(): Promise<readonly TodoDto[]>;
  create(input: unknown): Promise<TodoCreateResult>;
  get(id: unknown): Promise<TodoDto | null>;
  update(id: unknown, input: unknown): Promise<TodoMutationResult>;
  delete(id: unknown): Promise<TodoMutationResult>;
  claim(id: unknown, input: unknown): Promise<TodoMutationResult>;
  release(id: unknown, input: unknown): Promise<TodoMutationResult>;
}

export type TodoCreateResult =
  | { readonly kind: "success"; readonly todo: TodoDto }
  | { readonly kind: "project_not_found" };

export type TodoServiceDependencies = {
  readonly repository: TodoRepository;
  readonly projectRepository: ProjectRepository;
  readonly now?: () => number;
  readonly createId?: (createdAt: number) => string;
};

export class TodoServiceInvariantError extends Error {
  constructor(operation: string) {
    super(`Unexpected Todo repository result during ${operation}`);
    this.name = "TodoServiceInvariantError";
  }
}

function mapMutation(
  result: RepositoryMutationResult,
  reason: TodoConflictReason,
): TodoMutationResult {
  switch (result.kind) {
    case "success":
      return { kind: "success", todo: serializeTodo(result.row) };
    case "not_found":
      return { kind: "not_found" };
    case "conflict":
      return { kind: "conflict", reason, current: serializeTodo(result.row) };
    default:
      throw new TodoServiceInvariantError("conditional mutation");
  }
}

function mapDelete(result: RepositoryDeleteResult): TodoMutationResult {
  switch (result.kind) {
    case "success":
      return { kind: "success", todo: serializeTodo(result.row) };
    case "not_found":
      return { kind: "not_found" };
    default:
      throw new TodoServiceInvariantError("delete");
  }
}

export function createTodoService(
  dependencies: TodoServiceDependencies,
): TodoService {
  const now = dependencies.now ?? Date.now;
  const createId =
    dependencies.createId ??
    ((createdAt: number) => `todo_${createdAt}_${randomUUID()}`);

  return {
    async list() {
      const rows = await dependencies.repository.list();
      return rows.map(serializeTodo);
    },

    async create(input) {
      const parsed = createTodoSchema.parse(input);
      if (
        parsed.projectId !== null &&
        !(await dependencies.projectRepository.exists(parsed.projectId))
      ) {
        return { kind: "project_not_found" };
      }
      const createdAt = now();
      const id = todoIdSchema.parse(createId(createdAt));
      const row = await dependencies.repository.create({
        ...parsed,
        id,
        createdAt,
        updatedAt: createdAt,
        assignedTo: null,
      });
      return { kind: "success", todo: serializeTodo(row) };
    },

    async get(id) {
      const row = await dependencies.repository.get(todoIdSchema.parse(id));
      return row ? serializeTodo(row) : null;
    },

    async update(id, input) {
      const todoId = todoIdSchema.parse(id);
      const parsed = updateTodoSchema.parse(input);
      if (
        parsed.projectId !== undefined &&
        parsed.projectId !== null &&
        !(await dependencies.projectRepository.exists(parsed.projectId))
      ) {
        return { kind: "project_not_found" };
      }
      const result = await dependencies.repository.update(todoId, parsed, now());
      return mapMutation(result, "assigned_todo_cannot_be_pending");
    },

    async delete(id) {
      const result = await dependencies.repository.delete(todoIdSchema.parse(id));
      return mapDelete(result);
    },

    async claim(id, input) {
      const todoId = todoIdSchema.parse(id);
      const { agentId } = todoAgentSchema.parse(input);
      const result = await dependencies.repository.claim(todoId, agentId, now());
      return mapMutation(result, "claim_unavailable");
    },

    async release(id, input) {
      const todoId = todoIdSchema.parse(id);
      const { agentId } = todoAgentSchema.parse(input);
      const result = await dependencies.repository.release(
        todoId,
        agentId,
        now(),
      );
      return mapMutation(result, "release_unavailable");
    },
  };
}
