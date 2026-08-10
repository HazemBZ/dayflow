import type {
  CanvasEdgeRow,
  CanvasFrameRow,
  CanvasGenericNodeRow,
  CanvasNodeRow,
  CanvasNoteNodeRow,
  CanvasTodoNodeRow,
} from "@/lib/actions/canvas";
import type { TodoDto, TodoSeverity, TodoStatus } from "@/lib/todos/contracts";

/**
 * In-session clipboard planning for canvas nodes.
 *
 * Pure planning only — no OS clipboard APIs, no DB, no React. Captures a
 * selection of flow node IDs into a self-contained {@link ClipboardPlan}
 * that a paste handler can consume: the nodes/frames to recreate, the
 * note edges that stay internal to the selection, and the selection bounds
 * used to align pasted content.
 *
 * Flow node ID conventions (mirrors `src/app/canvas/page.tsx`):
 * - note nodes:   the note ID
 * - todo nodes:   `todo:<todoId>`
 * - generic nodes: the generic node ID
 * - canvas notes: the canvas note node ID
 * - frame nodes:  the frame ID
 */
export const CLIPBOARD_NUDGE = 40;

export type ClipboardNoteItem = Readonly<{
  kind: "note";
  id: string;
  noteId: string;
  x: number;
  y: number;
  frameId: string | null;
}>;

export type ClipboardTodoItem = Readonly<{
  kind: "todo";
  id: string;
  todoId: string;
  text: string;
  severity: TodoSeverity;
  status: TodoStatus;
  bookmarked: boolean;
  projectId: string | null;
  x: number;
  y: number;
  frameId: string | null;
}>;

export type ClipboardGenericItem = Readonly<{
  kind: "generic";
  id: string;
  content: string;
  x: number;
  y: number;
  frameId: string | null;
}>;

export type ClipboardCanvasNoteItem = Readonly<{
  kind: "canvasNote";
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frameId: string | null;
}>;

export type ClipboardFrameItem = Readonly<{
  kind: "frame";
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | null;
}>;

export type ClipboardItem =
  | ClipboardNoteItem
  | ClipboardTodoItem
  | ClipboardGenericItem
  | ClipboardCanvasNoteItem
  | ClipboardFrameItem;

export type ClipboardEdge = Readonly<{
  sourceNoteId: string;
  targetNoteId: string;
}>;

export type ClipboardBounds = Readonly<{
  minX: number;
  minY: number;
}>;

export type ClipboardPlan = Readonly<{
  items: readonly ClipboardItem[];
  edges: readonly ClipboardEdge[];
  bounds: ClipboardBounds;
}>;

export type ClipboardSelectionInput = Readonly<{
  /** Flow node IDs currently selected on the canvas. */
  selectedIds: readonly string[];
  nodes: readonly CanvasNodeRow[];
  todoNodes: readonly CanvasTodoNodeRow[];
  genericNodes: readonly CanvasGenericNodeRow[];
  noteNodes: readonly CanvasNoteNodeRow[];
  frames: readonly CanvasFrameRow[];
  edges: readonly CanvasEdgeRow[];
  /** Enrichment lookup for todo nodes; a todo node without an entry is skipped. */
  todosById: ReadonlyMap<string, TodoDto>;
}>;

function todoFlowId(todoId: string): string {
  return `todo:${todoId}`;
}

function isTodoFlowId(flowId: string): boolean {
  return flowId.startsWith("todo:");
}

/**
 * Builds a {@link ClipboardPlan} for the given selection, or `null` when
 * nothing would be copied (empty or unresolvable selection).
 *
 * - Selecting a frame pulls in every child node (notes, todos, generics,
 *   canvas notes) nested under that frame.
 * - Expansion and overlapping selections are deduplicated by flow node ID.
 * - Only note edges whose both endpoints are captured are retained.
 * - An item whose `frameId` points at a frame that is NOT captured gets its
 *   reference cleared, so the plan is self-contained.
 */
