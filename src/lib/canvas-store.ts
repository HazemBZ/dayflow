import {
  getCanvases,
  createCanvas,
  renameCanvas,
  deleteCanvas,
  reorderCanvases,
  getCanvasNodes,
  upsertCanvasNode,
  removeCanvasNode,
  getCanvasTodoNodes,
  upsertCanvasTodoNode,
  removeCanvasTodoNode,
  getCanvasEdges,
  addCanvasEdge,
  removeCanvasEdge,
  getCanvasFrames,
  upsertCanvasFrame,
  removeCanvasFrame,
  setNodeFrame,
  setTodoNodeFrame,
  getCanvasGenericNodes,
  upsertCanvasGenericNode,
  updateCanvasGenericNodeContent,
  removeCanvasGenericNode,
  setGenericNodeFrame,
  getCanvasNoteNodes,
  upsertCanvasNoteNode,
  updateCanvasNoteNodeContent,
  removeCanvasNoteNode,
  setCanvasNoteNodeFrame,
  updateCanvasViewport,
  updateCanvasUIState,
  type CanvasRow,
  type CanvasNodeRow,
  type CanvasTodoNodeRow,
  type CanvasEdgeRow,
  type CanvasFrameRow,
  type CanvasGenericNodeRow,
  type CanvasNoteNodeRow,
} from "@/lib/actions/canvas";

export type { CanvasRow, CanvasNodeRow, CanvasTodoNodeRow, CanvasEdgeRow, CanvasFrameRow, CanvasGenericNodeRow, CanvasNoteNodeRow };

type Listener = () => void;

let _canvases: CanvasRow[] = [];
let _nodes: CanvasNodeRow[] = [];
let _todoNodes: CanvasTodoNodeRow[] = [];
let _edges: CanvasEdgeRow[] = [];
let _frames: CanvasFrameRow[] = [];
let _genericNodes: CanvasGenericNodeRow[] = [];
let _noteNodes: CanvasNoteNodeRow[] = [];
let _activeCanvasId: string | null = null;
const listeners = new Set<Listener>();

let _loaded = false;

// Memoization for snapshots
const _emptyArr: readonly [] = Object.freeze([]);
let _lastCanvasesKey = "";
let _lastCanvasesSnapshot: readonly CanvasRow[] = _emptyArr;
let _lastNodesKey = "";
let _lastNodesSnapshot: readonly CanvasNodeRow[] = _emptyArr;
let _lastTodoNodesKey = "";
let _lastTodoNodesSnapshot: readonly CanvasTodoNodeRow[] = _emptyArr;
let _lastEdgesKey = "";
let _lastEdgesSnapshot: readonly CanvasEdgeRow[] = _emptyArr;
let _lastFramesKey = "";
let _lastFramesSnapshot: readonly CanvasFrameRow[] = _emptyArr;
let _lastGenericNodesKey = "";
let _lastGenericNodesSnapshot: readonly CanvasGenericNodeRow[] = _emptyArr;
let _lastNoteNodesKey = "";
let _lastNoteNodesSnapshot: readonly CanvasNoteNodeRow[] = _emptyArr;

function serializeCanvases(list: CanvasRow[]): string {
  return JSON.stringify(list.map((c) => [c.id, c.name]));
}
function serializeNodes(nodes: CanvasNodeRow[]): string {
  return JSON.stringify(nodes.map((n) => [n.noteId, n.x, n.y]));
}
function serializeTodoNodes(nodes: CanvasTodoNodeRow[]): string {
  return JSON.stringify(nodes.map((n) => [n.todoId, n.x, n.y, n.frameId]));
}
function serializeEdges(edges: CanvasEdgeRow[]): string {
  return JSON.stringify(edges.map((e) => [e.id, e.sourceNoteId, e.targetNoteId]));
}
function serializeFrames(frames: CanvasFrameRow[]): string {
  return JSON.stringify(frames.map((f) => [f.id, f.name, f.x, f.y, f.width, f.height, f.color]));
}
function serializeGenericNodes(nodes: CanvasGenericNodeRow[]): string {
  return JSON.stringify(nodes.map((n) => [n.id, n.content, n.x, n.y, n.frameId]));
}
function serializeNoteNodes(nodes: CanvasNoteNodeRow[]): string {
  return JSON.stringify(nodes.map((n) => [n.id, n.content, n.x, n.y, n.width, n.height, n.frameId]));
}

