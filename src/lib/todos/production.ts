import "server-only";

import { db } from "@/lib/db";
import { projectRepository } from "@/lib/projects/production";
import { createTodoRepository } from "@/lib/todos/repository";
import { createTodoService } from "@/lib/todos/service";

export const todoService = createTodoService({
  repository: createTodoRepository(db),
  projectRepository,
});
