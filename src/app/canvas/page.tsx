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
  type Connection,
  type Node,
  type Edge,
  type Viewport,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { notesStore, type Note } from "@/lib/notes-store";
import { canvasStore, type CanvasNodeRow, type CanvasEdgeRow, type CanvasRow, type CanvasFrameRow } from "@/lib/canvas-store";
import { NoteNode, type NoteNodeType, type NoteNodeData } from "@/components/canvas/note-node";
import { FrameNode, type FrameNodeType, type FrameNodeData } from "@/components/canvas/frame-node";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, StickyNote, ExternalLink, ExternalLinkIcon, Trash2, Maximize2, Minimize2, FolderOpen, FolderOutput } from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasSidebar } from "@/components/canvas/canvas-sidebar";

const nodeTypes = { note: NoteNode, frame: FrameNode };

// ─── Page ──────────────────────────────────────────────────────────────────

function CanvasPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCanvasId = searchParams.get("c");

  const [notes, setNotes] = useState<Note[]>([]);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNodeRow[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdgeRow[]>([]);
  const [canvasFrames, setCanvasFrames] = useState<CanvasFrameRow[]>([]);
  const [canvases, setCanvases] = useState<CanvasRow[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<(NoteNodeType | FrameNodeType)>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // UI state restored from canvas
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [minimapCollapsed, setMinimapCollapsed] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    nodeType: string;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const frameStartPos = useRef<Map<string, { x: number; y: number }>>(new Map());
  const frameChildrenRef = useRef<Map<string, Array<{ noteId: string; x: number; y: number }>>>(new Map());
  const viewportSaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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
        setCanvasEdges([...canvasStore.getEdges()]);
        setCanvasFrames([...canvasStore.getFrames()]);
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
      setCanvasEdges([...canvasStore.getEdges()]);
      setCanvasFrames([...canvasStore.getFrames()]);
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
        setCanvasEdges([...canvasStore.getEdges()]);
        setCanvasFrames([...canvasStore.getFrames()]);
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

    setRfNodes([...frameNodes, ...flowNodes]);

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
  }, [canvasNodes, canvasEdges, canvasFrames, notes]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const onNodeDragStart = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      if (node.type === "frame") {
        frameStartPos.current.set(node.id, { ...node.position });
        const children = canvasNodes.filter((n) => n.frameId === node.id);
        frameChildrenRef.current.set(
          node.id,
          children.map((c) => ({ noteId: c.noteId, x: c.x, y: c.y })),
        );
      }
    },
    [canvasNodes],
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
          const found = baseChildren.find((c) => c.noteId === n.id);
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
                baseChildren.map((child) =>
                  canvasStore.upsertNode(child.noteId, child.x + dx, child.y + dy),
                ),
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
      await canvasStore.upsertNode(node.id, node.position.x, node.position.y);
    },
    [canvasFrames],
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;
      const exists = canvasEdges.some(
        (e) =>
          e.sourceNoteId === connection.source &&
          e.targetNoteId === connection.target,
      );
      if (exists) return;
      await canvasStore.addEdge(connection.source, connection.target);
    },
    [canvasEdges],
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
      } else {
        canvasStore.removeNode(node.id);
      }
    }
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        const selected = rfNodes.find((n) => n.selected);
        if (selected) {
          router.push(`/notes/${selected.id}`);
        }
      }
    },
    [rfNodes, router],
  );

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
    router.push(`/notes/${contextMenu.nodeId}`);
    setContextMenu(null);
  }

  function handleContextMenuRemove() {
    if (!contextMenu) return;
    canvasStore.removeNode(contextMenu.nodeId);
    setContextMenu(null);
  }

  function handleContextMenuGroupInFrame() {
    if (!contextMenu) return;
    // Find all selected note nodes
    const selectedNotes = rfNodes.filter(
      (n) => n.selected && n.type === "note",
    );
    const targetIds =
      selectedNotes.length > 0
        ? selectedNotes.map((n) => n.id)
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
          // Save relative position
          canvasStore.setNodeFrame(noteId, frame.id);
        }
      }
    });
  }

  function handleContextMenuRemoveFromFrame() {
    if (!contextMenu) return;
    canvasStore.setNodeFrame(contextMenu.nodeId, null);
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
    // cascade position
    const offset = canvasNodes.length * 30;
    await canvasStore.upsertNode(
      note.id,
      100 + offset,
      100 + offset,
    );
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
      <div className="relative flex-1">
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
            deleteKeyCode="Backspace"
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
          <h1 className="text-sm font-medium text-muted-foreground">
            {activeCanvas?.name ?? "Canvas"}
          </h1>
          <span className="text-xs text-muted-foreground/50">
            {canvasNodes.length} placed
          </span>
          <span className="text-xs text-muted-foreground/40">|</span>
          <button
            type="button"
            onClick={async () => {
              await canvasStore.upsertFrame(
                undefined,
                "Frame",
                200,
                100,
                400,
                300,
                "hsl(220, 70%, 60%)",
              );
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <FolderOpen className="size-3" />
            Create Frame
          </button>
        </div>

        {/* Add notes floating button */}
        <div className="absolute right-4 top-4 z-10">
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
        </div>

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
                    const cn = canvasNodes.find((n) => n.noteId === contextMenu.nodeId);
                    return cn?.frameId ? (
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
