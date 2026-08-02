# Todo API operating guide

Local guide for agent and client code that touches Todo routes.

## Discovery

- Root agent entrypoint, `AGENTS.md`
- Canonical API source, `src/app/api/todos/*`
- Canonical domain contracts, `src/lib/todos/contracts.ts`, `src/lib/todos/service.ts`
- One hop rule, read this guide, then jump straight to exact route or contract file

## Canonical values

Statuses:

- `pending`
- `in_progress`
- `done`
- `cancelled`

Severities:

- `low`
- `medium`
- `high`
- `critical`

## Todo DTO

Success payloads return `data` with this shape:

- `id: string`
- `text: string`
- `createdAt: ISO-8601 string, precision 3`
- `updatedAt: ISO-8601 string, precision 3`
- `bookmarked: boolean`
- `severity: low | medium | high | critical`
- `status: pending | in_progress | done | cancelled`
- `assignedTo: string | null`
- `projectId: string | null`

## Routes

### List todos

`GET /api/todos`

Filters, all optional:

- `status` repeated, any value in canonical status set
- `severity` repeated, any value in canonical severity set
- `assignedTo=<agentId>`
- `unassigned=true`
- `q=<text>`
- `bookmarked=true|false`

Rules:

- filters are ANDed together
- `assignedTo` and `unassigned` cannot be combined
- unknown query keys fail validation
- repeated `assignedTo`, `unassigned`, `q`, or `bookmarked` values fail validation

Response:

```json
{ "data": [TodoDto] }
```

### Create todo

`POST /api/todos`

Body:

```json
{
  "text": "Write docs",
  "bookmarked": false,
  "severity": "medium",
  "status": "pending",
  "projectId": null
}
```

Rules:

- `text` required, trimmed nonblank, max 10,000 chars
- `bookmarked` defaults to `false`
- `severity` defaults to `medium`
- `status` defaults to `pending`
- `projectId` defaults to `null`; a non-null value must identify an existing project
- strict object, extra keys fail validation
- `assignedTo` is not accepted

Response:

```json
{ "data": TodoDto }
```

### Get todo

`GET /api/todos/[id]`

Response:

```json
{ "data": TodoDto }
```

404 shape:

```json
{ "error": { "code": "NOT_FOUND", "message": "Todo not found" } }
```

### Update todo

`PATCH /api/todos/[id]`

Body may include any of:

- `text`
- `bookmarked`
- `severity`
- `status`
- `projectId`

Rules:

- at least one field required
- strict object, extra keys fail validation
- `status: pending` is blocked while todo is assigned
- omitted `projectId` is unchanged; `null` clears the project; a non-null value must identify an existing project
- update is otherwise direct partial mutation

Success:

```json
{ "data": TodoDto }
```

404 shape:

```json
{ "error": { "code": "NOT_FOUND", "message": "Todo not found" } }
```

409 shape:

```json
{
  "error": {
    "code": "LIFECYCLE_CONFLICT",
    "message": "Assigned Todo must be released before returning to pending"
  }
}
```

Create and update return `404 PROJECT_NOT_FOUND`, message `Project not found`, when a non-null `projectId` does not exist.

### Delete todo

`DELETE /api/todos/[id]`

Success:

- `204 No Content`

404 shape:

```json
{ "error": { "code": "NOT_FOUND", "message": "Todo not found" } }
```

Note, handler also has `409 LIFECYCLE_CONFLICT`, but current service path only returns success or not found.

### Claim todo

`POST /api/todos/[id]/claim`

Body:

```json
{ "agentId": "agent-123" }
```

Rules:

- `agentId` required, trimmed nonblank, max 128 chars
- strict object, extra keys fail validation
- claim only succeeds when todo is unassigned and status is `pending` or `in_progress`
- claim is atomic, no steal path

Success:

```json
{ "data": TodoDto }
```

404 shape:

```json
{ "error": { "code": "not_found", "message": "Todo not found" } }
```

409 shape:

```json
{
  "error": {
    "code": "claim_unavailable",
    "message": "Todo is already assigned or cannot be claimed in its current state"
  },
  "current": TodoDto
}
```

### Release todo

`POST /api/todos/[id]/release`

Body:

```json
{ "agentId": "agent-123" }
```

Rules:

- `agentId` required, trimmed nonblank, max 128 chars
- strict object, extra keys fail validation
- release only succeeds when todo is assigned to exact `agentId` and status is `in_progress`
- release is atomic, no cross-agent release

Success:

```json
{ "data": TodoDto }
```

404 shape:

```json
{ "error": { "code": "not_found", "message": "Todo not found" } }
```

409 shape:

```json
{
  "error": {
    "code": "release_unavailable",
    "message": "Todo can only be released by its assigned agent while in progress"
  },
  "current": TodoDto
}
```

## Project routes

Project values are trimmed but otherwise preserved. Paths are not normalized or probed on the filesystem. Names and paths are independently unique.

### List projects

`GET /api/projects`

Response:

```json
{ "data": [ProjectDto] }
```

`ProjectDto` contains `id`, `projectName`, `projectPath`, `createdAt`, and `updatedAt`.

### Create project

`POST /api/projects`

Body:

```json
{ "projectName": "Dayflow", "projectPath": "/workspace/dayflow" }
```

Rules:

- `projectName` and `projectPath` are required, trimmed, and nonblank
- strict object, extra keys fail validation
- duplicate name returns `409 PROJECT_NAME_CONFLICT`
- duplicate path returns `409 PROJECT_PATH_CONFLICT`

## Validation and envelopes

Collection and item routes use `src/app/api/todos/http.ts`.

- `Cache-Control: no-store` on collection and item responses
- `400 INVALID_JSON`, message `Request body must be valid JSON`
- `400 VALIDATION_ERROR`, message `Request validation failed`
- `404 NOT_FOUND`, message `Todo not found` on get, patch, delete
- `409 LIFECYCLE_CONFLICT`, message `Assigned Todo must be released before returning to pending` on patch
- `500 INTERNAL_ERROR`, message `An unexpected error occurred`

Claim and release routes return plain `Response.json(...)` envelopes.

- `400 invalid_json`, message `Request body must be valid JSON`
- `400 validation_error`, message `Request validation failed`
- `404 not_found`, message `Todo not found`
- `409 claim_unavailable` or `409 release_unavailable` for ownership conflict
- `500 internal_error`, message `An internal error occurred`

Error envelope pattern:

```json
{ "error": { "code": "...", "message": "..." } }
```

Collection and item validation errors include compact `issues` entries with `{ path, message }`.
Claim and release validation errors include raw zod `issues` entries.

## Atomic ownership and concurrency

- `agentId` is caller supplied coordination token, not auth
- claim is compare and set on `assignedTo = null`
- release is compare and set on `assignedTo = agentId`
- patch to `pending` is blocked while assigned
- treat `409` on claim or release as authoritative current state, then re-read before retrying
- never use list data to prove ownership, use claim or release response instead

## Curl examples

List:

```bash
curl -s 'http://localhost:3000/api/todos?status=pending&severity=high&q=docs&bookmarked=false'
```

Create:

```bash
curl -i -X POST 'http://localhost:3000/api/todos' \
  -H 'Content-Type: application/json' \
  -d '{"text":"Write docs","severity":"high","status":"pending"}'
```

Get:

```bash
curl -i 'http://localhost:3000/api/todos/todo_123'
```

Patch:

```bash
curl -i -X PATCH 'http://localhost:3000/api/todos/todo_123' \
  -H 'Content-Type: application/json' \
  -d '{"status":"done"}'
```

Delete:

```bash
curl -i -X DELETE 'http://localhost:3000/api/todos/todo_123'
```

Claim:

```bash
curl -i -X POST 'http://localhost:3000/api/todos/todo_123/claim' \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"agent-123"}'
```

Release:

```bash
curl -i -X POST 'http://localhost:3000/api/todos/todo_123/release' \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"agent-123"}'
```

## Static consistency notes

- exact route paths are `/api/todos`, `/api/todos/[id]`, `/api/todos/[id]/claim`, `/api/todos/[id]/release`
- claim and release are separate POST routes, no shared action flag
- list filters are server side, with exact keys above
- collection and item routes use no-store headers, claim and release do not
- claim and release error bodies include `current` on 409, item routes do not
