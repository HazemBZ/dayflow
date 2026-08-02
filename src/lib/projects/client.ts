import { z } from "zod";

import {
  projectDtoSchema,
  type CreateProjectInput,
  type ProjectDto,
} from "@/lib/projects/contracts";

const projectListResponseSchema = z.strictObject({
  data: z.array(projectDtoSchema),
});

const projectResponseSchema = z.strictObject({
  data: projectDtoSchema,
});

const projectErrorResponseSchema = z
  .strictObject({
    error: z.strictObject({
      code: z.string(),
      message: z.string(),
    }),
  })
  .passthrough();

export class ProjectApiError extends Error {
  readonly name = "ProjectApiError";

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function projectResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ProjectApiError(
        response.status,
        "INVALID_RESPONSE",
        "The Project service returned an invalid response.",
      );
    }
    throw error;
  }
}

async function projectRequestJson(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers });
  const body = await projectResponseJson(response);

  if (!response.ok) {
    const error = projectErrorResponseSchema.safeParse(body);
    if (error.success) {
      throw new ProjectApiError(
        response.status,
        error.data.error.code,
        error.data.error.message,
      );
    }
    throw new ProjectApiError(
      response.status,
      "REQUEST_FAILED",
      "The Project request failed.",
    );
  }

  return body;
}

export async function listProjects(): Promise<readonly ProjectDto[]> {
  const body = await projectRequestJson("/api/projects");
  return projectListResponseSchema.parse(body).data;
}

export async function createProject(
  input: CreateProjectInput,
): Promise<ProjectDto> {
  const body = await projectRequestJson("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return projectResponseSchema.parse(body).data;
}
