"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { canvases, canvasNodes, canvasEdges, canvasFrames } from "@/lib/db/schema";

// ─── Canvas ──────────────────────────────────────────────────────────────────

export type CanvasRow = {
  id: string;
  name: string;
  viewportX: number | null;
  viewportY: number | null;
  viewportZoom: number | null;
  sidebarOpen: boolean | null;
  minimapCollapsed: boolean | null;
};

export async function getCanvases(): Promise<CanvasRow[]> {
  const rows = await db.select().from(canvases).orderBy(canvases.createdAt);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
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
  await db.insert(canvases).values({ id, name, createdAt: now, updatedAt: now });
  return { id, name, viewportX: null, viewportY: null, viewportZoom: null, sidebarOpen: null, minimapCollapsed: null };
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
  await db.delete(canvasEdges).where(eq(canvasEdges.canvasId, id));
  await db.delete(canvasNodes).where(eq(canvasNodes.canvasId, id));
  await db.delete(canvases).where(eq(canvases.id, id));
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
