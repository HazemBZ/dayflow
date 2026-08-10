"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { canvases, canvasNodes, canvasTodoNodes, canvasEdges, canvasFrames, canvasGenericNodes, canvasNoteNodes } from "@/lib/db/schema";

// ─── Canvas ──────────────────────────────────────────────────────────────────

export type CanvasRow = {
  id: string;
  name: string;
  position: number | null;
  viewportX: number | null;
  viewportY: number | null;
  viewportZoom: number | null;
  sidebarOpen: boolean | null;
  minimapCollapsed: boolean | null;
};

class CanvasOrderError extends Error {
  override readonly name = "CanvasOrderError";

  constructor(message: string) {
    super(message);
  }
}

const canvasIdListSchema = z.array(z.string().min(1));

export async function getCanvases(): Promise<CanvasRow[]> {
  const rows = await db
    .select()
    .from(canvases)
    .orderBy(asc(canvases.position), asc(canvases.createdAt), asc(canvases.id));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    position: r.position ?? null,
    viewportX: r.viewportX ?? null,
    viewportY: r.viewportY ?? null,
    viewportZoom: r.viewportZoom ?? null,
    sidebarOpen: r.sidebarOpen ?? null,
    minimapCollapsed: r.minimapCollapsed ?? null,
  }));
}

