import { createTodoClaimHandler } from "@/app/api/todos/claim-release-handlers";
import { todoService } from "@/lib/todos/production";

export const POST = createTodoClaimHandler(todoService);
