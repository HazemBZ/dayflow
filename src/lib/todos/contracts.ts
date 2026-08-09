import { z } from "zod";

import type { Todo as TodoRow } from "@/lib/db/schema";
import { projectIdSchema } from "@/lib/projects/contracts";

export const TODO_STATUSES = [
  "pending",
  "in_progress",
  "done",
  "cancelled",
] as const;

export const TODO_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const todoStatusSchema = z.enum(TODO_STATUSES);
export const todoSeveritySchema = z.enum(TODO_SEVERITIES);

export const todoIdSchema = z.string().trim().min(1).max(128);
export const todoTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(100_000)
  .refine((text) => text.length > 0, "Todo text cannot be blank");
export const agentIdSchema = z.string().trim().min(1).max(128);

export const todoDtoSchema = z.strictObject({
  id: todoIdSchema,
  text: todoTextSchema,
  createdAt: z.iso.datetime({ precision: 3 }),
  updatedAt: z.iso.datetime({ precision: 3 }),
  bookmarked: z.boolean(),
  severity: todoSeveritySchema,
  status: todoStatusSchema,
  assignedTo: agentIdSchema.nullable(),
  projectId: projectIdSchema.nullable(),
});

export const createTodoSchema = z.strictObject({
  text: todoTextSchema,
  bookmarked: z.boolean().default(false),
  severity: todoSeveritySchema.default("medium"),
  status: todoStatusSchema.default("pending"),
  projectId: projectIdSchema.nullable().default(null),
});

export const updateTodoSchema = z
  .strictObject({
    text: todoTextSchema.optional(),
    bookmarked: z.boolean().optional(),
    severity: todoSeveritySchema.optional(),
    status: todoStatusSchema.optional(),
    projectId: projectIdSchema.nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one Todo field is required",
  });

export const todoAgentSchema = z.strictObject({
  agentId: agentIdSchema,
});

export type TodoStatus = z.infer<typeof todoStatusSchema>;
export type TodoSeverity = z.infer<typeof todoSeveritySchema>;
export type TodoDto = Readonly<z.infer<typeof todoDtoSchema>>;
export type CreateTodoInput = Readonly<z.input<typeof createTodoSchema>>;
export type ParsedCreateTodoInput = Readonly<z.output<typeof createTodoSchema>>;
export type UpdateTodoInput = Readonly<z.infer<typeof updateTodoSchema>>;
export type TodoAgentInput = Readonly<z.infer<typeof todoAgentSchema>>;

export function serializeTodo(row: TodoRow): TodoDto {
  return todoDtoSchema.parse({
    id: row.id,
    text: row.text,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    bookmarked: row.bookmarked ?? false,
    severity: row.severity ?? "medium",
    status: row.status ?? "pending",
    assignedTo: row.assignedTo ?? null,
    projectId: row.projectId ?? null,
  });
}