export async function createCanvas(name: string): Promise<CanvasRow> {
  const now = Date.now();
  const id = `canvas_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const position = sql<number>`coalesce((select max(${canvases.position}) + 1 from ${canvases}), 0)`;
  const [inserted] = await db
    .insert(canvases)
    .values({ id, name, position, createdAt: now, updatedAt: now })
    .returning({ position: canvases.position });
  const canvasPosition = inserted?.position ?? 0;
  return { id, name, position: canvasPosition, viewportX: null, viewportY: null, viewportZoom: null, sidebarOpen: null, minimapCollapsed: null };
}

export async function reorderCanvases(canvasIds: readonly string[]): Promise<void> {
  const parsedIds = canvasIdListSchema.parse(canvasIds);

  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: canvases.id }).from(canvases);
    const existingIds = new Set(existing.map((canvas) => canvas.id));
    const requestedIds = new Set(parsedIds);
    const isPermutation =
      existingIds.size === parsedIds.length &&
      requestedIds.size === parsedIds.length &&
      parsedIds.every((id) => existingIds.has(id));

    if (!isPermutation) {
      throw new CanvasOrderError("Canvas order must contain every canvas exactly once.");
    }

    await Promise.all(
      parsedIds.map((id, position) =>
        tx.update(canvases).set({ position }).where(eq(canvases.id, id)),
      ),
    );
  });
}

export async function updateCanvasViewport(
  canvasId: string,
  x: number,
  y: number,
  zoom: number,
): Promise<void> {
  await db
    .update(canvases)
    .set({ viewportX: x, viewportY: y, viewportZoom: zoom, updatedAt: Date.now() })
    .where(eq(canvases.id, canvasId));
}

export async function updateCanvasUIState(
  canvasId: string,
  state: { sidebarOpen?: boolean; minimapCollapsed?: boolean },
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (state.sidebarOpen !== undefined) updates.sidebarOpen = state.sidebarOpen;
  if (state.minimapCollapsed !== undefined) updates.minimapCollapsed = state.minimapCollapsed;
  await db.update(canvases).set(updates).where(eq(canvases.id, canvasId));
}

export async function renameCanvas(id: string, name: string): Promise<void> {
  await db
    .update(canvases)
    .set({ name, updatedAt: Date.now() })
    .where(eq(canvases.id, id));
}

export async function deleteCanvas(id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(canvasEdges).where(eq(canvasEdges.canvasId, id));
    await tx.delete(canvasNodes).where(eq(canvasNodes.canvasId, id));
    await tx.delete(canvasTodoNodes).where(eq(canvasTodoNodes.canvasId, id));
    await tx.delete(canvasGenericNodes).where(eq(canvasGenericNodes.canvasId, id));
    await tx.delete(canvasFrames).where(eq(canvasFrames.canvasId, id));
    await tx.delete(canvases).where(eq(canvases.id, id));

    const remaining = await tx
      .select({ id: canvases.id })
      .from(canvases)
      .orderBy(asc(canvases.position), asc(canvases.createdAt), asc(canvases.id));
    await Promise.all(
      remaining.map((canvas, position) =>
        tx.update(canvases).set({ position }).where(eq(canvases.id, canvas.id)),
      ),
    );
  });
}

// ─── Canvas Nodes ──────────────────────────────────────────────────────────

export type CanvasNodeRow = {
  canvasId: string;
  noteId: string;
  x: number;
  y: number;
  frameId: string | null;
};

export async function getCanvasNodes(canvasId: string): Promise<CanvasNodeRow[]> {
  const rows = await db
    .select()
    .from(canvasNodes)
    .where(eq(canvasNodes.canvasId, canvasId));
  return rows.map((r) => ({ canvasId: r.canvasId, noteId: r.noteId, x: r.x, y: r.y, frameId: r.frameId ?? null }));
}

export async function upsertCanvasNode(
  canvasId: string,
  noteId: string,
  x: number,
  y: number,
): Promise<CanvasNodeRow> {
  const now = Date.now();
  const existing = await db
    .select({ frameId: canvasNodes.frameId })
    .from(canvasNodes)
    .where(and(eq(canvasNodes.canvasId, canvasId), eq(canvasNodes.noteId, noteId)))
    .limit(1);
  const currentFrameId = existing.length > 0 ? existing[0].frameId : null;
  await db
    .insert(canvasNodes)
    .values({ canvasId, noteId, x, y, frameId: currentFrameId, updatedAt: now })
    .onConflictDoUpdate({
      target: [canvasNodes.canvasId, canvasNodes.noteId],
      set: { x, y, updatedAt: now },
    });
  return { canvasId, noteId, x, y, frameId: currentFrameId };
}

export async function removeCanvasNode(canvasId: string, noteId: string) {
  await db
    .delete(canvasNodes)
    .where(
      and(
        eq(canvasNodes.canvasId, canvasId),
        eq(canvasNodes.noteId, noteId),
      ),
    );
}

export type CanvasTodoNodeRow = {
  canvasId: string;
  todoId: string;
  x: number;
  y: number;
  frameId: string | null;
  createdAt: number;
  updatedAt: number;
};

export async function getCanvasTodoNodes(canvasId: string): Promise<CanvasTodoNodeRow[]> {
  const rows = await db
    .select()
    .from(canvasTodoNodes)
    .where(eq(canvasTodoNodes.canvasId, canvasId));
  return rows.map((row) => ({
    canvasId: row.canvasId,
    todoId: row.todoId,
    x: row.x,
    y: row.y,
    frameId: row.frameId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function upsertCanvasTodoNode(
  canvasId: string,
  todoId: string,
  x: number,
  y: number,
): Promise<CanvasTodoNodeRow> {
  const now = Date.now();
  const existing = await db
    .select({ frameId: canvasTodoNodes.frameId, createdAt: canvasTodoNodes.createdAt })
    .from(canvasTodoNodes)
    .where(and(eq(canvasTodoNodes.canvasId, canvasId), eq(canvasTodoNodes.todoId, todoId)))
    .limit(1);
  const current = existing[0];
  const frameId = current?.frameId ?? null;
  const createdAt = current?.createdAt ?? now;
  await db
    .insert(canvasTodoNodes)
    .values({ canvasId, todoId, x, y, frameId, createdAt, updatedAt: now })
    .onConflictDoUpdate({
      target: [canvasTodoNodes.canvasId, canvasTodoNodes.todoId],
      set: { x, y, updatedAt: now },
    });
  return { canvasId, todoId, x, y, frameId, createdAt, updatedAt: now };
}

export async function removeCanvasTodoNode(canvasId: string, todoId: string): Promise<void> {
  await db
    .delete(canvasTodoNodes)
    .where(
      and(
        eq(canvasTodoNodes.canvasId, canvasId),
        eq(canvasTodoNodes.todoId, todoId),
      ),
    );
}

// ─── Canvas Frames ─────────────────────────────────────────────────────────

export type CanvasFrameRow = {
  id: string;
  canvasId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | null;
};

export async function getCanvasFrames(canvasId: string): Promise<CanvasFrameRow[]> {
  const rows = await db
    .select()
    .from(canvasFrames)
    .where(eq(canvasFrames.canvasId, canvasId))
    .orderBy(canvasFrames.createdAt);
  return rows.map((r) => ({
    id: r.id,
    canvasId: r.canvasId,
    name: r.name,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    color: r.color,
  }));
}

export async function upsertCanvasFrame(
  canvasId: string,
  id: string | undefined,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string | null,
): Promise<CanvasFrameRow> {
  const now = Date.now();
  const frameId = id ?? `frame_${now}_${Math.random().toString(36).slice(2, 8)}`;
  await db
    .insert(canvasFrames)
    .values({ id: frameId, canvasId, name, x, y, width, height, color, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: canvasFrames.id,
      set: { name, x, y, width, height, color, updatedAt: now },
    });
  return { id: frameId, canvasId, name, x, y, width, height, color };
}

export async function removeCanvasFrame(canvasId: string, id: string) {
  // Unlink all nodes from this frame first
  await db
    .update(canvasNodes)
    .set({ frameId: null })
    .where(and(eq(canvasNodes.canvasId, canvasId), eq(canvasNodes.frameId, id)));
  await db
    .update(canvasTodoNodes)
    .set({ frameId: null })
    .where(and(eq(canvasTodoNodes.canvasId, canvasId), eq(canvasTodoNodes.frameId, id)));
  await db
    .update(canvasGenericNodes)
    .set({ frameId: null })
    .where(and(eq(canvasGenericNodes.canvasId, canvasId), eq(canvasGenericNodes.frameId, id)));
  await db
    .update(canvasNoteNodes)
    .set({ frameId: null })
    .where(and(eq(canvasNoteNodes.canvasId, canvasId), eq(canvasNoteNodes.frameId, id)));
  await db
    .delete(canvasFrames)
    .where(and(eq(canvasFrames.canvasId, canvasId), eq(canvasFrames.id, id)));
}

export async function setNodeFrame(
  canvasId: string,
  noteId: string,
  frameId: string | null,
): Promise<void> {
  await db
    .update(canvasNodes)
    .set({ frameId })
    .where(and(eq(canvasNodes.canvasId, canvasId), eq(canvasNodes.noteId, noteId)));
}

export async function setTodoNodeFrame(
  canvasId: string,
  todoId: string,
  frameId: string | null,
): Promise<void> {
  await db
    .update(canvasTodoNodes)
    .set({ frameId, updatedAt: Date.now() })
    .where(
      and(
        eq(canvasTodoNodes.canvasId, canvasId),
        eq(canvasTodoNodes.todoId, todoId),
      ),
    );
}

// ─── Canvas Generic Nodes ──────────────────────────────────────────────────

export type CanvasGenericNodeRow = {
  id: string;
  canvasId: string;
  content: string;
  x: number;
  y: number;
  frameId: string | null;
};

export async function getCanvasGenericNodes(canvasId: string): Promise<CanvasGenericNodeRow[]> {
  const rows = await db
    .select()
    .from(canvasGenericNodes)
    .where(eq(canvasGenericNodes.canvasId, canvasId))
    .orderBy(canvasGenericNodes.createdAt);
  return rows.map((r) => ({
    id: r.id,
    canvasId: r.canvasId,
    content: r.content,
    x: r.x,
    y: r.y,
    frameId: r.frameId ?? null,
  }));
}

export async function upsertCanvasGenericNode(
  canvasId: string,
  id: string | undefined,
  content: string,
  x: number,
  y: number,
): Promise<CanvasGenericNodeRow> {
  const now = Date.now();
  const nodeId = id ?? `gen_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const existing = await db
    .select({ frameId: canvasGenericNodes.frameId })
    .from(canvasGenericNodes)
    .where(eq(canvasGenericNodes.id, nodeId))
    .limit(1);
  const currentFrameId = existing.length > 0 ? existing[0].frameId : null;
  await db
    .insert(canvasGenericNodes)
    .values({ id: nodeId, canvasId, content, x, y, frameId: currentFrameId, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: canvasGenericNodes.id,
      set: { content, x, y, updatedAt: now },
    });
  return { id: nodeId, canvasId, content, x, y, frameId: currentFrameId };
}

