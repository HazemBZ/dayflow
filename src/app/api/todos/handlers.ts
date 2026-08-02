import { z } from "zod";

import {
  agentIdSchema,
  todoSeveritySchema,
  todoStatusSchema,
} from "@/lib/todos/contracts";
import type { TodoDto } from "@/lib/todos/contracts";
import type { TodoService } from "@/lib/todos/service";

import { dataResponse, parseJson, runHandler } from "./http";

const listFiltersSchema = z
  .strictObject({
    status: z.array(todoStatusSchema),
    severity: z.array(todoSeveritySchema),
    assignedTo: agentIdSchema.optional(),
    unassigned: z.literal("true").optional(),
    q: z.string().trim().min(1).max(10_000).optional(),
    bookmarked: z.enum(["true", "false"]).optional(),
  })
  .refine((filters) => !(filters.assignedTo && filters.unassigned), {
    message: "assignedTo and unassigned cannot be combined",
  });

type ListFilters = z.infer<typeof listFiltersSchema>;

class TodoCollectionHandlerInvariantError extends Error {
  readonly name = "TodoCollectionHandlerInvariantError";

  constructor() {
    super("Unexpected Todo create result");
  }
}

const LIST_FILTER_KEYS = new Set<string>([
  "status",
  "severity",
  "assignedTo",
  "unassigned",
  "q",
  "bookmarked",
]);

function parseListFilters(request: Request): ListFilters {
  const searchParams = new URL(request.url).searchParams;
  const raw: Record<string, unknown> = {
    status: searchParams.getAll("status"),
    severity: searchParams.getAll("severity"),
  };

  for (const key of [
    "assignedTo",
    "unassigned",
    "q",
    "bookmarked",
  ] as const) {
    const values = searchParams.getAll(key);
    if (values.length === 1) {
      raw[key] = values[0];
    } else if (values.length > 1) {
      raw[key] = values;
    }
  }

  for (const key of searchParams.keys()) {
    if (!LIST_FILTER_KEYS.has(key)) {
      raw[key] = searchParams.getAll(key);
    }
  }

  return listFiltersSchema.parse(raw);
}

function matchesFilters(todo: TodoDto, filters: ListFilters): boolean {
  const matchesStatus =
    filters.status.length === 0 || filters.status.includes(todo.status);
  const matchesSeverity =
    filters.severity.length === 0 ||
    filters.severity.includes(todo.severity);
  const matchesAssignee =
    filters.assignedTo === undefined ||
    todo.assignedTo === filters.assignedTo;
  const matchesUnassigned =
    filters.unassigned === undefined || todo.assignedTo === null;
  const matchesQuery =
    filters.q === undefined ||
    todo.text.toLocaleLowerCase().includes(filters.q.toLocaleLowerCase());
  const matchesBookmark =
    filters.bookmarked === undefined ||
    todo.bookmarked === (filters.bookmarked === "true");

  return (
    matchesStatus &&
    matchesSeverity &&
    matchesAssignee &&
    matchesUnassigned &&
    matchesQuery &&
    matchesBookmark
  );
}

export function createTodoCollectionHandlers(service: TodoService) {
  return {
    GET(request: Request): Promise<Response> {
      return runHandler(async () => {
        const filters = parseListFilters(request);
        const todos = await service.list();
        return dataResponse(
          todos.filter((todo) => matchesFilters(todo, filters)),
        );
      });
    },

    POST(request: Request): Promise<Response> {
      return runHandler(async () => {
        const input = await parseJson(request);
        const result = await service.create(input);
        switch (result.kind) {
          case "success":
            return dataResponse(result.todo, 201);
          case "project_not_found":
            return Response.json(
              {
                error: {
                  code: "PROJECT_NOT_FOUND",
                  message: "Project not found",
                },
              },
              { status: 404, headers: { "Cache-Control": "no-store" } },
            );
          default:
            throw new TodoCollectionHandlerInvariantError();
        }
      });
    },
  };
}