export function planClipboardSelection(
  input: ClipboardSelectionInput,
): ClipboardPlan | null {
  if (input.selectedIds.length === 0) return null;

  const notesById = new Map(input.nodes.map((node) => [node.noteId, node]));
  const todoNodesById = new Map(input.todoNodes.map((node) => [node.todoId, node]));
  const genericsById = new Map(input.genericNodes.map((node) => [node.id, node]));
  const noteNodesById = new Map(input.noteNodes.map((node) => [node.id, node]));
  const framesById = new Map(input.frames.map((frame) => [frame.id, frame]));

  const items: ClipboardItem[] = [];
  const visited = new Set<string>();

  const addItem = (flowId: string): void => {
    if (visited.has(flowId)) return;
    visited.add(flowId);

    const frame = framesById.get(flowId);
    if (frame) {
      items.push({
        kind: "frame",
        id: frame.id,
        name: frame.name,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        color: frame.color,
      });
      for (const node of input.nodes) {
        if (node.frameId === frame.id) addItem(node.noteId);
      }
      for (const node of input.todoNodes) {
        if (node.frameId === frame.id) addItem(todoFlowId(node.todoId));
      }
      for (const node of input.genericNodes) {
        if (node.frameId === frame.id) addItem(node.id);
      }
      for (const node of input.noteNodes) {
        if (node.frameId === frame.id) addItem(node.id);
      }
      return;
    }

    const note = notesById.get(flowId);
    if (note) {
      items.push({
        kind: "note",
        id: note.noteId,
        noteId: note.noteId,
        x: note.x,
        y: note.y,
        frameId: note.frameId,
      });
      return;
    }

    const generic = genericsById.get(flowId);
    if (generic) {
      items.push({
        kind: "generic",
        id: generic.id,
        content: generic.content,
        x: generic.x,
        y: generic.y,
        frameId: generic.frameId,
      });
      return;
    }

    const noteNode = noteNodesById.get(flowId);
    if (noteNode) {
      items.push({
        kind: "canvasNote",
        id: noteNode.id,
        content: noteNode.content,
        x: noteNode.x,
        y: noteNode.y,
        width: noteNode.width,
        height: noteNode.height,
        frameId: noteNode.frameId,
      });
      return;
    }

    if (isTodoFlowId(flowId)) {
      const todoId = flowId.slice("todo:".length);
      const todoNode = todoNodesById.get(todoId);
      const todo = input.todosById.get(todoId);
      if (todoNode && todo) {
        items.push({
          kind: "todo",
          id: flowId,
          todoId,
          text: todo.text,
          severity: todo.severity,
          status: todo.status,
          bookmarked: todo.bookmarked,
          projectId: todo.projectId,
          x: todoNode.x,
          y: todoNode.y,
          frameId: todoNode.frameId,
        });
      }
    }
  };

  for (const flowId of input.selectedIds) {
    addItem(flowId);
  }

  if (items.length === 0) return null;

  // Clear dangling frame references — an item must not point at a frame
  // that is not part of the captured plan.
  const capturedFrameIds = new Set(
    items
      .filter((item): item is ClipboardFrameItem => item.kind === "frame")
      .map((item) => item.id),
  );
  const normalizedItems = items.map((item) => {
    if (item.kind === "frame") return item;
    if (item.frameId !== null && !capturedFrameIds.has(item.frameId)) {
      return { ...item, frameId: null };
    }
    return item;
  });

  const capturedNoteIds = new Set(
    normalizedItems
      .filter((item): item is ClipboardNoteItem => item.kind === "note")
      .map((item) => item.noteId),
  );
  const edges: ClipboardEdge[] = [];
  for (const edge of input.edges) {
    if (
      capturedNoteIds.has(edge.sourceNoteId) &&
      capturedNoteIds.has(edge.targetNoteId)
    ) {
      edges.push({
        sourceNoteId: edge.sourceNoteId,
        targetNoteId: edge.targetNoteId,
      });
    }
  }

  const xs = normalizedItems.map((item) => item.x);
  const ys = normalizedItems.map((item) => item.y);

  return {
    items: normalizedItems,
    edges,
    bounds: {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
    },
  };
}

/**
 * Returns a new items array with every position translated by `(dx, dy)`.
 * Input array and items are never mutated.
 */
export function shiftItems(
  items: readonly ClipboardItem[],
  dx: number,
  dy: number,
): readonly ClipboardItem[] {
  return items.map((item) => ({ ...item, x: item.x + dx, y: item.y + dy }));
}

/**
 * Returns a new items array nudged by {@link CLIPBOARD_NUDGE} on both axes,
 * so pasted content is visible next to the original without overlapping it.
 */
export function nudgeItems(
  items: readonly ClipboardItem[],
): readonly ClipboardItem[] {
  return shiftItems(items, CLIPBOARD_NUDGE, CLIPBOARD_NUDGE);
}