export async function updateCanvasGenericNodeContent(
  id: string,
  content: string,
): Promise<void> {
  await db
    .update(canvasGenericNodes)
    .set({ content, updatedAt: Date.now() })
    .where(eq(canvasGenericNodes.id, id));
}

export async function removeCanvasGenericNode(canvasId: string, id: string) {
  await db
    .delete(canvasGenericNodes)
    .where(
      and(
        eq(canvasGenericNodes.canvasId, canvasId),
        eq(canvasGenericNodes.id, id),
      ),
    );
}

export async function setGenericNodeFrame(
  id: string,
  frameId: string | null,
): Promise<void> {
  await db
    .update(canvasGenericNodes)
    .set({ frameId, updatedAt: Date.now() })
    .where(eq(canvasGenericNodes.id, id));
}

// ─── Canvas Note Nodes ─────────────────────────────────────────────────────

export type CanvasNoteNodeRow = {
  id: string;
  canvasId: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frameId: string | null;
};

export async function getCanvasNoteNodes(canvasId: string): Promise<CanvasNoteNodeRow[]> {
  const rows = await db
    .select()
    .from(canvasNoteNodes)
    .where(eq(canvasNoteNodes.canvasId, canvasId))
    .orderBy(canvasNoteNodes.createdAt);
  return rows.map((r) => ({
    id: r.id,
    canvasId: r.canvasId,
    content: r.content,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    frameId: r.frameId ?? null,
  }));
}

