import { asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import type * as schema from "@/lib/db/schema";
import { projects } from "@/lib/db/schema";
import type { Project as ProjectRow } from "@/lib/db/schema";
import type { CreateProjectInput } from "@/lib/projects/contracts";

export type ProjectDatabase = LibSQLDatabase<typeof schema>;

export type NewProjectRecord = Readonly<CreateProjectInput> & {
  readonly id: string;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type ProjectRepositoryCreateResult =
  | { readonly kind: "success"; readonly row: ProjectRow }
  | { readonly kind: "name_conflict" }
  | { readonly kind: "path_conflict" };

export interface ProjectRepository {
  list(): Promise<readonly ProjectRow[]>;
  create(record: NewProjectRecord): Promise<ProjectRepositoryCreateResult>;
  findByName(name: string): Promise<ProjectRow | null>;
  findByPath(path: string): Promise<ProjectRow | null>;
  exists(id: string): Promise<boolean>;
}

export class ProjectPersistenceError extends Error {
  readonly name = "ProjectPersistenceError";

  constructor() {
    super("Project create conflict could not be resolved");
  }
}

class DrizzleProjectRepository implements ProjectRepository {
  readonly #db: ProjectDatabase;

  constructor(db: ProjectDatabase) {
    this.#db = db;
  }

  async list(): Promise<readonly ProjectRow[]> {
    return this.#db
      .select()
      .from(projects)
      .orderBy(
        asc(projects.projectName),
        asc(projects.projectPath),
        asc(projects.id),
      );
  }

  async create(
    record: NewProjectRecord,
  ): Promise<ProjectRepositoryCreateResult> {
    const rows = await this.#db
      .insert(projects)
      .values(record)
      .onConflictDoNothing()
      .returning();
    const row = rows[0];
    if (row) {
      return { kind: "success", row };
    }
		if (await this.findByName(record.projectName)) {
      return { kind: "name_conflict" };
    }
		if (await this.findByPath(record.projectPath)) {
      return { kind: "path_conflict" };
    }
    throw new ProjectPersistenceError();
  }

  async findByName(name: string): Promise<ProjectRow | null> {
    const rows = await this.#db
      .select()
      .from(projects)
		.where(eq(projects.projectName, name))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByPath(path: string): Promise<ProjectRow | null> {
    const rows = await this.#db
      .select()
      .from(projects)
		.where(eq(projects.projectPath, path))
      .limit(1);
    return rows[0] ?? null;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.#db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return rows.length === 1;
  }
}

export function createProjectRepository(
  db: ProjectDatabase,
): ProjectRepository {
  return new DrizzleProjectRepository(db);
}
