import { todoService } from "@/lib/todos/production";

import { createTodoCollectionHandlers } from "./handlers";

const handlers = createTodoCollectionHandlers(todoService);

export const GET = handlers.GET;
export const POST = handlers.POST;
