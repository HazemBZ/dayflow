import { randomUUID } from "node:crypto";

import {
  createProjectSchema,
  projectIdSchema,
  serializeProject,
} from "@/lib/projects/contracts";
import type { ProjectDto } from "@/lib/projects/contracts";
import type { ProjectRepository } from "@/lib/projects/repository";

export type ProjectCreateResult =
  | { readonly kind: "success"; readonly project: ProjectDto }
  | { readonly kind: "name_conflict" }
  | { readonly kind: "path_conflict" };

export interface ProjectService {
  list(): Promise<readonly ProjectDto[]>;
  create(input: unknown): Promise<ProjectCreateResult>;
}

export type ProjectServiceDependencies = {
  readonly repository: ProjectRepository;
  readonly now?: () => number;
  readonly createId?: (createdAt: number) => string;
};

class ProjectServiceInvariantError extends Error {
  readonly name = "ProjectServiceInvariantError";

  constructor() {
    super("Unexpected Project repository create result");
  }
}

export function createProjectService(
  dependencies: ProjectServiceDependencies,
): ProjectService {
  const now = dependencies.now ?? Date.now;
  const createId =
    dependencies.createId ??
    ((createdAt: number) => `project_${createdAt}_${randomUUID()}`);

  return {
    async list() {
      const rows = await dependencies.repository.list();
      return rows.map(serializeProject);
    },

    async create(input) {
      const parsed = createProjectSchema.parse(input);
      const createdAt = now();
      const result = await dependencies.repository.create({
        ...parsed,
        id: projectIdSchema.parse(createId(createdAt)),
        createdAt,
        updatedAt: createdAt,
      });
      switch (result.kind) {
        case "success":
          return { kind: "success", project: serializeProject(result.row) };
        case "name_conflict":
          return { kind: "name_conflict" };
        case "path_conflict":
          return { kind: "path_conflict" };
        default:
          throw new ProjectServiceInvariantError();
      }
    },
  };
}
