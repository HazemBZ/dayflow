import type { TodoService } from "@/lib/todos/service";

import {
  dataResponse,
  emptyResponse,
  errorResponse,
  parseJson,
  runHandler,
} from "../http";

export type TodoRouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

class TodoHandlerInvariantError extends Error {
  readonly name = "TodoHandlerInvariantError";

  constructor(operation: "update" | "delete") {
    super(`Unexpected Todo service result during ${operation}`);
  }
}

export function createTodoItemHandlers(service: TodoService) {
  return {
    GET(_request: Request, context: TodoRouteContext): Promise<Response> {
      return runHandler(async () => {
        const { id } = await context.params;
        const todo = await service.get(id);
        return todo
          ? dataResponse(todo)
          : errorResponse(404, "NOT_FOUND", "Todo not found");
      });
    },

    PATCH(request: Request, context: TodoRouteContext): Promise<Response> {
      return runHandler(async () => {
        const { id } = await context.params;
        const input = await parseJson(request);
        const result = await service.update(id, input);

        switch (result.kind) {
          case "success":
            return dataResponse(result.todo);
          case "not_found":
            return errorResponse(404, "NOT_FOUND", "Todo not found");
          case "project_not_found":
            return errorResponse(404, "PROJECT_NOT_FOUND", "Project not found");
          case "conflict":
            return errorResponse(
              409,
              "LIFECYCLE_CONFLICT",
              "Assigned Todo must be released before returning to pending",
            );
          default:
            throw new TodoHandlerInvariantError("update");
        }
      });
    },

    DELETE(_request: Request, context: TodoRouteContext): Promise<Response> {
      return runHandler(async () => {
        const { id } = await context.params;
        const result = await service.delete(id);

        switch (result.kind) {
          case "success":
            return emptyResponse();
          case "not_found":
            return errorResponse(404, "NOT_FOUND", "Todo not found");
          case "project_not_found":
            throw new TodoHandlerInvariantError("delete");
          case "conflict":
            return errorResponse(
              409,
              "LIFECYCLE_CONFLICT",
              "Todo lifecycle conflict",
            );
          default:
            throw new TodoHandlerInvariantError("delete");
        }
      });
    },
  };
}
