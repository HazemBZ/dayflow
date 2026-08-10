"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type Viewport,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { notesStore, type Note } from "@/lib/notes-store";
import { canvasStore, type CanvasNodeRow, type CanvasTodoNodeRow, type CanvasEdgeRow, type CanvasRow, type CanvasFrameRow, type CanvasGenericNodeRow, type CanvasNoteNodeRow } from "@/lib/canvas-store";
import { NoteNode, type NoteNodeType, type NoteNodeData } from "@/components/canvas/note-node";
import { TodoNode, type TodoNodeType } from "@/components/canvas/todo-node";
import { FrameNode, type FrameNodeType, type FrameNodeData } from "@/components/canvas/frame-node";
import { GenericNode, type GenericNodeType, type GenericNodeData } from "@/components/canvas/generic-node";
import { CanvasNoteNode, type CanvasNoteNodeType, type CanvasNoteNodeData } from "@/components/canvas/canvas-note-node";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  StickyNote,
  ExternalLink,
  ExternalLinkIcon,
  Trash2,
  Maximize2,
  Minimize2,
  FolderOpen,
  FolderOutput,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasSidebar } from "@/components/canvas/canvas-sidebar";
import { TodoCanvasControls } from "@/components/canvas/todo-canvas-controls";
import { useCanvasTodos } from "@/components/canvas/use-canvas-todos";
import type { TodoDto } from "@/lib/todos/contracts";
import { createTodo } from "@/lib/todos/client";
import {
  nudgeItems,
  planClipboardSelection,
  type ClipboardPlan,
} from "@/lib/canvas-clipboard";

const nodeTypes = {
  note: NoteNode,
  todo: TodoNode,
  frame: FrameNode,
  generic: GenericNode,
  canvasNote: CanvasNoteNode,
};

function todoFlowId(todoId: string): string {
  return `todo:${todoId}`;
}

function todoIdFromFlowId(flowId: string): string | null {
  return flowId.startsWith("todo:") ? flowId.slice("todo:".length) : null;
}

// ─── Page ──────────────────────────────────────────────────────────────────

function CanvasPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCanvasId = searchParams.get("c");

  const [notes, setNotes] = useState<Note[]>([]);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNodeRow[]>([]);
  const [canvasTodoNodes, setCanvasTodoNodes] = useState<CanvasTodoNodeRow[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdgeRow[]>([]);
  const [canvasFrames, setCanvasFrames] = useState<CanvasFrameRow[]>([]);
  const [canvasGenericNodes, setCanvasGenericNodes] = useState<CanvasGenericNodeRow[]>([]);
  const [canvasNoteNodes, setCanvasNoteNodes] = useState<CanvasNoteNodeRow[]>([]);
  const [canvases, setCanvases] = useState<CanvasRow[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<(NoteNodeType | TodoNodeType | FrameNodeType | GenericNodeType | CanvasNoteNodeType)>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // UI state restored from canvas
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [minimapCollapsed, setMinimapCollapsed] = useState(false);

  // Top bar rename
  const [isEditingTopBar, setIsEditingTopBar] = useState(false);
  const [topBarEditName, setTopBarEditName] = useState("");
  const [topBarRenameError, setTopBarRenameError] = useState<string | null>(null);
  const topBarInputRef = useRef<HTMLInputElement>(null);
  const topBarRenameSubmittingRef = useRef(false);
  const topBarRenameCancelledRef = useRef(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    nodeType: string;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const frameStartPos = useRef<Map<string, { x: number; y: number }>>(new Map());
  const frameChildrenRef = useRef<
    Map<string, Array<{ nodeId: string; nodeType: "note" | "todo" | "generic" | "canvasNote"; x: number; y: number }>>
  >(new Map());
  const viewportSaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const addCounter = useRef(0);
  const clipboardRef = useRef<ClipboardPlan | null>(null);
  const pendingSelectionRef = useRef<ReadonlySet<string> | null>(null);

  const getViewportCenter = useCallback((): { x: number; y: number } => {
    if (!canvasContainerRef.current) return { x: 0, y: 0 };
    const rect = canvasContainerRef.current.getBoundingClientRect();
    return reactFlowInstance.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, [reactFlowInstance]);

  // Vogel (sunflower) spiral — even density, no overlap, no unbounded drift
  const getCascadePosition = useCallback((center: { x: number; y: number }): { x: number; y: number } => {
    const count = addCounter.current++;
    const goldenAngle = 2.39996; // 137.508° in radians
    const radius = 30 * Math.sqrt(count);
    const angle = count * goldenAngle;
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  }, []);

  const handleAddTodo = useCallback(
    async (todo: TodoDto): Promise<void> => {
      const position = getCascadePosition(getViewportCenter());
      await canvasStore.upsertTodoNode(todo.id, position.x, position.y);
    },
    [getCascadePosition, getViewportCenter],
  );

  const {
    todos,
    projects,
    projectsLoading,
    error: todoError,
    createAndPlaceTodo,
    placeTodo,
  } = useCanvasTodos({ onPlaceTodo: handleAddTodo });

  // ── Load data ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    Promise.all([notesStore.load(), canvasStore.load(urlCanvasId || undefined)])
      .catch((err) => {
        console.error("Canvas load error:", err);
      })
      .finally(() => {
        if (cancelled) return;
        setNotes([...notesStore.getAll()]);
        setCanvasNodes([...canvasStore.getNodes()]);
        setCanvasTodoNodes([...canvasStore.getTodoNodesSnapshot()]);
        setCanvasEdges([...canvasStore.getEdges()]);
        setCanvasFrames([...canvasStore.getFrames()]);
        setCanvasGenericNodes([...canvasStore.getGenericNodes()]);
        setCanvasNoteNodes([...canvasStore.getNoteNodes()]);
        setCanvases([...canvasStore.getCanvases()]);
        setActiveCanvasId(canvasStore.activeCanvasId);
        const active = canvasStore.activeCanvasId;
        const canvas = canvasStore.getCanvases().find((c) => c.id === active);
        if (canvas) {
          if (canvas.minimapCollapsed != null) setMinimapCollapsed(canvas.minimapCollapsed);
          if (canvas.sidebarOpen != null) setSidebarOpen(canvas.sidebarOpen);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
    // Only run on mount; urlCanvasId is the boot param
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to store changes
  useEffect(() => {
    const unsubNotes = notesStore.subscribe(() => {
      setNotes([...notesStore.getAll()]);
    });
    const unsubCanvas = canvasStore.subscribe(() => {
      setCanvasNodes([...canvasStore.getNodes()]);
      setCanvasTodoNodes([...canvasStore.getTodoNodesSnapshot()]);
      setCanvasEdges([...canvasStore.getEdges()]);
      setCanvasFrames([...canvasStore.getFrames()]);
      setCanvasGenericNodes([...canvasStore.getGenericNodes()]);
      setCanvasNoteNodes([...canvasStore.getNoteNodesSnapshot()]);
      setCanvases([...canvasStore.getCanvases()]);
      setActiveCanvasId(canvasStore.activeCanvasId);
    });
    return () => {
      unsubNotes();
      unsubCanvas();
    };
  }, []);

  // ── Canvas switching ──────────────────────────────────────────────────

  const handleSelectCanvas = useCallback(
    (id: string) => {
      if (id === activeCanvasId) return;
      router.push(`/canvas?c=${id}`, { scroll: false });
      setLoading(true);
      canvasStore.setActiveCanvas(id).then(() => {
        setCanvasNodes([...canvasStore.getNodes()]);
        setCanvasTodoNodes([...canvasStore.getTodoNodesSnapshot()]);
        setCanvasEdges([...canvasStore.getEdges()]);
        setCanvasFrames([...canvasStore.getFrames()]);
        setCanvasGenericNodes([...canvasStore.getGenericNodes()]);
        setCanvasNoteNodes([...canvasStore.getNoteNodes()]);
        setActiveCanvasId(id);
        setLoading(false);
      });
    },
    [activeCanvasId, router],
  );

  // ── Sync data → React Flow nodes/edges ───────────────────────────────

  useEffect(() => {
    const nodeMap = new Map(rfNodes.map((n) => [n.id, n]));

    const frameNodes = canvasFrames.map((cf) => {
      const existing = nodeMap.get(cf.id);
      return {
        id: cf.id,
        type: "frame" as const,
        position: existing
          ? existing.position
          : { x: cf.x, y: cf.y },
        data: {
          label: cf.name,
          color: cf.color,
        } satisfies FrameNodeData,
        zIndex: 0,
        style: { width: cf.width, height: cf.height },
        selected: existing?.selected ?? false,
      };
    });

    const flowNodes = canvasNodes.map((cn) => {
      const existing = nodeMap.get(cn.noteId);
      return {
        id: cn.noteId,
        type: "note" as const,
        position: existing
          ? existing.position
          : { x: cn.x, y: cn.y },
        data: {
          label: notes.find((n) => n.id === cn.noteId)?.text ?? "Untitled",
          tags: notes.find((n) => n.id === cn.noteId)?.tags ?? [],
          noteId: cn.noteId,
        } satisfies NoteNodeData,
        selected: existing?.selected ?? false,
        zIndex: cn.frameId ? 10 : 1,
      };
    });

    const todosById = new Map(todos.map((todo) => [todo.id, todo]));
    const todoFlowNodes = canvasTodoNodes.flatMap((canvasTodoNode) => {
      const todo = todosById.get(canvasTodoNode.todoId);
      if (!todo) return [];
      const id = todoFlowId(todo.id);
      const existing = nodeMap.get(id);
      return [{
        id,
        type: "todo",
        position: existing
          ? existing.position
          : { x: canvasTodoNode.x, y: canvasTodoNode.y },
        data: {
          todo,
          onOpen: () => router.push(`/todos/${todo.id}`),
          onRemove: () => {
            void canvasStore.removeTodoNode(todo.id);
          },
        },
        selected: existing?.selected ?? false,
        zIndex: canvasTodoNode.frameId ? 10 : 1,
      } satisfies TodoNodeType];
    });

    const genericFlowNodes = canvasGenericNodes.map((gn) => {
      const existing = nodeMap.get(gn.id);
      return {
        id: gn.id,
        type: "generic" as const,
        position: existing
          ? existing.position
          : { x: gn.x, y: gn.y },
        data: {
          content: gn.content,
          nodeId: gn.id,
        } satisfies GenericNodeData,
        selected: existing?.selected ?? false,
        zIndex: gn.frameId ? 10 : 1,
      };
    });

    const canvasNoteFlowNodes = canvasNoteNodes.map((nn) => {
      const existing = nodeMap.get(nn.id);
      return {
        id: nn.id,
        type: "canvasNote" as const,
        position: existing
          ? existing.position
          : { x: nn.x, y: nn.y },
        data: {
          content: nn.content,
          nodeId: nn.id,
        } satisfies CanvasNoteNodeData,
        style: { width: nn.width, height: nn.height },
        selected: existing?.selected ?? false,
        zIndex: nn.frameId ? 10 : 1,
      };
    });

    const pendingSelection = pendingSelectionRef.current;
    const nextNodes = [...frameNodes, ...flowNodes, ...todoFlowNodes, ...genericFlowNodes, ...canvasNoteFlowNodes].map((node) =>
      pendingSelection
        ? { ...node, selected: pendingSelection.has(node.id) }
        : node,
    );
    setRfNodes(nextNodes);

    const flowEdges = canvasEdges.map((ce) => ({
      id: ce.id,
      source: ce.sourceNoteId,
      target: ce.targetNoteId,
      type: "default",
      animated: true,
      style: { strokeWidth: 1.5 },
    }));
    setRfEdges(flowEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasNodes, canvasTodoNodes, canvasEdges, canvasFrames, canvasGenericNodes, canvasNoteNodes, notes, router, todos]);

  useEffect(() => {
    const pendingSelection = pendingSelectionRef.current;
    if (!pendingSelection || pendingSelection.size === 0) return;
    const selectionApplied =
      rfNodes.length > 0 &&
      [...pendingSelection].every((id) => rfNodes.some((node) => node.id === id)) &&
      rfNodes.every((node) => node.selected === pendingSelection.has(node.id));
    if (selectionApplied) pendingSelectionRef.current = null;
  }, [rfNodes]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const onNodeDragStart = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      if (node.type === "frame") {
        frameStartPos.current.set(node.id, { ...node.position });
        const noteChildren = canvasNodes.filter((n) => n.frameId === node.id);
        const todoChildren = canvasTodoNodes.filter((n) => n.frameId === node.id);
        const genericChildren = canvasGenericNodes.filter((n) => n.frameId === node.id);
        const canvasNoteChildren = canvasNoteNodes.filter((n) => n.frameId === node.id);
        const frameChildren: Array<{
          nodeId: string;
          nodeType: "note" | "todo" | "generic" | "canvasNote";
          x: number;
          y: number;
        }> = [
          ...noteChildren.map((c) => ({ nodeId: c.noteId, nodeType: "note" as const, x: c.x, y: c.y })),
          ...todoChildren.map((c) => ({ nodeId: todoFlowId(c.todoId), nodeType: "todo" as const, x: c.x, y: c.y })),
          ...genericChildren.map((c) => ({ nodeId: c.id, nodeType: "generic" as const, x: c.x, y: c.y })),
          ...canvasNoteChildren.map((c) => ({ nodeId: c.id, nodeType: "canvasNote" as const, x: c.x, y: c.y })),
        ];
        frameChildrenRef.current.set(
          node.id,
          frameChildren,
        );
      }
    },
    [canvasNodes, canvasTodoNodes, canvasGenericNodes, canvasNoteNodes],
  );

  const onNodeDrag = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      if (node.type !== "frame") return;
      const startPos = frameStartPos.current.get(node.id);
      const baseChildren = frameChildrenRef.current.get(node.id);
      if (!startPos || !baseChildren || baseChildren.length === 0) return;

      const dx = node.position.x - startPos.x;
      const dy = node.position.y - startPos.y;
      if (dx === 0 && dy === 0) return;

      setRfNodes((prev) =>
        prev.map((n) => {
          const found = baseChildren.find((c) => c.nodeId === n.id);
          if (!found) return n;
          return { ...n, position: { x: found.x + dx, y: found.y + dy } };
        }),
      );
    },
    [],
  );

  const onNodeDragStop = useCallback(
    async (_event: MouseEvent | TouchEvent, node: Node) => {
      if (node.type === "frame") {
        const cf = canvasFrames.find((f) => f.id === node.id);
        if (!cf) return;

        const startPos = frameStartPos.current.get(node.id);
        frameStartPos.current.delete(node.id);
        if (startPos) {
          const dx = node.position.x - startPos.x;
          const dy = node.position.y - startPos.y;
          if (dx !== 0 || dy !== 0) {
            const baseChildren = frameChildrenRef.current.get(node.id);
            if (baseChildren) {
              await Promise.all(
                baseChildren.map((child) => {
                  switch (child.nodeType) {
                    case "note":
                      return canvasStore.upsertNode(child.nodeId, child.x + dx, child.y + dy);
                    case "todo": {
                      const todoId = todoIdFromFlowId(child.nodeId);
                      if (!todoId) return Promise.resolve();
                      return canvasStore.upsertTodoNode(todoId, child.x + dx, child.y + dy);
                    }
                    case "generic": {
                      const genericNode = canvasGenericNodes.find((generic) => generic.id === child.nodeId);
                      if (!genericNode) return Promise.resolve();
                      return canvasStore.upsertGenericNode(
                        child.nodeId,
                        genericNode.content,
                        child.x + dx,
                        child.y + dy,
                      );
                    }
                    case "canvasNote": {
                      const noteNode = canvasNoteNodes.find((cnote) => cnote.id === child.nodeId);
                      if (!noteNode) return Promise.resolve();
                      return canvasStore.upsertNoteNode(
                        child.nodeId,
                        noteNode.content,
                        child.x + dx,
                        child.y + dy,
                        noteNode.width,
                        noteNode.height,
                      );
                    }
                  }
                }),
              );
            }
          }
        }
        frameChildrenRef.current.delete(node.id);

        await canvasStore.upsertFrame(
          node.id,
          cf.name,
          node.position.x,
          node.position.y,
          cf.width,
          cf.height,
          cf.color,
        );
        return;
      }
      if (node.type === "generic") {
        const gn = canvasGenericNodes.find((g) => g.id === node.id);
        await canvasStore.upsertGenericNode(
          node.id,
          gn?.content ?? "",
          node.position.x,
          node.position.y,
        );
        return;
      }
      if (node.type === "canvasNote") {
        const nn = canvasNoteNodes.find((n) => n.id === node.id);
        await canvasStore.upsertNoteNode(
          node.id,
          nn?.content ?? "",
          node.position.x,
          node.position.y,
          nn?.width,
          nn?.height,
        );
        return;
      }
      if (node.type === "todo") {
        const todoId = todoIdFromFlowId(node.id);
        if (todoId) {
          await canvasStore.upsertTodoNode(todoId, node.position.x, node.position.y);
        }
        return;
      }
      await canvasStore.upsertNode(node.id, node.position.x, node.position.y);
    },
    [canvasFrames, canvasGenericNodes, canvasNoteNodes],
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;
      const sourceIsNote = canvasNodes.some((node) => node.noteId === connection.source);
      const targetIsNote = canvasNodes.some((node) => node.noteId === connection.target);
      if (!sourceIsNote || !targetIsNote) return;
      const exists = canvasEdges.some(
        (e) =>
          e.sourceNoteId === connection.source &&
          e.targetNoteId === connection.target,
      );
      if (exists) return;
      await canvasStore.addEdge(connection.source, connection.target);
    },
    [canvasEdges, canvasNodes],
  );

  // ── Viewport persistence ────────────────────────────────────────────

  const handleMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      if (viewportSaveTimer.current) clearTimeout(viewportSaveTimer.current);
      viewportSaveTimer.current = setTimeout(() => {
        canvasStore.updateViewport(viewport.x, viewport.y, viewport.zoom);
      }, 300);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (viewportSaveTimer.current) clearTimeout(viewportSaveTimer.current);
    };
  }, []);

  // Single click selects node (default React Flow behavior). No navigation.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onNodeClick = useCallback((_event: React.MouseEvent, _node: Node) => {
    // selection handled by React Flow internally
  }, []);

  const onNodesDelete = useCallback((nodes: Node[]) => {
    for (const node of nodes) {
      if (node.type === "frame") {
        canvasStore.removeFrame(node.id);
      } else if (node.type === "generic") {
        canvasStore.removeGenericNode(node.id);
      } else if (node.type === "canvasNote") {
        canvasStore.removeNoteNode(node.id);
      } else if (node.type === "todo") {
        const todoId = todoIdFromFlowId(node.id);
        if (todoId) canvasStore.removeTodoNode(todoId);
      } else {
        canvasStore.removeNode(node.id);
      }
    }
  }, []);

  const handleCreateFrame = useCallback(async () => {
    const pos = getCascadePosition(getViewportCenter());
    await canvasStore.upsertFrame(
      undefined,
      "Frame",
      pos.x - 200,
      pos.y - 150,
      400,
      300,
      "hsl(220, 70%, 60%)",
    );
  }, [getCascadePosition, getViewportCenter]);

  const handleCopy = useCallback(() => {
    const selectedIds = rfNodes
      .filter((node) => node.selected)
      .map((node) => node.id);
    clipboardRef.current = planClipboardSelection({
      selectedIds,
      nodes: canvasNodes,
      todoNodes: canvasTodoNodes,
      genericNodes: canvasGenericNodes,
      noteNodes: canvasNoteNodes,
      frames: canvasFrames,
      edges: canvasEdges,
      todosById: new Map(todos.map((todo) => [todo.id, todo])),
    });
  }, [
    rfNodes,
    canvasNodes,
    canvasTodoNodes,
    canvasGenericNodes,
    canvasNoteNodes,
    canvasFrames,
    canvasEdges,
    todos,
  ]);

  const handlePaste = useCallback(async () => {
    const plan = clipboardRef.current;
    if (!plan) return;
    const items = nudgeItems(plan.items);

    const pastedFlowIds = new Set<string>();
    const frameIdMap = new Map<string, string>();
    const noteIdMap = new Map<string, string>();

    try {
      for (const item of items) {
        if (item.kind !== "frame") continue;
        const frame = await canvasStore.upsertFrame(
          undefined,
          item.name,
          item.x,
          item.y,
          item.width,
          item.height,
          item.color,
        );
        frameIdMap.set(item.id, frame.id);
        pastedFlowIds.add(frame.id);
      }

      for (const item of items) {
        switch (item.kind) {
          case "frame":
            break;
          case "note": {
            const source = notes.find((note) => note.id === item.noteId);
            const note = await notesStore.add(source?.text ?? "", source?.tags);
            if (source?.bookmarked) {
              await notesStore.toggleBookmark(note.id);
            }
            noteIdMap.set(item.noteId, note.id);
            pastedFlowIds.add(note.id);
            await canvasStore.upsertNode(note.id, item.x, item.y);
            const noteFrameId = item.frameId
              ? frameIdMap.get(item.frameId)
              : undefined;
            if (noteFrameId) {
              await canvasStore.setNodeFrame(note.id, noteFrameId);
            }
            break;
          }
          case "todo": {
            const todo = await createTodo({
              text: item.text,
              bookmarked: item.bookmarked,
              severity: item.severity,
              status: item.status,
              projectId: item.projectId,
            });
            await placeTodo(todo, { x: item.x, y: item.y });
            pastedFlowIds.add(todoFlowId(todo.id));
            const todoFrameId = item.frameId
              ? frameIdMap.get(item.frameId)
              : undefined;
            if (todoFrameId) {
              await canvasStore.setTodoNodeFrame(todo.id, todoFrameId);
            }
            break;
          }
          case "generic": {
            const generic = await canvasStore.upsertGenericNode(
              undefined,
              item.content,
              item.x,
              item.y,
            );
            pastedFlowIds.add(generic.id);
            const genericFrameId = item.frameId
              ? frameIdMap.get(item.frameId)
              : undefined;
            if (genericFrameId) {
              await canvasStore.setGenericNodeFrame(generic.id, genericFrameId);
            }
            break;
          }
          case "canvasNote": {
            const noteNode = await canvasStore.upsertNoteNode(
              undefined,
              item.content,
              item.x,
              item.y,
              item.width,
              item.height,
            );
            pastedFlowIds.add(noteNode.id);
            const noteFrameId = item.frameId
              ? frameIdMap.get(item.frameId)
              : undefined;
            if (noteFrameId) {
              await canvasStore.setNoteNodeFrame(noteNode.id, noteFrameId);
            }
            break;
          }
        }
      }

      for (const edge of plan.edges) {
        const source = noteIdMap.get(edge.sourceNoteId);
        const target = noteIdMap.get(edge.targetNoteId);
        if (source && target) {
          await canvasStore.addEdge(source, target);
        }
      }

      pendingSelectionRef.current = pastedFlowIds;
      setRfNodes((prev) =>
        prev.map((node) => ({
          ...node,
          selected: pastedFlowIds.has(node.id),
        })),
      );
    } catch (error) {
      console.error("Canvas paste error:", error);
    }
  }, [notes, placeTodo, setRfNodes]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        const selected = rfNodes.find((n) => n.selected);
        if (selected?.type === "todo") {
          const todoId = todoIdFromFlowId(selected.id);
          if (todoId) router.push(`/todos/${todoId}`);
        } else if (selected && selected.type !== "generic" && selected.type !== "canvasNote" && selected.type !== "frame") {
          router.push(`/notes/${selected.id}`);
        }
      }
    },
    [rfNodes, router],
  );

  useEffect(() => {
    const handleCanvasKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (isTyping || event.altKey) return;

      const key = event.key.toLowerCase();

      if (event.ctrlKey || event.metaKey) {
        if (key === "c") {
          event.preventDefault();
          handleCopy();
        } else if (key === "v") {
          event.preventDefault();
          void handlePaste();
        }
        return;
      }

      if (key === "f") {
        event.preventDefault();
        void handleCreateFrame();
      }
    };

    document.addEventListener("keydown", handleCanvasKeyDown);
    return () => document.removeEventListener("keydown", handleCanvasKeyDown);
  }, [handleCopy, handlePaste, handleCreateFrame]);

  // Right-click context menu
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ nodeId: node.id, nodeType: node.type ?? "note", x: event.clientX, y: event.clientY });
    },
    [],
  );

  function handleContextMenuOpen() {
    if (!contextMenu) return;
    if (contextMenu.nodeType === "todo") {
      const todoId = todoIdFromFlowId(contextMenu.nodeId);
      if (todoId) router.push(`/todos/${todoId}`);
    } else {
      router.push(`/notes/${contextMenu.nodeId}`);
    }
    setContextMenu(null);
  }

  function handleContextMenuRemove() {
    if (!contextMenu) return;
    if (contextMenu.nodeType === "generic") {
      canvasStore.removeGenericNode(contextMenu.nodeId);
    } else if (contextMenu.nodeType === "canvasNote") {
      canvasStore.removeNoteNode(contextMenu.nodeId);
    } else if (contextMenu.nodeType === "todo") {
      const todoId = todoIdFromFlowId(contextMenu.nodeId);
      if (todoId) canvasStore.removeTodoNode(todoId);
    } else {
      canvasStore.removeNode(contextMenu.nodeId);
    }
    setContextMenu(null);
  }

  function handleContextMenuGroupInFrame() {
    if (!contextMenu) return;
    const selectedNodes = rfNodes.filter(
      (n) => n.selected && (n.type === "note" || n.type === "todo" || n.type === "generic" || n.type === "canvasNote"),
    );
    const targetIds =
      selectedNodes.length > 0
        ? selectedNodes.map((n) => n.id)
        : [contextMenu.nodeId];
    // Compute bounding box
    const relevant = rfNodes.filter((n) => targetIds.includes(n.id));
    const padding = 60;
    const headerHeight = 40;
    const xs = relevant.map((n) => n.position.x);
    const ys = relevant.map((n) => n.position.y);
    const widths = relevant.map((n) => (n.measured?.width ?? 200));
    const heights = relevant.map((n) => (n.measured?.height ?? 60));
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs.map((x, i) => x + widths[i]));
    const maxY = Math.max(...ys.map((y, i) => y + heights[i]));
    setContextMenu(null);
    canvasStore.upsertFrame(
      undefined,
      "Frame",
      minX - padding,
      minY - padding - headerHeight,
      maxX - minX + padding * 2,
      maxY - minY + padding * 2 + headerHeight,
      "hsl(220, 70%, 60%)",
    ).then((frame) => {
      for (const noteId of targetIds) {
        const node = canvasNodes.find((n) => n.noteId === noteId);
        if (node) {
          canvasStore.setNodeFrame(noteId, frame.id);
        } else {
          const todoId = todoIdFromFlowId(noteId);
          if (todoId) {
            canvasStore.setTodoNodeFrame(todoId, frame.id);
            continue;
          }
          const gn = canvasGenericNodes.find((g) => g.id === noteId);
          if (gn) {
            canvasStore.setGenericNodeFrame(noteId, frame.id);
            continue;
          }
          const cnn = canvasNoteNodes.find((n) => n.id === noteId);
          if (cnn) {
            canvasStore.setNoteNodeFrame(noteId, frame.id);
          }
        }
      }
    });
  }

  function handleContextMenuRemoveFromFrame() {
    if (!contextMenu) return;
    if (contextMenu.nodeType === "generic") {
      canvasStore.setGenericNodeFrame(contextMenu.nodeId, null);
    } else if (contextMenu.nodeType === "canvasNote") {
      canvasStore.setNoteNodeFrame(contextMenu.nodeId, null);
    } else if (contextMenu.nodeType === "todo") {
      const todoId = todoIdFromFlowId(contextMenu.nodeId);
      if (todoId) canvasStore.setTodoNodeFrame(todoId, null);
    } else {
      canvasStore.setNodeFrame(contextMenu.nodeId, null);
    }
    setContextMenu(null);
  }

  function handleContextMenuDeleteFrame() {
    if (!contextMenu) return;
    canvasStore.removeFrame(contextMenu.nodeId);
    setContextMenu(null);
  }

  // Close context menu on scroll
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  // ── Add note to canvas ────────────────────────────────────────────────

  const unplacedNotes = notes.filter(
    (n) => !n.archived && !canvasNodes.some((cn) => cn.noteId === n.id),
  );

  async function handleAddNote(note: Note) {
    const pos = getCascadePosition(getViewportCenter());
    await canvasStore.upsertNode(
      note.id,
      pos.x,
      pos.y,
    );
  }

  async function handleAddGenericNode() {
    const pos = getCascadePosition(getViewportCenter());
    await canvasStore.upsertGenericNode(
      undefined,
      "",
      pos.x,
      pos.y,
    );
  }

  async function handleAddCanvasNote() {
    const pos = getCascadePosition(getViewportCenter());
    await canvasStore.upsertNoteNode(
      undefined,
      "",
      pos.x,
      pos.y,
    );
  }

  // ── Top bar rename ────────────────────────────────────────────────────

  function startTopBarEditing() {
    if (!activeCanvasId) return;
    const canvas = canvases.find((c) => c.id === activeCanvasId);
    if (!canvas) return;
    setTopBarRenameError(null);
    setIsEditingTopBar(true);
    setTopBarEditName(canvas.name);
    setTimeout(() => topBarInputRef.current?.focus(), 50);
  }

  function cancelTopBarEditing() {
    topBarRenameCancelledRef.current = true;
    setTopBarRenameError(null);
    setIsEditingTopBar(false);
    setTopBarEditName("");
  }

  async function handleTopBarRename() {
    if (!activeCanvasId || topBarRenameSubmittingRef.current) return;
    const trimmed = topBarEditName.trim();
    if (!trimmed) {
      cancelTopBarEditing();
      return;
    }
    topBarRenameSubmittingRef.current = true;
    try {
      await canvasStore.renameCanvas(activeCanvasId, trimmed);
      cancelTopBarEditing();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unable to rename canvas.";
      setTopBarRenameError(errMsg);
      console.error("Canvas rename error:", error);
    } finally {
      topBarRenameSubmittingRef.current = false;
    }
  }

  function handleTopBarBlur() {
    if (topBarRenameCancelledRef.current) {
      topBarRenameCancelledRef.current = false;
      return;
    }
    if (topBarRenameSubmittingRef.current) return;
    handleTopBarRename();
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading canvas...</p>
      </div>
    );
  }

  const activeCanvas = canvases.find((c) => c.id === activeCanvasId);
  const hasSavedViewport =
    activeCanvas?.viewportX != null &&
    activeCanvas?.viewportY != null &&
    activeCanvas?.viewportZoom != null;
  const defaultViewport: Viewport | undefined = hasSavedViewport
    ? { x: activeCanvas.viewportX!, y: activeCanvas.viewportY!, zoom: activeCanvas.viewportZoom! }
    : undefined;

  return (
    <div className="relative flex h-full w-full">
      {/* Canvas area */}
      <div ref={canvasContainerRef} className="relative flex-1">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDrag={onNodeDrag}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onNodesDelete={onNodesDelete}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onKeyDown={onKeyDown}
            onMoveEnd={handleMoveEnd}
            nodeTypes={nodeTypes}
            defaultViewport={defaultViewport}
            fitView={!hasSavedViewport}
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.1}
            maxZoom={4}
            zIndexMode="manual"
            deleteKeyCode={["Backspace", "Delete"]}
            onEdgeDoubleClick={(event, edge) => {
              canvasStore.removeEdge(edge.id);
            }}
            defaultEdgeOptions={{
              type: "default",
              animated: true,
              style: { strokeWidth: 1.5 },
            }}
            proOptions={{ hideAttribution: true }}
          >
          <Controls className="!rounded-lg !border !shadow-sm" />
          <Background
            variant={BackgroundVariant.Lines}
            gap={32}
            size={1}
            className="bg-background"
          />
          <MiniMap
            nodeStrokeWidth={2}
            className={cn(
              "!rounded-lg !border !shadow-sm transition-all duration-200",
              minimapCollapsed && "!hidden"
            )}
            pannable
            zoomable
          />

          <Panel position="bottom-right" className="!m-2">
            <button
              type="button"
              onClick={() => {
                const next = !minimapCollapsed;
                setMinimapCollapsed(next);
                canvasStore.updateUIState({ minimapCollapsed: next });
              }}
              className="flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-sm hover:text-foreground transition-colors"
              title={minimapCollapsed ? "Show minimap" : "Hide minimap"}
            >
              {minimapCollapsed ? (
                <Maximize2 className="size-3.5" />
              ) : (
                <Minimize2 className="size-3.5" />
              )}
            </button>
          </Panel>
        </ReactFlow>

        {/* Top bar */}
        <div className="absolute left-4 top-4 z-10 flex items-center gap-3">
          {isEditingTopBar ? (
            <div className="relative">
              <input
                ref={topBarInputRef}
                value={topBarEditName}
                onChange={(e) => setTopBarEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTopBarRename();
                  if (e.key === "Escape") cancelTopBarEditing();
                }}
                onBlur={handleTopBarBlur}
                className="min-w-[80px] text-sm font-medium bg-transparent border-0 border-b border-muted-foreground/30 px-0 py-0 outline-none text-muted-foreground focus:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Rename canvas"
                autoFocus
              />
              {topBarRenameError && (
                <p role="alert" className="absolute left-0 top-full mt-0.5 whitespace-nowrap text-[10px] text-destructive">
                  {topBarRenameError}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={startTopBarEditing}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-text rounded focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              title="Click to rename"
            >
              {activeCanvas?.name ?? "Canvas"}
            </button>
          )}
          <span className="text-xs text-muted-foreground/50">
            {canvasNodes.length + canvasTodoNodes.length + canvasGenericNodes.length + canvasNoteNodes.length} placed
          </span>
          <span className="text-xs text-muted-foreground/40">|</span>
          <button
            type="button"
            onClick={handleAddGenericNode}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <FileText className="size-3" />
            Add Node
          </button>
          <button
            type="button"
            onClick={handleAddCanvasNote}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <StickyNote className="size-3" />
            Add Note
          </button>
          <button
            type="button"
            onClick={() => void handleCreateFrame()}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <FolderOpen className="size-3" />
            Create Frame
          </button>
        </div>

        <TodoCanvasControls
          todos={todos}
          placedTodoIds={canvasTodoNodes.map((node) => node.todoId)}
          projects={projects}
          projectsLoading={projectsLoading}
          error={todoError}
          onAddTodo={handleAddTodo}
          onCreateTodo={createAndPlaceTodo}
        >
          <Popover>
            <PopoverTrigger
              render={
                <Button size="sm" className="shadow-sm" />
              }
            >
              <Plus className="mr-1 size-3.5" />
              Add Notes
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1.5">
              {unplacedNotes.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  All notes on canvas
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {unplacedNotes.map((note) => {
                    const preview = note.text
                      .replace(/[#*`\[\]]/g, "")
                      .slice(0, 80);
                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => handleAddNote(note)}
                        className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                      >
                        <StickyNote className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {preview || "Untitled"}
                          </p>
                          {note.tags.length > 0 && (
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {note.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-secondary px-1 py-0.5 text-[9px] text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <ExternalLink className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </TodoCanvasControls>

        {/* Context menu */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
            <div
              ref={menuRef}
              onPointerDown={(e) => e.stopPropagation()}
              className="fixed z-50 w-44 rounded-lg border bg-popover p-1 shadow-md"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {contextMenu.nodeType === "frame" ? (
                <>
                  <button
                    type="button"
                    onClick={handleContextMenuDeleteFrame}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="size-3" />
                    Delete frame
                  </button>
                </>
              ) : contextMenu.nodeType === "generic" || contextMenu.nodeType === "canvasNote" ? (
                <>
                  <button
                    type="button"
                    onClick={handleContextMenuGroupInFrame}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-popover-foreground hover:bg-muted transition-colors"
                  >
                    <FolderOpen className="size-3" />
                    Group in frame
                  </button>
                  {(() => {
                    const gn = canvasGenericNodes.find((n) => n.id === contextMenu.nodeId);
                    const cnn = canvasNoteNodes.find((n) => n.id === contextMenu.nodeId);
                    return gn?.frameId || cnn?.frameId ? (
                      <button
                        type="button"
                        onClick={handleContextMenuRemoveFromFrame}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-popover-foreground hover:bg-muted transition-colors"
                      >
                        <FolderOutput className="size-3" />
                        Remove from frame
                      </button>
                    ) : null;
                  })()}
                  <button
                    type="button"
                    onClick={handleContextMenuRemove}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="size-3" />
                    Remove from canvas
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleContextMenuOpen}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-popover-foreground hover:bg-muted transition-colors"
                  >
                    <ExternalLinkIcon className="size-3" />
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={handleContextMenuGroupInFrame}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-popover-foreground hover:bg-muted transition-colors"
                  >
                    <FolderOpen className="size-3" />
                    Group in frame
                  </button>
                  {(() => {
                    const todoId = todoIdFromFlowId(contextMenu.nodeId);
                    const frameId = todoId
                      ? canvasTodoNodes.find((node) => node.todoId === todoId)?.frameId
                      : canvasNodes.find((node) => node.noteId === contextMenu.nodeId)?.frameId;
                    return frameId ? (
                      <button
                        type="button"
                        onClick={handleContextMenuRemoveFromFrame}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-popover-foreground hover:bg-muted transition-colors"
                      >
                        <FolderOutput className="size-3" />
                        Remove from frame
                      </button>
                    ) : null;
                  })()}
                  <button
                    type="button"
                    onClick={handleContextMenuRemove}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="size-3" />
                    Remove from canvas
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right sidebar */}
      <CanvasSidebar
        canvases={canvases}
        activeCanvasId={activeCanvasId}
        onSelectCanvas={handleSelectCanvas}
        open={sidebarOpen}
        onToggle={(v) => {
          setSidebarOpen(v);
          canvasStore.updateUIState({ sidebarOpen: v });
        }}
      />
    </div>
  );
}

// ─── Provider + Suspense wrapper ──────────────────────────────────────────

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={<div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">Loading canvas...</p></div>}>
        <CanvasPageInner />
      </Suspense>
    </ReactFlowProvider>
  );
}
