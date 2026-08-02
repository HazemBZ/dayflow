import { ZodError } from "zod";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

type ErrorIssue = {
  readonly path: string;
  readonly message: string;
};

class MalformedJsonError extends Error {
  readonly name = "MalformedJsonError";

  constructor() {
    super("Request body must be valid JSON");
  }
}

export async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new MalformedJsonError();
    }
    throw error;
  }
}

export function dataResponse(data: unknown, status = 200): Response {
  return Response.json({ data }, { status, headers: NO_STORE_HEADERS });
}

export function emptyResponse(): Response {
  return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  issues?: readonly ErrorIssue[],
): Response {
  const error = issues ? { code, message, issues } : { code, message };
  return Response.json({ error }, { status, headers: NO_STORE_HEADERS });
}

export async function runHandler(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof MalformedJsonError) {
      return errorResponse(400, "INVALID_JSON", error.message);
    }
    if (error instanceof ZodError) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Request validation failed",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred",
    );
  }
}