export async function upsertCanvasNoteNode(
  canvasId: string,
  id: string | undefined,
  content: string,
  x: number,
  y: number,
  width = 280,
  height = 200,
): Promise<CanvasNoteNodeRow> {
  const now = Date.now();
  const nodeId = id ?? `note_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const existing = await db
    .select({ frameId: canvasNoteNodes.frameId })
    .from(canvasNoteNodes)
    .where(eq(canvasNoteNodes.id, nodeId))
    .limit(1);
  const currentFrameId = existing.length > 0 ? existing[0].frameId : null;
  await db
    .insert(canvasNoteNodes)
    .values({ id: nodeId, canvasId, content, x, y, width, height, frameId: currentFrameId, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: canvasNoteNodes.id,
      set: { content, x, y, width, height, updatedAt: now },
    });
  return { id: nodeId, canvasId, content, x, y, width, height, frameId: currentFrameId };
}

export async function updateCanvasNoteNodeContent(
  id: string,
  content: string,
): Promise<void> {
  await db
    .update(canvasNoteNodes)
    .set({ content, updatedAt: Date.now() })
    .where(eq(canvasNoteNodes.id, id));
}

export async function removeCanvasNoteNode(canvasId: string, id: string) {
  await db
    .delete(canvasNoteNodes)
    .where(
      and(
        eq(canvasNoteNodes.canvasId, canvasId),
        eq(canvasNoteNodes.id, id),
      ),
    );
}

export async function setCanvasNoteNodeFrame(
  id: string,
  frameId: string | null,
): Promise<void> {
  await db
    .update(canvasNoteNodes)
    .set({ frameId, updatedAt: Date.now() })
    .where(eq(canvasNoteNodes.id, id));
}

// ─── Canvas Edges ──────────────────────────────────────────────────────────

export type CanvasEdgeRow = {
  id: string;
  canvasId: string;
  sourceNoteId: string;
  targetNoteId: string;
};

export async function getCanvasEdges(canvasId: string): Promise<CanvasEdgeRow[]> {
  const rows = await db
    .select()
    .from(canvasEdges)
    .where(eq(canvasEdges.canvasId, canvasId));
  return rows.map((r) => ({
    id: r.id,
    canvasId: r.canvasId,
    sourceNoteId: r.sourceNoteId,
    targetNoteId: r.targetNoteId,
  }));
}

export async function addCanvasEdge(
  canvasId: string,
  sourceNoteId: string,
  targetNoteId: string,
): Promise<CanvasEdgeRow> {
  const now = Date.now();
  const id = `edge_${now}_${Math.random().toString(36).slice(2, 8)}`;
  await db
    .insert(canvasEdges)
    .values({ id, canvasId, sourceNoteId, targetNoteId, updatedAt: now });
  return { id, canvasId, sourceNoteId, targetNoteId };
}

export async function removeCanvasEdge(canvasId: string, id: string) {
  await db
    .delete(canvasEdges)
    .where(
      and(
        eq(canvasEdges.canvasId, canvasId),
        eq(canvasEdges.id, id),
      ),
    );
}