function notify() {
  listeners.forEach((l) => l());
}

export const canvasStore = {
  get loaded(): boolean {
    return _loaded;
  },

  get activeCanvasId(): string | null {
    return _activeCanvasId;
  },

  // ── Load canvases and nodes/edges for active canvas ────────────────

  async load(canvasId?: string): Promise<void> {
    const list = await getCanvases();
    if (list.length === 0) {
      const main = await createCanvas("Main Canvas");
      list.push(main);
    }
    _canvases = list;

    // If canvasId was passed, use it; else first canvas
    const targetId = canvasId ?? _canvases[0].id;
    _activeCanvasId = targetId;

    const [nodes, todoNodes, edges, frames, genericNodes, noteNodes] = await Promise.all([
      getCanvasNodes(targetId),
      getCanvasTodoNodes(targetId),
      getCanvasEdges(targetId),
      getCanvasFrames(targetId),
      getCanvasGenericNodes(targetId),
      getCanvasNoteNodes(targetId),
    ]);
    _nodes = nodes;
    _todoNodes = todoNodes;
    _edges = edges;
    _frames = frames;
    _genericNodes = genericNodes;
    _noteNodes = noteNodes;

    _loaded = true;
    _lastCanvasesKey = "";
    _lastNodesKey = "";
    _lastTodoNodesKey = "";
    _lastEdgesKey = "";
    _lastFramesKey = "";
    _lastGenericNodesKey = "";
    _lastNoteNodesKey = "";
    notify();
  },

  // ── Switch active canvas ───────────────────────────────────────────

  async setActiveCanvas(canvasId: string): Promise<void> {
    if (canvasId === _activeCanvasId) return;
    const [nodes, todoNodes, edges, frames, genericNodes, noteNodes] = await Promise.all([
      getCanvasNodes(canvasId),
      getCanvasTodoNodes(canvasId),
      getCanvasEdges(canvasId),
      getCanvasFrames(canvasId),
      getCanvasGenericNodes(canvasId),
      getCanvasNoteNodes(canvasId),
    ]);
    _activeCanvasId = canvasId;
    _nodes = nodes;
    _todoNodes = todoNodes;
    _edges = edges;
    _frames = frames;
    _genericNodes = genericNodes;
    _noteNodes = noteNodes;
    _lastNodesKey = "";
    _lastTodoNodesKey = "";
    _lastEdgesKey = "";
    _lastFramesKey = "";
    _lastGenericNodesKey = "";
    _lastNoteNodesKey = "";
    notify();
  },

  // ── Viewport ─────────────────────────────────────────────────────────────────

  async updateViewport(x: number, y: number, zoom: number): Promise<void> {
    if (!_activeCanvasId) return;
    await updateCanvasViewport(_activeCanvasId, x, y, zoom);
    const canvas = _canvases.find((c) => c.id === _activeCanvasId);
    if (canvas) {
      canvas.viewportX = x;
      canvas.viewportY = y;
      canvas.viewportZoom = zoom;
    }
    _lastCanvasesKey = "";
    notify();
  },

  async updateUIState(state: { sidebarOpen?: boolean; minimapCollapsed?: boolean }): Promise<void> {
    if (!_activeCanvasId) return;
    await updateCanvasUIState(_activeCanvasId, state);
    const canvas = _canvases.find((c) => c.id === _activeCanvasId);
    if (canvas) {
      if (state.sidebarOpen !== undefined) canvas.sidebarOpen = state.sidebarOpen;
      if (state.minimapCollapsed !== undefined) canvas.minimapCollapsed = state.minimapCollapsed;
    }
    _lastCanvasesKey = "";
    notify();
  },

  // ── Canvas CRUD ────────────────────────────────────────────────────

  getCanvases(): readonly CanvasRow[] {
    return _canvases;
  },

  async createCanvas(name: string): Promise<CanvasRow> {
    const c = await createCanvas(name);
    _canvases.push(c);
    _lastCanvasesKey = "";
    notify();
    return c;
  },

  async renameCanvas(id: string, name: string): Promise<void> {
    await renameCanvas(id, name);
    const found = _canvases.find((c) => c.id === id);
    if (found) found.name = name;
    _lastCanvasesKey = "";
    notify();
  },

  async reorderCanvases(canvasIds: readonly string[]): Promise<void> {
    await reorderCanvases(canvasIds);
    _canvases = await getCanvases();
    _lastCanvasesKey = "";
    notify();
  },

  async deleteCanvas(id: string): Promise<void> {
    await deleteCanvas(id);
    _canvases = _canvases.filter((c) => c.id !== id);
    _lastCanvasesKey = "";

    // If active canvas was deleted, switch to first available
    if (_activeCanvasId === id) {
      if (_canvases.length > 0) {
        await this.setActiveCanvas(_canvases[0].id);
      } else {
        const main = await createCanvas("Main Canvas");
        _canvases.push(main);
        await this.setActiveCanvas(main.id);
      }
    }
    notify();
  },

  // ── Active-canvas node operations ──────────────────────────────────

  getNodes(): readonly CanvasNodeRow[] {
    return _nodes;
  },

  getTodoNodes(): readonly CanvasTodoNodeRow[] {
    return _todoNodes;
  },

  getEdges(): readonly CanvasEdgeRow[] {
    return _edges;
  },

  async upsertNode(noteId: string, x: number, y: number) {
    if (!_activeCanvasId) return;
    const node = await upsertCanvasNode(_activeCanvasId, noteId, x, y);
    const idx = _nodes.findIndex((n) => n.noteId === noteId);
    if (idx >= 0) {
      _nodes[idx] = node;
    } else {
      _nodes.push(node);
    }
    _lastNodesKey = "";
    notify();
  },

  async removeNode(noteId: string) {
    if (!_activeCanvasId) return;
    await removeCanvasNode(_activeCanvasId, noteId);
    _nodes = _nodes.filter((n) => n.noteId !== noteId);
    _edges = _edges.filter((e) => e.sourceNoteId !== noteId && e.targetNoteId !== noteId);
    _lastNodesKey = "";
    _lastEdgesKey = "";
    notify();
  },

  async upsertTodoNode(todoId: string, x: number, y: number): Promise<void> {
    if (!_activeCanvasId) return;
    const node = await upsertCanvasTodoNode(_activeCanvasId, todoId, x, y);
    const index = _todoNodes.findIndex((current) => current.todoId === todoId);
    if (index >= 0) {
      _todoNodes[index] = node;
    } else {
      _todoNodes.push(node);
    }
    _lastTodoNodesKey = "";
    notify();
  },

  async removeTodoNode(todoId: string): Promise<void> {
    if (!_activeCanvasId) return;
    await removeCanvasTodoNode(_activeCanvasId, todoId);
    _todoNodes = _todoNodes.filter((node) => node.todoId !== todoId);
    _lastTodoNodesKey = "";
    notify();
  },

  async addEdge(sourceNoteId: string, targetNoteId: string) {
    if (!_activeCanvasId) return;
    const edge = await addCanvasEdge(_activeCanvasId, sourceNoteId, targetNoteId);
    _edges.push(edge);
    _lastEdgesKey = "";
    notify();
  },

  async removeEdge(id: string) {
    if (!_activeCanvasId) return;
    await removeCanvasEdge(_activeCanvasId, id);
    _edges = _edges.filter((e) => e.id !== id);
    _lastEdgesKey = "";
    notify();
  },

  // ── Active-canvas frame operations ────────────────────────────────

  getFrames(): readonly CanvasFrameRow[] {
    return _frames;
  },

  async upsertFrame(
    id: string | undefined,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string | null,
  ): Promise<CanvasFrameRow> {
    if (!_activeCanvasId) throw new Error("No active canvas");
    const frame = await upsertCanvasFrame(_activeCanvasId, id, name, x, y, width, height, color);
    const idx = _frames.findIndex((f) => f.id === frame.id);
    if (idx >= 0) {
      _frames[idx] = frame;
    } else {
      _frames.push(frame);
    }
    _lastFramesKey = "";
    notify();
    return frame;
  },

  async removeFrame(id: string) {
    if (!_activeCanvasId) return;
    await removeCanvasFrame(_activeCanvasId, id);
    _frames = _frames.filter((f) => f.id !== id);
    // Unlink nodes that referenced this frame
    for (const node of _nodes) {
      if (node.frameId === id) {
        (node as CanvasNodeRow & { frameId: string | null }).frameId = null;
      }
    }
    _todoNodes = _todoNodes.map((node) =>
      node.frameId === id ? { ...node, frameId: null } : node,
    );
    for (const gn of _genericNodes) {
      if (gn.frameId === id) {
        (gn as CanvasGenericNodeRow & { frameId: string | null }).frameId = null;
      }
    }
    for (const nn of _noteNodes) {
      if (nn.frameId === id) {
        (nn as CanvasNoteNodeRow & { frameId: string | null }).frameId = null;
      }
    }
    _lastNodesKey = "";
    _lastTodoNodesKey = "";
    _lastFramesKey = "";
    _lastGenericNodesKey = "";
    _lastNoteNodesKey = "";
    notify();
  },

  async setNodeFrame(noteId: string, frameId: string | null) {
    if (!_activeCanvasId) return;
    await setNodeFrame(_activeCanvasId, noteId, frameId);
    const node = _nodes.find((n) => n.noteId === noteId);
    if (node) {
      (node as CanvasNodeRow & { frameId: string | null }).frameId = frameId;
    }
    _lastNodesKey = "";
    notify();
  },

  async setTodoNodeFrame(todoId: string, frameId: string | null): Promise<void> {
    if (!_activeCanvasId) return;
    await setTodoNodeFrame(_activeCanvasId, todoId, frameId);
    _todoNodes = _todoNodes.map((node) =>
      node.todoId === todoId ? { ...node, frameId } : node,
    );
    _lastTodoNodesKey = "";
    notify();
  },

  // ── Active-canvas generic node operations ─────────────────────────

  getGenericNodes(): readonly CanvasGenericNodeRow[] {
    return _genericNodes;
  },

  async upsertGenericNode(
    id: string | undefined,
    content: string,
    x: number,
    y: number,
  ): Promise<CanvasGenericNodeRow> {
    if (!_activeCanvasId) throw new Error("No active canvas");
    const node = await upsertCanvasGenericNode(_activeCanvasId, id, content, x, y);
    const idx = _genericNodes.findIndex((n) => n.id === node.id);
    if (idx >= 0) {
      _genericNodes[idx] = node;
    } else {
      _genericNodes.push(node);
    }
    _lastGenericNodesKey = "";
    notify();
    return node;
  },

  async updateGenericNodeContent(id: string, content: string) {
    await updateCanvasGenericNodeContent(id, content);
    const node = _genericNodes.find((n) => n.id === id);
    if (node) {
      (node as CanvasGenericNodeRow & { content: string }).content = content;
    }
    _lastGenericNodesKey = "";
    notify();
  },

  async removeGenericNode(id: string) {
    if (!_activeCanvasId) return;
    await removeCanvasGenericNode(_activeCanvasId, id);
    _genericNodes = _genericNodes.filter((n) => n.id !== id);
    _lastGenericNodesKey = "";
    notify();
  },

  async setGenericNodeFrame(id: string, frameId: string | null) {
    if (!_activeCanvasId) return;
    await setGenericNodeFrame(id, frameId);
    const node = _genericNodes.find((n) => n.id === id);
    if (node) {
      (node as CanvasGenericNodeRow & { frameId: string | null }).frameId = frameId;
    }
    _lastGenericNodesKey = "";
    notify();
  },

  // ── Active-canvas note node operations ─────────────────────────────

  getNoteNodes(): readonly CanvasNoteNodeRow[] {
    return _noteNodes;
  },

  async upsertNoteNode(
    id: string | undefined,
    content: string,
    x: number,
    y: number,
    width = 280,
    height = 200,
  ): Promise<CanvasNoteNodeRow> {
    if (!_activeCanvasId) throw new Error("No active canvas");
    const node = await upsertCanvasNoteNode(_activeCanvasId, id, content, x, y, width, height);
    const idx = _noteNodes.findIndex((n) => n.id === node.id);
    if (idx >= 0) {
      _noteNodes[idx] = node;
    } else {
      _noteNodes.push(node);
    }
    _lastNoteNodesKey = "";
    notify();
    return node;
  },

  async updateNoteNodeContent(id: string, content: string) {
    await updateCanvasNoteNodeContent(id, content);
    const node = _noteNodes.find((n) => n.id === id);
    if (node) {
      (node as CanvasNoteNodeRow & { content: string }).content = content;
    }
    _lastNoteNodesKey = "";
    notify();
  },

  async removeNoteNode(id: string) {
    if (!_activeCanvasId) return;
    await removeCanvasNoteNode(_activeCanvasId, id);
    _noteNodes = _noteNodes.filter((n) => n.id !== id);
    _lastNoteNodesKey = "";
    notify();
  },

  async setNoteNodeFrame(id: string, frameId: string | null) {
    if (!_activeCanvasId) return;
    await setCanvasNoteNodeFrame(id, frameId);
    const node = _noteNodes.find((n) => n.id === id);
    if (node) {
      (node as CanvasNoteNodeRow & { frameId: string | null }).frameId = frameId;
    }
    _lastNoteNodesKey = "";
    notify();
  },

  // ── Subscription ───────────────────────────────────────────────────

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // ── Snapshots (useSyncExternalStore) ───────────────────────────────

  getCanvasesSnapshot(): readonly CanvasRow[] {
    const key = serializeCanvases(_canvases);
    if (key !== _lastCanvasesKey) {
      _lastCanvasesSnapshot = Object.freeze([..._canvases]);
      _lastCanvasesKey = key;
    }
    return _lastCanvasesSnapshot;
  },

  getNodesSnapshot(): readonly CanvasNodeRow[] {
    const key = serializeNodes(_nodes);
    if (key !== _lastNodesKey) {
      _lastNodesSnapshot = Object.freeze([..._nodes]);
      _lastNodesKey = key;
    }
    return _lastNodesSnapshot;
  },

  getTodoNodesSnapshot(): readonly CanvasTodoNodeRow[] {
    const key = serializeTodoNodes(_todoNodes);
    if (key !== _lastTodoNodesKey) {
      _lastTodoNodesSnapshot = Object.freeze([..._todoNodes]);
      _lastTodoNodesKey = key;
    }
    return _lastTodoNodesSnapshot;
  },

  getEdgesSnapshot(): readonly CanvasEdgeRow[] {
    const key = serializeEdges(_edges);
    if (key !== _lastEdgesKey) {
      _lastEdgesSnapshot = Object.freeze([..._edges]);
      _lastEdgesKey = key;
    }
    return _lastEdgesSnapshot;
  },

  getFramesSnapshot(): readonly CanvasFrameRow[] {
    const key = serializeFrames(_frames);
    if (key !== _lastFramesKey) {
      _lastFramesSnapshot = Object.freeze([..._frames]);
      _lastFramesKey = key;
    }
    return _lastFramesSnapshot;
  },

  getGenericNodesSnapshot(): readonly CanvasGenericNodeRow[] {
    const key = serializeGenericNodes(_genericNodes);
    if (key !== _lastGenericNodesKey) {
      _lastGenericNodesSnapshot = Object.freeze([..._genericNodes]);
      _lastGenericNodesKey = key;
    }
    return _lastGenericNodesSnapshot;
  },

  getNoteNodesSnapshot(): readonly CanvasNoteNodeRow[] {
    const key = serializeNoteNodes(_noteNodes);
    if (key !== _lastNoteNodesKey) {
      _lastNoteNodesSnapshot = Object.freeze([..._noteNodes]);
      _lastNoteNodesKey = key;
    }
    return _lastNoteNodesSnapshot;
  },

  getServerSnapshot(): [] {
    return [];
  },
};
