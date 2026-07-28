import {
  getCanvases,
  createCanvas,
  renameCanvas,
  deleteCanvas,
  getCanvasNodes,
  upsertCanvasNode,
  removeCanvasNode,
  getCanvasEdges,
  addCanvasEdge,
  removeCanvasEdge,
  getCanvasFrames,
  upsertCanvasFrame,
  removeCanvasFrame,
  setNodeFrame,
  getCanvasGenericNodes,
  upsertCanvasGenericNode,
  updateCanvasGenericNodeContent,
  removeCanvasGenericNode,
  setGenericNodeFrame,
  updateCanvasViewport,
  updateCanvasUIState,
  type CanvasRow,
  type CanvasNodeRow,
  type CanvasEdgeRow,
  type CanvasFrameRow,
  type CanvasGenericNodeRow,
} from "@/lib/actions/canvas";

export type { CanvasRow, CanvasNodeRow, CanvasEdgeRow, CanvasFrameRow, CanvasGenericNodeRow };

type Listener = () => void;

let _canvases: CanvasRow[] = [];
let _nodes: CanvasNodeRow[] = [];
let _edges: CanvasEdgeRow[] = [];
let _frames: CanvasFrameRow[] = [];
let _genericNodes: CanvasGenericNodeRow[] = [];
let _activeCanvasId: string | null = null;
const listeners = new Set<Listener>();

let _loaded = false;

// Memoization for snapshots
const _emptyArr: readonly [] = Object.freeze([]);
let _lastCanvasesKey = "";
let _lastCanvasesSnapshot: readonly CanvasRow[] = _emptyArr;
let _lastNodesKey = "";
let _lastNodesSnapshot: readonly CanvasNodeRow[] = _emptyArr;
let _lastEdgesKey = "";
let _lastEdgesSnapshot: readonly CanvasEdgeRow[] = _emptyArr;
let _lastFramesKey = "";
let _lastFramesSnapshot: readonly CanvasFrameRow[] = _emptyArr;
let _lastGenericNodesKey = "";
let _lastGenericNodesSnapshot: readonly CanvasGenericNodeRow[] = _emptyArr;

function serializeCanvases(list: CanvasRow[]): string {
  return JSON.stringify(list.map((c) => [c.id, c.name]));
}
function serializeNodes(nodes: CanvasNodeRow[]): string {
  return JSON.stringify(nodes.map((n) => [n.noteId, n.x, n.y]));
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

    const [nodes, edges, frames, genericNodes] = await Promise.all([
      getCanvasNodes(targetId),
      getCanvasEdges(targetId),
      getCanvasFrames(targetId),
      getCanvasGenericNodes(targetId),
    ]);
    _nodes = nodes;
    _edges = edges;
    _frames = frames;
    _genericNodes = genericNodes;

    _loaded = true;
    _lastCanvasesKey = "";
    _lastNodesKey = "";
    _lastEdgesKey = "";
    _lastFramesKey = "";
    _lastGenericNodesKey = "";
    notify();
  },

  // ── Switch active canvas ───────────────────────────────────────────

  async setActiveCanvas(canvasId: string): Promise<void> {
    if (canvasId === _activeCanvasId) return;
    const [nodes, edges, frames, genericNodes] = await Promise.all([
      getCanvasNodes(canvasId),
      getCanvasEdges(canvasId),
      getCanvasFrames(canvasId),
      getCanvasGenericNodes(canvasId),
    ]);
    _activeCanvasId = canvasId;
    _nodes = nodes;
    _edges = edges;
    _frames = frames;
    _genericNodes = genericNodes;
    _lastNodesKey = "";
    _lastEdgesKey = "";
    _lastFramesKey = "";
    _lastGenericNodesKey = "";
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
    for (const gn of _genericNodes) {
      if (gn.frameId === id) {
        (gn as CanvasGenericNodeRow & { frameId: string | null }).frameId = null;
      }
    }
    _lastNodesKey = "";
    _lastFramesKey = "";
    _lastGenericNodesKey = "";
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

  getServerSnapshot(): [] {
    return [];
  },
};
