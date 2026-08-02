import "server-only";

import { db } from "@/lib/db";
import { createProjectRepository } from "@/lib/projects/repository";
import { createProjectService } from "@/lib/projects/service";

export const projectRepository = createProjectRepository(db);
export const projectService = createProjectService({
  repository: projectRepository,
});
