import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
} from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import type * as schema from "@/lib/db/schema";
import { canvasTodoNodes, todos } from "@/lib/db/schema";
import type { Todo as TodoRow } from "@/lib/db/schema";
import type {
  ParsedCreateTodoInput,
  UpdateTodoInput,
} from "@/lib/todos/contracts";

export type TodoDatabase = LibSQLDatabase<typeof schema>;

export type NewTodoRecord = ParsedCreateTodoInput & {
  readonly id: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly assignedTo: null;
};

export type RepositoryMutationResult =
  | { readonly kind: "success"; readonly row: TodoRow }
  | { readonly kind: "not_found" }
  | { readonly kind: "conflict"; readonly row: TodoRow };

export type RepositoryDeleteResult =
  | { readonly kind: "success"; readonly row: TodoRow }
  | { readonly kind: "not_found" };

export interface TodoRepository {
  list(): Promise<readonly TodoRow[]>;
  create(record: NewTodoRecord): Promise<TodoRow>;
  get(id: string): Promise<TodoRow | null>;
  update(
    id: string,
    input: UpdateTodoInput,
    updatedAt: number,
  ): Promise<RepositoryMutationResult>;
  delete(id: string): Promise<RepositoryDeleteResult>;
  claim(
    id: string,
    agentId: string,
    updatedAt: number,
  ): Promise<RepositoryMutationResult>;
  release(
    id: string,
    agentId: string,
    updatedAt: number,
  ): Promise<RepositoryMutationResult>;
}

export class TodoPersistenceError extends Error {
  readonly operation: "create";

  constructor(operation: "create") {
    super(`Todo ${operation} did not return a row`);
    this.name = "TodoPersistenceError";
    this.operation = operation;
  }
}

class DrizzleTodoRepository implements TodoRepository {
  readonly #db: TodoDatabase;

  constructor(db: TodoDatabase) {
    this.#db = db;
  }

  async list(): Promise<readonly TodoRow[]> {
    return this.#db
      .select()
      .from(todos)
      .orderBy(
        desc(todos.updatedAt),
        desc(todos.createdAt),
        asc(todos.id),
      );
  }

  async create(record: NewTodoRecord): Promise<TodoRow> {
    const rows = await this.#db.insert(todos).values(record).returning();
    const row = rows[0];
    if (!row) {
      throw new TodoPersistenceError("create");
    }
    return row;
  }

  async get(id: string): Promise<TodoRow | null> {
    const rows = await this.#db
      .select()
      .from(todos)
      .where(eq(todos.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async update(
    id: string,
    input: UpdateTodoInput,
    updatedAt: number,
  ): Promise<RepositoryMutationResult> {
    const predicate =
      input.status === "pending"
        ? and(eq(todos.id, id), isNull(todos.assignedTo))
        : eq(todos.id, id);
    const rows = await this.#db
      .update(todos)
      .set({ ...input, updatedAt })
      .where(predicate)
      .returning();
    return this.resolveMutation(id, rows[0]);
  }

  async delete(id: string): Promise<RepositoryDeleteResult> {
    return this.#db.transaction(async (tx) => {
      await tx
        .delete(canvasTodoNodes)
        .where(eq(canvasTodoNodes.todoId, id));
      const rows = await tx
        .delete(todos)
        .where(eq(todos.id, id))
        .returning();
      const row = rows[0];
      return row ? { kind: "success", row } : { kind: "not_found" };
    });
  }

  async claim(
    id: string,
    agentId: string,
    updatedAt: number,
  ): Promise<RepositoryMutationResult> {
    const rows = await this.#db
      .update(todos)
      .set({ assignedTo: agentId, status: "in_progress", updatedAt })
      .where(
        and(
          eq(todos.id, id),
          isNull(todos.assignedTo),
          inArray(todos.status, ["pending", "in_progress"]),
        ),
      )
      .returning();
    return this.resolveMutation(id, rows[0]);
  }

  async release(
    id: string,
    agentId: string,
    updatedAt: number,
  ): Promise<RepositoryMutationResult> {
    const rows = await this.#db
      .update(todos)
      .set({ assignedTo: null, status: "pending", updatedAt })
      .where(
        and(
          eq(todos.id, id),
          eq(todos.assignedTo, agentId),
          eq(todos.status, "in_progress"),
        ),
      )
      .returning();
    return this.resolveMutation(id, rows[0]);
  }

  private async resolveMutation(
    id: string,
    row: TodoRow | undefined,
  ): Promise<RepositoryMutationResult> {
    if (row) {
      return { kind: "success", row };
    }
    const current = await this.get(id);
    return current
      ? { kind: "conflict", row: current }
      : { kind: "not_found" };
  }
}

export function createTodoRepository(db: TodoDatabase): TodoRepository {
  return new DrizzleTodoRepository(db);
}
