import { todoService } from "@/lib/todos/production";

import { createTodoItemHandlers } from "./handlers";

const handlers = createTodoItemHandlers(todoService);

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
