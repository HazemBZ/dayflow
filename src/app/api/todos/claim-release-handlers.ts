import { todoAgentSchema, todoIdSchema } from "@/lib/todos/contracts";
import type {
  TodoMutationResult,
  TodoService,
} from "@/lib/todos/service";

export type TodoRouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export type TodoPostHandler = (
  request: Request,
  context: TodoRouteContext,
) => Promise<Response>;

type TodoAssignmentOperation = "claim" | "release";
type JsonBodyResult =
  | { readonly kind: "success"; readonly value: unknown }
  | { readonly kind: "invalid_json" };

class TodoHttpInvariantError extends Error {
  constructor(operation: TodoAssignmentOperation) {
    super(`Unexpected Todo ${operation} result`);
    this.name = "TodoHttpInvariantError";
  }
}

async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  try {
    const value: unknown = await request.json();
    return { kind: "success", value };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { kind: "invalid_json" };
    }
    throw error;
  }
}

function mutationResponse(
  result: TodoMutationResult,
  operation: TodoAssignmentOperation,
): Response {
  switch (result.kind) {
    case "success":
      return Response.json({ data: result.todo });
    case "not_found":
      return Response.json(
        { error: { code: "not_found", message: "Todo not found" } },
        { status: 404 },
      );
    case "project_not_found":
      throw new TodoHttpInvariantError(operation);
    case "conflict":
      return Response.json(
        {
          error: {
            code: result.reason,
            message:
              operation === "claim"
                ? "Todo is already assigned or cannot be claimed in its current state"
                : "Todo can only be released by its assigned agent while in progress",
          },
          current: result.current,
        },
        { status: 409 },
      );
    default:
      throw new TodoHttpInvariantError(operation);
  }
}

function createTodoAssignmentHandler(
  service: TodoService,
  operation: TodoAssignmentOperation,
): TodoPostHandler {
  return async (request, context) => {
    try {
      const { id } = await context.params;
      const body = await readJsonBody(request);
      if (body.kind === "invalid_json") {
        return Response.json(
          {
            error: {
              code: "invalid_json",
              message: "Request body must be valid JSON",
            },
          },
          { status: 400 },
        );
      }
      const parsedId = todoIdSchema.safeParse(id);
      const parsedInput = todoAgentSchema.safeParse(body.value);
      if (!parsedId.success || !parsedInput.success) {
        const issues = [
          ...(parsedId.success ? [] : parsedId.error.issues),
          ...(parsedInput.success ? [] : parsedInput.error.issues),
        ];
        return Response.json(
          {
            error: {
              code: "validation_error",
              message: "Request validation failed",
              issues,
            },
          },
          { status: 400 },
        );
      }
      const result = await service[operation](parsedId.data, parsedInput.data);
      return mutationResponse(result, operation);
    } catch {
      return Response.json(
        {
          error: {
            code: "internal_error",
            message: "An internal error occurred",
          },
        },
        { status: 500 },
      );
    }
  };
}

export function createTodoClaimHandler(service: TodoService): TodoPostHandler {
  return createTodoAssignmentHandler(service, "claim");
}

export function createTodoReleaseHandler(service: TodoService): TodoPostHandler {
  return createTodoAssignmentHandler(service, "release");
}
