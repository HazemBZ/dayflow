import { z } from "zod";

import type { Project as ProjectRow } from "@/lib/db/schema";

export const projectIdSchema = z.string().trim().min(1).max(128);
export const projectNameSchema = z.string().trim().min(1).max(256);
export const projectPathSchema = z.string().trim().min(1).max(4_096);

export const projectDtoSchema = z.strictObject({
	id: projectIdSchema,
	projectName: projectNameSchema,
	projectPath: projectPathSchema,
  createdAt: z.iso.datetime({ precision: 3 }),
  updatedAt: z.iso.datetime({ precision: 3 }),
});

export const createProjectSchema = z.strictObject({
	projectName: projectNameSchema,
	projectPath: projectPathSchema,
});

export type ProjectDto = Readonly<z.infer<typeof projectDtoSchema>>;
export type CreateProjectInput = Readonly<z.infer<typeof createProjectSchema>>;

export function serializeProject(row: ProjectRow): ProjectDto {
  return projectDtoSchema.parse({
    id: row.id,
	projectName: row.projectName,
	projectPath: row.projectPath,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  });
}
