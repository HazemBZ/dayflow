# Dayflow Agent Guide

Start here for codebase discovery.

## One hop discovery

- Todo API guide: `docs/todos-agent-api.md` first, before Todo route work
- Indexed source, read with codegraph first, especially `src/app/api/todos/*` and `src/lib/todos/*`
- Fast symbol lookup: `codegraph_codegraph_search`
- Single symbol or file source: `codegraph_codegraph_node`
- Flow and blast radius: `codegraph_codegraph_explore`
- One hop rule: for Todo changes, read guide, then jump straight to exact route or contract file, do not branch out through unrelated app code

## Todo work

- Match route files exactly, do not infer extra endpoints
- Implemented Todo routes only:
  - `GET /api/todos`
  - `POST /api/todos`
  - `GET /api/todos/[id]`
  - `PATCH /api/todos/[id]`
  - `DELETE /api/todos/[id]`
  - `POST /api/todos/[id]/claim`
  - `POST /api/todos/[id]/release`
- Keep docs aligned with `src/app/api/todos/*` and `src/lib/todos/*`
- Treat `agentId` as caller supplied coordination token, not auth

## Project work

- Implemented project routes:
  - `GET /api/projects`
  - `POST /api/projects`
- Project contracts live in `src/lib/projects/contracts.ts`; persistence lives in `src/lib/projects/repository.ts`.
- Todo project association is nullable; use `projectId: null` to clear it.
- Project names and paths are trimmed and independently unique. Do not add filesystem probing or path normalization.

## Local guide

- `docs/todos-agent-api.md` is canonical local operating guide for Todo API CRUD, filters, claim, release, envelopes, and conflict rules
