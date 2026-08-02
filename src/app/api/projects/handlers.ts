import type { ProjectService } from "@/lib/projects/service";

import {
  dataResponse,
  errorResponse,
  parseJson,
  runHandler,
} from "@/app/api/todos/http";

class ProjectHandlerInvariantError extends Error {
  readonly name = "ProjectHandlerInvariantError";

  constructor() {
    super("Unexpected Project create result");
  }
}

export function createProjectCollectionHandlers(service: ProjectService) {
  return {
    GET(): Promise<Response> {
      return runHandler(async () => dataResponse(await service.list()));
    },

    POST(request: Request): Promise<Response> {
      return runHandler(async () => {
        const input = await parseJson(request);
        const result = await service.create(input);
        switch (result.kind) {
          case "success":
            return dataResponse(result.project, 201);
          case "name_conflict":
            return errorResponse(
              409,
              "PROJECT_NAME_CONFLICT",
                  "Project name already exists",
            );
          case "path_conflict":
            return errorResponse(
              409,
              "PROJECT_PATH_CONFLICT",
              "Project path already exists",
            );
          default:
            throw new ProjectHandlerInvariantError();
        }
      });
    },
  };
}
