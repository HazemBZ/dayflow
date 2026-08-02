import { projectService } from "@/lib/projects/production";

import { createProjectCollectionHandlers } from "./handlers";

const handlers = createProjectCollectionHandlers(projectService);

export const GET = handlers.GET;
export const POST = handlers.POST;
